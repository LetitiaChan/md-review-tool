import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileService } from './fileService';
import { StateService } from './stateService';

export class ReviewPanel {
    public static panels: Map<string, ReviewPanel> = new Map();
    public static currentPanel: ReviewPanel | undefined;
    private static readonly viewType = 'mdReview';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _fileService: FileService;
    private readonly _stateService: StateService;
    private _disposables: vscode.Disposable[] = [];
    private _currentFilePath: string | undefined;
    private _watcher: vscode.FileSystemWatcher | undefined;

    public static createOrShow(context: vscode.ExtensionContext, filePath?: string) {
        const column = vscode.ViewColumn.One;

        // 如果指定了文件路径，检查是否已有对应面板（多窗口复用）
        if (filePath) {
            const normalizedPath = path.resolve(filePath);
            const existing = ReviewPanel.panels.get(normalizedPath);
            if (existing) {
                existing._panel.reveal(column);
                return;
            }
        }

        // 如果有当前面板，复用它（reveal + loadFile）
        if (ReviewPanel.currentPanel) {
            ReviewPanel.currentPanel._panel.reveal(column);
            if (filePath) {
                ReviewPanel.currentPanel.loadFile(filePath);
            }
            return;
        }

        // 没有任何面板，创建新面板
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
    }

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext, filePath?: string) {
        this._panel = panel;
        this._extensionUri = context.extensionUri;
        this._fileService = new FileService();
        this._stateService = new StateService(context);

        this._panel.webview.html = this._getWebviewContent();

        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // 设置文件监听
        this._setupFileWatcher();

        // 如果有初始文件，延迟加载（等 webview 初始化完成）
        if (filePath) {
            this._currentFilePath = filePath;
        }
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

        // 更新面板标题
        this._panel.title = path.basename(filePath);

        // 注册到 Map
        const normalizedPath = path.resolve(filePath);
        ReviewPanel.panels.set(normalizedPath, this);

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
            case 'ready': {
                // Webview 初始化完成，发送初始文件
                if (this._currentFilePath) {
                    this.loadFile(this._currentFilePath);
                }
                // 发送 IDE 类型信息给 webview
                const allCmds = await vscode.commands.getCommands(true);
                const ideType = allCmds.includes('tencentcloud.codingcopilot.chat.startNewChat') ? 'codebuddy' : 'vscode';
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
                    // 更新 panels Map 和 panel title（与 loadFile 保持一致）
                    if (this._currentFilePath) {
                        const oldNormalized = path.resolve(this._currentFilePath);
                        ReviewPanel.panels.delete(oldNormalized);
                    }
                    this._currentFilePath = payload.filePath;
                    this._panel.title = path.basename(payload.filePath);
                    const normalizedPath = path.resolve(payload.filePath);
                    ReviewPanel.panels.set(normalizedPath, this);
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
                    // 进入禅模式：隐藏 IDE 左侧栏和右侧栏
                    vscode.commands.executeCommand('workbench.action.closeSidebar');
                    vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
                } else {
                    // 退出禅模式：恢复 IDE 左侧栏（资源管理器）
                    vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
                    vscode.commands.executeCommand('workbench.action.toggleAuxiliaryBar');
                }
                break;
            }
            case 'getSettings': {
                const config = vscode.workspace.getConfiguration('mdReview');
                const settings = {
                    fontSize: config.get<number>('fontSize', 16),
                    lineHeight: config.get<number>('lineHeight', 1.6),
                    contentMaxWidth: config.get<number>('contentMaxWidth', 1200),
                    fontFamily: config.get<string>('fontFamily', ''),
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
                    codeTheme: config.get<string>('codeTheme', 'default-dark-modern')
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
                    this.postMessage({ type: 'settingsSaved', payload: { success: true }, requestId });
                } catch (e: any) {
                    this.postMessage({ type: 'settingsSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'openCodeBuddyChat': {
                // 将指令内容发送到 AI 对话窗口
                const instruction = payload.instruction || '';
                try {
const outputChannel = vscode.window.createOutputChannel('MD Human Review - AI Chat');
                    outputChannel.clear();

                    // 写入剪贴板作为备份
                    await vscode.env.clipboard.writeText(instruction);
                    outputChannel.appendLine(`[AI Chat] 指令已写入剪贴板, 长度: ${instruction.length}`);

                    const allCommands = await vscode.commands.getCommands(true);

                    // 判断当前 IDE 类型：CodeBuddy 还是 VSCode
                    const isCodeBuddy = allCommands.includes('tencentcloud.codingcopilot.chat.startNewChat');
                    const appName = vscode.env.appName || '';
                    outputChannel.appendLine(`[AI Chat] IDE: ${appName}, isCodeBuddy: ${isCodeBuddy}`);

                    let succeeded = false;

                    if (isCodeBuddy) {
                        // ========== CodeBuddy IDE 逻辑 ==========
                        outputChannel.appendLine('[AI Chat] 进入 CodeBuddy 模式');

                        // 策略1: startNewChat + sendMessage 全自动
                        try {
                            outputChannel.appendLine('[AI Chat] CB策略1: startNewChat + sendMessage...');
                            await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.startNewChat');
                            outputChannel.appendLine('[AI Chat] CB策略1: ✅ startNewChat 已执行');

                            await new Promise(resolve => setTimeout(resolve, 800));

                            await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.sendMessage', {
                                message: instruction
                            });
                            outputChannel.appendLine('[AI Chat] CB策略1: ✅ sendMessage 已执行');
                            succeeded = true;
                            outputChannel.show(true);
                        } catch (e: any) {
                            outputChannel.appendLine(`[AI Chat] CB策略1: ❌ 失败: ${e.message}`);
                        }

                        // 策略2: sendToChat
                        if (!succeeded) {
                            try {
                                outputChannel.appendLine('[AI Chat] CB策略2: sendToChat...');
                                await vscode.commands.executeCommand('tencentcloud.codingcopilot.sendToChat', {
                                    message: instruction
                                });
                                outputChannel.appendLine('[AI Chat] CB策略2: ✅ sendToChat 已执行');
                                succeeded = true;
                                outputChannel.show(true);
                            } catch (e: any) {
                                outputChannel.appendLine(`[AI Chat] CB策略2: ❌ 失败: ${e.message}`);
                            }
                        }

                        // 策略3: addToChat
                        if (!succeeded) {
                            try {
                                outputChannel.appendLine('[AI Chat] CB策略3: addToChat...');
                                await vscode.commands.executeCommand('tencentcloud.codingcopilot.addToChat', {
                                    message: instruction
                                });
                                outputChannel.appendLine('[AI Chat] CB策略3: ✅ addToChat 已执行');
                                succeeded = true;
                                outputChannel.show(true);
                            } catch (e: any) {
                                outputChannel.appendLine(`[AI Chat] CB策略3: ❌ 失败: ${e.message}`);
                            }
                        }

                        // 策略4: startNewChat + 聚焦面板 + 剪贴板提示
                        if (!succeeded) {
                            try {
                                outputChannel.appendLine('[AI Chat] CB策略4: startNewChat + 聚焦 + 剪贴板...');
                                await vscode.commands.executeCommand('tencentcloud.codingcopilot.chat.startNewChat');
                                outputChannel.appendLine('[AI Chat] CB策略4: ✅ startNewChat 已执行');

                                await new Promise(resolve => setTimeout(resolve, 800));

                                await vscode.commands.executeCommand('coding-copilot.webviews.chat.focus');
                                outputChannel.appendLine('[AI Chat] CB策略4: ✅ 已聚焦对话面板');

                                vscode.window.showInformationMessage(
                                    '✅ AI 新对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。'
                                );
                                succeeded = true;
                                outputChannel.show(true);
                            } catch (e: any) {
                                outputChannel.appendLine(`[AI Chat] CB策略4: ❌ 失败: ${e.message}`);
                            }
                        }
                    } else {
                        // ========== VSCode + 工蜂 Copilot 逻辑 ==========
                        outputChannel.appendLine('[AI Chat] 进入 VSCode + 工蜂 Copilot 模式');

                        // 策略1: 打开工蜂对话 → 聚焦面板 → 剪贴板提示
                        if (allCommands.includes('gongfeng.gongfeng-copilot.chat.openNewChat')) {
                            try {
                                outputChannel.appendLine('[AI Chat] GF策略1: 打开工蜂 Copilot 对话...');
                                await vscode.commands.executeCommand('gongfeng.gongfeng-copilot.chat.openNewChat');
                                outputChannel.appendLine('[AI Chat] GF策略1: ✅ 工蜂对话已打开');

                                // 等待 Webview 面板加载
                                await new Promise(resolve => setTimeout(resolve, 1000));

                                // 聚焦工蜂对话面板
                                if (allCommands.includes('gongfeng-copilot.webviews.chat.focus')) {
                                    await vscode.commands.executeCommand('gongfeng-copilot.webviews.chat.focus');
                                    outputChannel.appendLine('[AI Chat] GF策略1: ✅ 已聚焦工蜂面板');
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                }

                                // 提示用户粘贴（Webview 内无法程序化输入文本）
                                outputChannel.appendLine('[AI Chat] GF策略1: 指令已在剪贴板，请 Ctrl+V 粘贴后回车发送');
                                vscode.window.showInformationMessage(
                                    '✅ AI 对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。'
                                );
                                succeeded = true;
                                outputChannel.show(true);
                            } catch (e: any) {
                                outputChannel.appendLine(`[AI Chat] GF策略1: ❌ 失败: ${e.message}`);
                            }
                        }
                    }

                    // 所有策略都失败
                    if (!succeeded) {
                        outputChannel.appendLine('[AI Chat] ⚠️ 所有策略都失败，请手动操作');
                        outputChannel.show(true);
                        vscode.window.showInformationMessage(
                            '✅ 已复制 AI 指令到剪贴板，请手动打开AI对话窗口并粘贴执行。'
                        );
                    }
                } catch (e: any) {
                    vscode.window.showErrorMessage('❌ 操作失败: ' + e.message);
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
            ReviewPanel.currentPanel = undefined;
        }
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) { d.dispose(); }
        }
    }
}
