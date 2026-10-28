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

    /** 追踪所有活跃的 Custom Editor webview panels，供 exportReview 等命令使用 */
    private static _activeWebviewPanels: Set<vscode.WebviewPanel> = new Set();

    /** 获取当前活跃的 webview panel（最近一个被聚焦的） */
    public static getActiveWebviewPanel(): vscode.WebviewPanel | undefined {
        // 返回集合中最后一个（最近添加的）
        let last: vscode.WebviewPanel | undefined;
        for (const panel of MarkdownEditorProvider._activeWebviewPanels) {
            last = panel;
        }
        return last;
    }

    constructor(private readonly _context: vscode.ExtensionContext) {}

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MarkdownEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            MarkdownEditorProvider.viewType,
            provider,
            {
                webviewOptions: {
                    // 保留隐藏标签页的 Webview 上下文。
                    //
                    // 评估结论（2026-10）：暂时保持 true。关闭后 Webview 会被销毁，
                    // 而当前只持久化了文档与批注（vscode.setState + workspaceState），
                    // 没有持久化滚动位置、预览/富文本模式与光标；并且富文本输入依赖
                    // 250ms 序列化 + 1.5s 自动保存，销毁时不会执行 exitRich，
                    // 最后一段输入可能永久丢失。
                    //
                    // 内存实测（单 Webview，JS 堆增量）：100 块 +0.8MB、
                    // 1000 块 +1.3MB、4000 块 +2.7MB（不含 DOM/SVG）。
                    //
                    // 若要改为 false，需先补齐上述状态的持久化，并在
                    // onDidChangeViewState(visible=false) 时 flush 编辑内容。
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

        // 标志位：抑制 webview 自身保存触发的 fileChanged 通知
        let _suppressFileChanged = false;
        let _suppressTimer: ReturnType<typeof setTimeout> | undefined;

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
                    // 抑制自身保存触发的 fileChanged 通知（防止"文件已更新"徽章闪烁）
                    _suppressFileChanged = true;
                    if (_suppressTimer) { clearTimeout(_suppressTimer); }
                    _suppressTimer = setTimeout(() => { _suppressFileChanged = false; }, 1500);

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
            getDocumentIsDirty: () => document.isDirty,
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
            // 如果是 webview 自身保存触发的磁盘变更，不通知（防止闪烁）
            if (_suppressFileChanged) { return; }
            handlerCtx.postMessage({
                type: 'fileChanged',
                payload: { filePath: document.uri.fsPath }
            });
        });
        disposables.push(fileWatcher);

        // 面板关闭时清理
        webviewPanel.onDidDispose(() => {
            MarkdownEditorProvider._activeWebviewPanels.delete(webviewPanel);
            disposables.forEach(d => d.dispose());
        });

        // 追踪活跃 webview panel
        MarkdownEditorProvider._activeWebviewPanels.add(webviewPanel);

        // 监听面板激活状态，确保 getActiveWebviewPanel 返回最近聚焦的
        disposables.push(
            webviewPanel.onDidChangeViewState(e => {
                if (e.webviewPanel.active) {
                    // 移除再添加，确保在 Set 末尾
                    MarkdownEditorProvider._activeWebviewPanels.delete(webviewPanel);
                    MarkdownEditorProvider._activeWebviewPanels.add(webviewPanel);
                }
            })
        );
    }
}
