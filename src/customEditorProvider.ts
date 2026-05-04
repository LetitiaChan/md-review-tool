import * as vscode from 'vscode';
import * as path from 'path';
import { FileService } from './fileService';
import { StateService } from './stateService';
import { getWebviewHtml, createMessageHandler, MessageHandlerContext } from './webviewHelper';

/**
 * CustomTextEditorProvider — 注册为 VS Code Custom Editor，
 * 出现在 "Open With..." 菜单中，支持原生 dirty 状态和保存流程。
 */
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'mdReview.markdownEditor';

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MarkdownEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            MarkdownEditorProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        );
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const extensionUri = this._context.extensionUri;

        // 配置 webview 选项
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'webview'),
                vscode.Uri.joinPath(extensionUri, 'assets'),
                ...(vscode.workspace.workspaceFolders?.map(f => f.uri) || [])
            ]
        };

        // 使用共享 helper 生成 HTML
        webviewPanel.webview.html = getWebviewHtml(webviewPanel.webview, extensionUri);

        const fileService = new FileService();
        const stateService = new StateService(this._context);
        const disposables: vscode.Disposable[] = [];

        // 创建共享消息处理上下文
        const handlerCtx: MessageHandlerContext = {
            postMessage: (msg) => webviewPanel.webview.postMessage(msg),
            extensionContext: this._context,
            extensionUri: extensionUri,
            fileService: fileService,
            stateService: stateService,
            getCurrentFilePath: () => document.uri.fsPath,
            setCurrentFilePath: () => {
                // Custom Editor 模式下文件路径由 VS Code 管理，不需要手动设置
            },
            saveFileImpl: async (filePath, content, requestId) => {
                // Custom Editor 模式：通过 WorkspaceEdit 修改 TextDocument
                try {
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        0, 0,
                        document.lineCount, 0
                    );
                    edit.replace(document.uri, fullRange, content);
                    const success = await vscode.workspace.applyEdit(edit);
                    handlerCtx.postMessage({
                        type: 'fileSaved',
                        payload: { success, filePath: document.uri.fsPath },
                        requestId
                    });
                } catch (e: any) {
                    handlerCtx.postMessage({
                        type: 'fileSaved',
                        payload: { success: false, error: e.message },
                        requestId
                    });
                }
            },
            onReady: () => {
                // Webview 就绪后，发送文件内容
                const content = document.getText();
                const filePath = document.uri.fsPath;
                const data = fileService.readFile(filePath);
                handlerCtx.postMessage({
                    type: 'fileContent',
                    payload: data
                });
                // 发送 IDE 类型信息
                vscode.commands.getCommands(true).then((allCmds) => {
                    const { detectIdeKind } = require('./aiChatAdapters');
                    const ideType = detectIdeKind(vscode.env.appName || '', new Set(allCmds));
                    handlerCtx.postMessage({ type: 'ideType', payload: { ideType } });
                });
            },
            webview: webviewPanel.webview,
        };

        const messageHandler = createMessageHandler(handlerCtx);

        // 监听 webview 消息
        disposables.push(
            webviewPanel.webview.onDidReceiveMessage(async (message) => {
                await messageHandler(message);
            })
        );

        // 监听文档外部变更（其他编辑器或进程修改了文件）
        disposables.push(
            vscode.workspace.onDidChangeTextDocument(e => {
                if (e.document.uri.toString() === document.uri.toString() && e.contentChanges.length > 0) {
                    // 只在非本 webview 触发的变更时通知（避免循环）
                    // 通过检查 reason 来判断是否是外部变更
                    if (e.reason === vscode.TextDocumentChangeReason.Undo ||
                        e.reason === vscode.TextDocumentChangeReason.Redo) {
                        // Undo/Redo 操作，通知 webview 重新加载
                        handlerCtx.postMessage({
                            type: 'fileChanged',
                            payload: { filePath: document.uri.fsPath }
                        });
                    }
                }
            })
        );

        // 监听文件在磁盘上的变更（外部进程修改）
        const fileWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(
                path.dirname(document.uri.fsPath),
                path.basename(document.uri.fsPath)
            )
        );
        fileWatcher.onDidChange(() => {
            handlerCtx.postMessage({
                type: 'fileChanged',
                payload: { filePath: document.uri.fsPath }
            });
        });
        disposables.push(fileWatcher);

        // 面板关闭时清理
        webviewPanel.onDidDispose(() => {
            disposables.forEach(d => d.dispose());
        });
    }
}
