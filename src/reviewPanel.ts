import * as vscode from 'vscode';
import * as path from 'path';
import { FileService } from './fileService';
import { StateService } from './stateService';
import { getWebviewHtml, createMessageHandler, MessageHandlerContext } from './webviewHelper';

export class ReviewPanel {
    public static panels: Map<string, ReviewPanel> = new Map();
    public static currentPanel: ReviewPanel | undefined;
    private static readonly viewType = 'mdReview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _extensionContext: vscode.ExtensionContext;
    private readonly _fileService: FileService;
    private readonly _stateService: StateService;
    private _disposables: vscode.Disposable[] = [];
    private _currentFilePath: string | undefined;
    private _watcher: vscode.FileSystemWatcher | undefined;
    private _webviewReady = false;
    private _zenClosedBars: { sidebar: boolean; auxiliary: boolean; panel: boolean } = {
        sidebar: false,
        auxiliary: false,
        panel: false,
    };
    private _messageHandler: (message: any) => Promise<void>;

    public static createOrShow(context: vscode.ExtensionContext, filePath?: string) {
        const column = vscode.ViewColumn.Active;

        if (filePath) {
            const normalizedPath = path.resolve(filePath);
            const existing = ReviewPanel.panels.get(normalizedPath);
            if (existing) {
                existing._panel.reveal(column);
                ReviewPanel.currentPanel = existing;
                return;
            }
        }

        if (!filePath && ReviewPanel.currentPanel) {
            ReviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panelTitle = filePath ? path.basename(filePath) : 'MD Human Review';

        const panel = vscode.window.createWebviewPanel(
            ReviewPanel.viewType,
            panelTitle,
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'webview'),
                    vscode.Uri.joinPath(context.extensionUri, 'assets'),
                    ...(vscode.workspace.workspaceFolders?.map(f => f.uri) || [])
                ]
            }
        );

        const reviewPanel = new ReviewPanel(panel, context, filePath);
        ReviewPanel.currentPanel = reviewPanel;

        if (filePath) {
            const normalizedPath = path.resolve(filePath);
            ReviewPanel.panels.set(normalizedPath, reviewPanel);
        }

        ReviewPanel._refreshAllTitles();
    }

    private static _refreshAllTitles() {
        const nameCount = new Map<string, string[]>();
        for (const [filePath] of ReviewPanel.panels) {
            const base = path.basename(filePath);
            const arr = nameCount.get(base) || [];
            arr.push(filePath);
            nameCount.set(base, arr);
        }

        for (const [base, paths] of nameCount) {
            if (paths.length > 1) {
                for (const fp of paths) {
                    const panel = ReviewPanel.panels.get(fp);
                    if (panel) {
                        const parentDir = path.basename(path.dirname(fp));
                        panel._panel.title = `${base} — ${parentDir}`;
                    }
                }
            } else {
                const panel = ReviewPanel.panels.get(paths[0]);
                if (panel) {
                    panel._panel.title = base;
                }
            }
        }
    }

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, filePath?: string) {
        this._panel = panel;
        this._extensionUri = context.extensionUri;
        this._extensionContext = context;
        this._fileService = new FileService();
        this._stateService = new StateService(context);

        // 使用共享 helper 生成 webview HTML
        this._panel.webview.html = getWebviewHtml(this._panel.webview, this._extensionUri);

        // 创建共享消息处理器
        const handlerCtx: MessageHandlerContext = {
            postMessage: (msg) => this._panel.webview.postMessage(msg),
            extensionContext: this._extensionContext,
            extensionUri: this._extensionUri,
            fileService: this._fileService,
            stateService: this._stateService,
            getCurrentFilePath: () => this._currentFilePath,
            setCurrentFilePath: (fp) => {
                // 从旧路径的 Map 中移除
                if (this._currentFilePath) {
                    const oldNormalized = path.resolve(this._currentFilePath);
                    ReviewPanel.panels.delete(oldNormalized);
                }
                this._currentFilePath = fp;
                const normalizedPath = path.resolve(fp);
                ReviewPanel.panels.set(normalizedPath, this);
                ReviewPanel._refreshAllTitles();
            },
            saveFileImpl: async (filePath, content, requestId) => {
                try {
                    const result = this._fileService.saveFile(filePath, content);
                    this.postMessage({ type: 'fileSaved', payload: { ...result, filePath }, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'fileSaved', payload: { success: false, error: e.message }, requestId });
                }
            },
            onReady: () => {
                this._webviewReady = true;
                if (this._currentFilePath) {
                    this.loadFile(this._currentFilePath);
                }
                // 发送 IDE 类型信息给 webview
                vscode.commands.getCommands(true).then(async (allCmds) => {
                    const { detectIdeKind } = require('./aiChatAdapters');
                    const ideType = detectIdeKind(vscode.env.appName || '', new Set(allCmds));
                    this.postMessage({ type: 'ideType', payload: { ideType } });
                });
            },
            webview: this._panel.webview,
        };

        this._messageHandler = createMessageHandler(handlerCtx);

        // Panel 模式特有的消息（禅模式）在此处理，其余委托给共享处理器
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                if (message.type === 'zenModeChanged') {
                    this._handleZenMode(message.payload);
                } else {
                    await this._messageHandler(message);
                }
            },
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                ReviewPanel.currentPanel = this;
            }
        }, null, this._disposables);

        this._setupFileWatcher();

        if (filePath) {
            this._currentFilePath = filePath;
        }

        // ready 超时检测
        setTimeout(() => {
            if (!this._webviewReady) {
                const ch = vscode.window.createOutputChannel('MD Review - Webview');
                ch.appendLine('[Warning] Webview 未在 8 秒内就绪，可能存在 JS 加载错误。');
                ch.appendLine('请打开 DevTools (Ctrl+Shift+I 或 Help > Toggle Developer Tools) 检查 Console 输出。');
                ch.show(true);
            }
        }, 8000);
    }

    private _handleZenMode(payload: any) {
        const entering = payload.entering;
        if (entering) {
            vscode.commands.executeCommand('workbench.action.closeSidebar');
            vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
            vscode.commands.executeCommand('workbench.action.closePanel');
            this._zenClosedBars = { sidebar: true, auxiliary: true, panel: true };
        } else {
            if (this._zenClosedBars.sidebar) {
                vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
            }
            if (this._zenClosedBars.auxiliary) {
                vscode.commands.executeCommand('workbench.action.toggleAuxiliaryBar');
            }
            if (this._zenClosedBars.panel) {
                vscode.commands.executeCommand('workbench.action.togglePanel');
            }
            this._zenClosedBars = { sidebar: false, auxiliary: false, panel: false };
        }
    }

    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public loadFile(filePath: string) {
        if (this._currentFilePath) {
            const oldNormalized = path.resolve(this._currentFilePath);
            ReviewPanel.panels.delete(oldNormalized);
        }

        this._currentFilePath = filePath;

        const normalizedPath = path.resolve(filePath);
        ReviewPanel.panels.set(normalizedPath, this);

        ReviewPanel._refreshAllTitles();

        try {
            const data = this._fileService.readFile(filePath);
            this.postMessage({
                type: 'fileContent',
                payload: data
            });
        } catch (e: any) {
            this.postMessage({
                type: 'error',
                payload: { message: e.message }
            });
        }
    }

    private _setupFileWatcher() {
        this._watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,mdc}');
        this._watcher.onDidChange(uri => {
            if (this._currentFilePath && uri.fsPath === path.resolve(this._currentFilePath)) {
                this.postMessage({
                    type: 'fileChanged',
                    payload: { filePath: uri.fsPath }
                });
            }
        });
        this._disposables.push(this._watcher);
    }

    public dispose() {
        if (this._currentFilePath) {
            const normalizedPath = path.resolve(this._currentFilePath);
            ReviewPanel.panels.delete(normalizedPath);
        }
        if (ReviewPanel.currentPanel === this) {
            const remaining = ReviewPanel.panels.values().next().value;
            ReviewPanel.currentPanel = remaining || undefined;
        }
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) { d.dispose(); }
        }
        ReviewPanel._refreshAllTitles();
    }
}
