import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileService } from './fileService';
import { StateService } from './stateService';
import { detectIdeKind, dispatchAiChat, IdeKind } from './aiChatAdapters';

const _hostMessages: Record<string, Record<string, string>> = {
    'zh-CN': {
        'ai.chat_success_codebuddy': '✅ AI 新对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。',
        'ai.chat_success_vscode': '✅ AI 对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。',
        'ai.chat_success_cursor': '✅ 已在 Cursor 打开 AI Chat 并自动粘贴指令。若未自动发送请按 Enter。',
        'ai.chat_success_windsurf': '✅ 已在 Windsurf 打开 Cascade 并自动粘贴指令。若未自动发送请按 Enter。',
        'ai.chat_fallback': '✅ 已复制 AI 指令到剪贴板，请手动打开AI对话窗口并粘贴执行。',
        'ai.chat_error': '❌ 操作失败: ',
    },
    'en': {
        'ai.chat_success_codebuddy': '✅ New AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.',
        'ai.chat_success_vscode': '✅ AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.',
        'ai.chat_success_cursor': '✅ AI Chat opened in Cursor and instructions pasted automatically. Press Enter if not sent.',
        'ai.chat_success_windsurf': '✅ Cascade opened in Windsurf and instructions pasted automatically. Press Enter if not sent.',
        'ai.chat_fallback': '✅ AI instructions copied to clipboard. Please open AI chat manually and paste.',
        'ai.chat_error': '❌ Operation failed: ',
    }
};

function _hostT(key: string): string {
    const lang = vscode.workspace.getConfiguration('mdReview').get<string>('language', 'zh-CN');
    const dict = _hostMessages[lang] || _hostMessages['zh-CN'];
    return dict[key] || _hostMessages['zh-CN'][key] || key;
}

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

    public static createOrShow(context: vscode.ExtensionContext, filePath?: string) {
        const column = vscode.ViewColumn.Active;

        // 如果指定了文件路径，检查是否已有对应面板（同一文件复用同一面板）
        if (filePath) {
            const normalizedPath = path.resolve(filePath);
            const existing = ReviewPanel.panels.get(normalizedPath);
            if (existing) {
                existing._panel.reveal(column);
                ReviewPanel.currentPanel = existing;
                return;
            }
        }

        // 如果没有指定文件路径，且有当前面板，复用它
        if (!filePath && ReviewPanel.currentPanel) {
            ReviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        // 为新文件（或无文件）创建新面板 —— 不同文件各自拥有独立面板
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

        // 注册到面板 Map
        if (filePath) {
            const normalizedPath = path.resolve(filePath);
            ReviewPanel.panels.set(normalizedPath, reviewPanel);
        }

        // 刷新所有面板标题（处理同名文件区分）
        ReviewPanel._refreshAllTitles();
    }

    /**
     * 生成智能标题：同名文件加父目录区分
     * 例如：两个 README.md → "README.md — docs" 和 "README.md — src"
     */
    private static _refreshAllTitles() {
        // 统计每个 basename 出现的次数
        const nameCount = new Map<string, string[]>();
        for (const [filePath] of ReviewPanel.panels) {
            const base = path.basename(filePath);
            const arr = nameCount.get(base) || [];
            arr.push(filePath);
            nameCount.set(base, arr);
        }

        // 更新有重名的面板标题
        for (const [base, paths] of nameCount) {
            if (paths.length > 1) {
                // 有同名文件，加父目录
                for (const fp of paths) {
                    const panel = ReviewPanel.panels.get(fp);
                    if (panel) {
                        const parentDir = path.basename(path.dirname(fp));
                        panel._panel.title = `${base} — ${parentDir}`;
                    }
                }
            } else {
                // 唯一的，用纯文件名
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

        this._panel.webview.html = this._getWebviewContent();

        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 追踪活跃面板：当面板获得焦点时更新 currentPanel
        this._panel.onDidChangeViewState(e => {
            if (e.webviewPanel.active) {
                ReviewPanel.currentPanel = this;
            }
        }, null, this._disposables);

        // 设置文件监听
        this._setupFileWatcher();

        // 如果有初始文件，延迟加载（等 webview 初始化完成）
        if (filePath) {
            this._currentFilePath = filePath;
        }

        // 方案 C：ready 超时检测 — 如果 webview 在 8 秒内未发送 ready 消息，提示可能存在 JS 加载错误
        setTimeout(() => {
            if (!this._webviewReady) {
                const ch = vscode.window.createOutputChannel('MD Review - Webview');
                ch.appendLine('[Warning] Webview 未在 8 秒内就绪，可能存在 JS 加载错误。');
                ch.appendLine('请打开 DevTools (Ctrl+Shift+I 或 Help > Toggle Developer Tools) 检查 Console 输出。');
                ch.show(true);
            }
        }, 8000);
    }

    public postMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public loadFile(filePath: string) {
        // 从旧路径的 Map 中移除
        if (this._currentFilePath) {
            const oldNormalized = path.resolve(this._currentFilePath);
            ReviewPanel.panels.delete(oldNormalized);
        }

        this._currentFilePath = filePath;

        // 注册到 Map
        const normalizedPath = path.resolve(filePath);
        ReviewPanel.panels.set(normalizedPath, this);

        // 刷新所有面板标题（处理同名文件区分）
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

    private async _handleMessage(message: any) {
        const { type, payload, requestId } = message;

        switch (type) {
            case 'webviewError': {
                // 方案 B 上报：webview 全局错误监听器捕获的错误
                const errCh = vscode.window.createOutputChannel('MD Review - Webview');
                errCh.appendLine(`[Webview Error] ${payload.message}`);
                if (payload.filename) { errCh.appendLine(`  File: ${payload.filename}:${payload.lineno}:${payload.colno}`); }
                if (payload.stack) { errCh.appendLine(`  Stack: ${payload.stack}`); }
                errCh.show(true);
                break;
            }
            case 'ready': {
                this._webviewReady = true;
                // Webview 初始化完成，发送初始文件
                if (this._currentFilePath) {
                    this.loadFile(this._currentFilePath);
                }
                // 发送 IDE 类型信息给 webview（支持 codebuddy/cursor/windsurf/vscode 四种值）
                const allCmds = await vscode.commands.getCommands(true);
                const ideType: IdeKind = detectIdeKind(vscode.env.appName || '', new Set(allCmds));
                this.postMessage({ type: 'ideType', payload: { ideType } });
                break;
            }
            case 'getFiles': {
                const files = await this._fileService.listMdFiles();
                this.postMessage({ type: 'fileList', payload: { files }, requestId });
                break;
            }
            case 'readFile': {
                try {
                    const data = this._fileService.readFile(payload.filePath);
                    // 更新 panels Map（与 loadFile 保持一致）
                    if (this._currentFilePath) {
                        const oldNormalized = path.resolve(this._currentFilePath);
                        ReviewPanel.panels.delete(oldNormalized);
                    }
                    this._currentFilePath = payload.filePath;
                    const normalizedPath = path.resolve(payload.filePath);
                    ReviewPanel.panels.set(normalizedPath, this);
                    ReviewPanel._refreshAllTitles();
                    this.postMessage({ type: 'fileContent', payload: data, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'fileContent', payload: { error: e.message }, requestId });
                }
                break;
            }
            case 'saveFile': {
                try {
                    const result = this._fileService.saveFile(payload.filePath, payload.content);
                    this.postMessage({ type: 'fileSaved', payload: { ...result, filePath: payload.filePath }, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'fileSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'saveReview': {
                try {
                    const result = this._fileService.saveReview(payload.fileName, payload.content);
                    this.postMessage({ type: 'reviewSaved', payload: result, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'reviewSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'applyReview': {
                try {
                    const result = this._fileService.applyReview(payload.annotations, payload.sourceFile, payload.fileName, payload.relPath);
                    this.postMessage({ type: 'applyResult', payload: result, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'applyResult', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'getState': {
                const value = this._stateService.get(payload.key);
                this.postMessage({ type: 'stateValue', payload: { key: payload.key, value }, requestId });
                break;
            }
            case 'setState': {
                await this._stateService.set(payload.key, payload.value);
                break;
            }
            case 'resolveImageUris': {
                const uriMap = this._fileService.resolveImageUris(
                    payload.imagePaths,
                    payload.basePath,
                    this._panel.webview
                );
                this.postMessage({ type: 'imageUris', payload: uriMap, requestId });
                break;
            }
            case 'saveAnnotationImage': {
                try {
                    const result = this._fileService.saveAnnotationImage(payload.base64Data, payload.fileName, payload.sourceDir);
                    this.postMessage({ type: 'annotationImageSaved', payload: result, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'annotationImageSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'resolveAnnotationImageUris': {
                const annUriMap = this._fileService.resolveAnnotationImageUris(
                    payload.imagePaths,
                    this._panel.webview
                );
                this.postMessage({ type: 'annotationImageUris', payload: annUriMap, requestId });
                break;
            }
            case 'deleteAnnotationImage': {
                const deleted = this._fileService.deleteAnnotationImage(payload.imagePath);
                this.postMessage({ type: 'annotationImageDeleted', payload: { success: deleted }, requestId });
                break;
            }
            case 'getReviewRecords': {
                const records = this._fileService.getReviewRecords(payload.fileName, payload.relPath);
                this.postMessage({ type: 'reviewRecords', payload: { records }, requestId });
                break;
            }
            case 'deleteReviewRecords': {
                const delResult = this._fileService.deleteReviewRecords(payload.fileName, payload.relPath);
                this.postMessage({ type: 'deleteReviewRecordsResult', payload: delResult, requestId });
                break;
            }
            case 'showInfo': {
                vscode.window.showInformationMessage(payload.message);
                break;
            }
            case 'zenModeChanged': {
                const entering = payload.entering;
                if (entering) {
                    // 进入禅模式：隐藏 IDE 辅助区域，腾出更多空间给编辑器
                    // 注意：不使用 maximizeEditor，避免多窗口时编辑器组合并导致文件混淆
                    vscode.commands.executeCommand('workbench.action.closeSidebar');
                    vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
                    vscode.commands.executeCommand('workbench.action.closePanel');
                } else {
                    // 退出禅模式：恢复 IDE 侧边栏
                    vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
                }
                break;
            }
            case 'getSettings': {
                const config = vscode.workspace.getConfiguration('mdReview');
                const settings = {
                    fontSize: config.get<number>('fontSize', 18),
                    lineHeight: config.get<number>('lineHeight', 1.8),
                    contentMaxWidth: config.get<number>('contentMaxWidth', 1200),
                    fontFamily: config.get<string>('fontFamily', ''),
                    codeFontFamily: config.get<string>('codeFontFamily', ''),
                    theme: config.get<string>('theme', 'light'),
                    showToc: config.get<boolean>('showToc', true),
                    showAnnotations: config.get<boolean>('showAnnotations', true),
                    sidebarLayout: config.get<string>('sidebarLayout', 'toc-left'),
                    panelMode: config.get<string>('panelMode', 'floating'),
                    documentAlign: config.get<string>('documentAlign', 'center'),
                    enableMermaid: config.get<boolean>('enableMermaid', true),
                    enableMath: config.get<boolean>('enableMath', true),
                    enablePlantUML: config.get<boolean>('enablePlantUML', true),
                    enableGraphviz: config.get<boolean>('enableGraphviz', true),
                    showLineNumbers: config.get<boolean>('showLineNumbers', false),
                    autoSave: config.get<boolean>('autoSave', true),
                    autoSaveDelay: config.get<number>('autoSaveDelay', 1500),
                    codeTheme: config.get<string>('codeTheme', 'default-dark-modern'),
                    language: config.get<string>('language', 'zh-CN')
                };
                this.postMessage({ type: 'settingsData', payload: settings, requestId });
                break;
            }
            case 'saveSettings': {
                try {
                    const config = vscode.workspace.getConfiguration('mdReview');
                    const target = vscode.ConfigurationTarget.Global;
                    if (payload.fontSize !== undefined) { await config.update('fontSize', payload.fontSize, target); }
                    if (payload.lineHeight !== undefined) { await config.update('lineHeight', payload.lineHeight, target); }
                    if (payload.contentMaxWidth !== undefined) { await config.update('contentMaxWidth', payload.contentMaxWidth, target); }
                    if (payload.fontFamily !== undefined) { await config.update('fontFamily', payload.fontFamily, target); }
                    if (payload.codeFontFamily !== undefined) { await config.update('codeFontFamily', payload.codeFontFamily, target); }
                    if (payload.theme !== undefined) { await config.update('theme', payload.theme, target); }
                    if (payload.showToc !== undefined) { await config.update('showToc', payload.showToc, target); }
                    if (payload.showAnnotations !== undefined) { await config.update('showAnnotations', payload.showAnnotations, target); }
                    if (payload.sidebarLayout !== undefined) { await config.update('sidebarLayout', payload.sidebarLayout, target); }
                    if (payload.panelMode !== undefined) { await config.update('panelMode', payload.panelMode, target); }
                    if (payload.documentAlign !== undefined) { await config.update('documentAlign', payload.documentAlign, target); }
                    if (payload.enableMermaid !== undefined) { await config.update('enableMermaid', payload.enableMermaid, target); }
                    if (payload.enableMath !== undefined) { await config.update('enableMath', payload.enableMath, target); }
                    if (payload.enablePlantUML !== undefined) { await config.update('enablePlantUML', payload.enablePlantUML, target); }
                    if (payload.enableGraphviz !== undefined) { await config.update('enableGraphviz', payload.enableGraphviz, target); }
                    if (payload.showLineNumbers !== undefined) { await config.update('showLineNumbers', payload.showLineNumbers, target); }
                    if (payload.autoSave !== undefined) { await config.update('autoSave', payload.autoSave, target); }
                    if (payload.autoSaveDelay !== undefined) { await config.update('autoSaveDelay', payload.autoSaveDelay, target); }
                    if (payload.codeTheme !== undefined) { await config.update('codeTheme', payload.codeTheme, target); }
                    if (payload.language !== undefined) { await config.update('language', payload.language, target); }
                    this.postMessage({ type: 'settingsSaved', payload: { success: true }, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'settingsSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'openWorkspaceFile': {
                // 工作区内文件链接点击 — 在新窗口打开文件
                const linkPath = payload.filePath || '';
                if (!linkPath) { break; }
                try {
                    let absPath: string;
                    if (path.isAbsolute(linkPath)) {
                        absPath = linkPath;
                    } else if (this._currentFilePath) {
                        // 相对于当前打开文件的目录解析
                        absPath = path.resolve(path.dirname(this._currentFilePath), linkPath);
                    } else {
                        // 相对于工作区根目录解析
                        const wsFolder = vscode.workspace.workspaceFolders?.[0];
                        if (wsFolder) {
                            absPath = path.resolve(wsFolder.uri.fsPath, linkPath);
                        } else {
                            absPath = path.resolve(linkPath);
                        }
                    }
                    const fileUri = vscode.Uri.file(absPath);
                    if (fs.existsSync(absPath)) {
                        // 如果是 .md 或 .mdc 文件，用本扩展的 Review Panel 打开
                        const ext = path.extname(absPath).toLowerCase();
                        if (ext === '.md' || ext === '.mdc') {
                            ReviewPanel.createOrShow(this._extensionContext, absPath);
                        } else {
                            vscode.commands.executeCommand('vscode.open', fileUri, { preview: false });
                        }
                    } else {
                        vscode.window.showWarningMessage(`文件不存在: ${absPath}`);
                    }
                } catch (e: any) {
                    vscode.window.showErrorMessage(`打开文件失败: ${e.message}`);
                }
                break;
            }
            case 'openCodeBuddyChat': {
                // 将指令内容发送到当前 IDE 的 AI 对话窗口。
                // 实际派发通过 aiChatAdapters 模块完成（按 IdeKind 路由多策略 fallback 链）。
                const instruction = payload.instruction || '';
                try {
                    const outputChannel = vscode.window.createOutputChannel('MD Human Review - AI Chat');
                    outputChannel.clear();

                    // 1. 写入剪贴板作为所有策略失败时的兜底
                    await vscode.env.clipboard.writeText(instruction);
                    outputChannel.appendLine(`[DIAG:aiChat] clipboard written, length=${instruction.length}`);

                    // 2. 识别当前 IDE 类型
                    const allCommands = await vscode.commands.getCommands(true);
                    const commandSet = new Set(allCommands);
                    const appName = vscode.env.appName || '';
                    const ide: IdeKind = detectIdeKind(appName, commandSet);
                    outputChannel.appendLine(`[DIAG:aiChat] ide=${ide} appName=${appName} commands=${allCommands.length} total`);

                    // 3. 派发到对应 IDE 的策略链
                    const result = await dispatchAiChat(ide, {
                        instruction,
                        log: (line) => outputChannel.appendLine(line),
                        availableCommands: commandSet
                    });

                    outputChannel.show(true);

                    // 4. 根据结果显示合适的 toast 提示
                    if (result.succeeded) {
                        const successKey = `ai.chat_success_${ide}`;
                        vscode.window.showInformationMessage(_hostT(successKey));
                    } else {
                        vscode.window.showInformationMessage(_hostT('ai.chat_fallback'));
                    }
                } catch (e: any) {
                    vscode.window.showErrorMessage(_hostT('ai.chat_error') + e.message);
                }
                break;
            }
        }
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _getWebviewContent(): string {
        const webview = this._panel.webview;
        const webviewUri = (relativePath: string) =>
            webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', relativePath)).toString();

        const cspSource = webview.cspSource;
        const nonce = this._getNonce();

        const markedUri = webviewUri('lib/marked.min.js');
        const markedFootnoteUri = webviewUri('lib/marked-footnote.umd.js');
        const hljsUri = webviewUri('lib/highlight.min.js');
        const turndownUri = webviewUri('lib/turndown.js');
        const katexUri = webviewUri('lib/katex.min.js');
        const mermaidUri = webviewUri('lib/mermaid.min.js');
        const vizUri = webviewUri('lib/viz-global.js');
        const emojiMapUri = webviewUri('lib/emoji-map.js');
        const styleUri = webviewUri('css/style.css');
        const markdownCssUri = webviewUri('css/markdown.css');
        const annotationsCssUri = webviewUri('css/annotations.css');
        const settingsCssUri = webviewUri('css/settings.css');
        const highlightThemesCssUri = webviewUri('css/highlight-themes.css');
        const katexCssUri = webviewUri('css/katex.min.css');
        const storeUri = webviewUri('js/store.js');
        const i18nUri = webviewUri('js/i18n.js');
        const rendererUri = webviewUri('js/renderer.js');
        const annotationsUri = webviewUri('js/annotations.js');
        const exportUri = webviewUri('js/export.js');
        const settingsUri = webviewUri('js/settings.js');
        const appUri = webviewUri('js/app.js');
const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'icons', 'icon-512x512.png')).toString();

        // Read the HTML template
        const htmlPath = path.join(this._extensionUri.fsPath, 'webview', 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');

        // Replace placeholders
        html = html.replace(/\$\{nonce\}/g, nonce);
        html = html.replace(/\$\{cspSource\}/g, cspSource);
        html = html.replace(/\$\{markedUri\}/g, markedUri);
        html = html.replace(/\$\{markedFootnoteUri\}/g, markedFootnoteUri);
        html = html.replace(/\$\{hljsUri\}/g, hljsUri);
        html = html.replace(/\$\{turndownUri\}/g, turndownUri);
        html = html.replace(/\$\{katexUri\}/g, katexUri);
        html = html.replace(/\$\{mermaidUri\}/g, mermaidUri);
        html = html.replace(/\$\{vizUri\}/g, vizUri);
        html = html.replace(/\$\{emojiMapUri\}/g, emojiMapUri);
        html = html.replace(/\$\{styleUri\}/g, styleUri);
        html = html.replace(/\$\{markdownCssUri\}/g, markdownCssUri);
        html = html.replace(/\$\{annotationsCssUri\}/g, annotationsCssUri);
        html = html.replace(/\$\{settingsCssUri\}/g, settingsCssUri);
        html = html.replace(/\$\{highlightThemesCssUri\}/g, highlightThemesCssUri);
        html = html.replace(/\$\{katexCssUri\}/g, katexCssUri);
        html = html.replace(/\$\{storeUri\}/g, storeUri);
        html = html.replace(/\$\{i18nUri\}/g, i18nUri);
        html = html.replace(/\$\{rendererUri\}/g, rendererUri);
        html = html.replace(/\$\{annotationsUri\}/g, annotationsUri);
        html = html.replace(/\$\{exportUri\}/g, exportUri);
        html = html.replace(/\$\{settingsUri\}/g, settingsUri);
        html = html.replace(/\$\{appUri\}/g, appUri);
        html = html.replace(/\$\{iconUri\}/g, iconUri);

        return html;
    }

    public dispose() {
        // 从 Map 中移除
        if (this._currentFilePath) {
            const normalizedPath = path.resolve(this._currentFilePath);
            ReviewPanel.panels.delete(normalizedPath);
        }
        if (ReviewPanel.currentPanel === this) {
            // 切换到另一个存活面板（如有）
            const remaining = ReviewPanel.panels.values().next().value;
            ReviewPanel.currentPanel = remaining || undefined;
        }
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) { d.dispose(); }
        }
        // 刷新剩余面板标题（同名文件可能恢复为纯文件名）
        ReviewPanel._refreshAllTitles();
    }
}
