import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileService } from './fileService';
import { StateService } from './stateService';
import { detectIdeKind, dispatchAiChat, IdeKind } from './aiChatAdapters';

// ===== 国际化消息 =====
const _hostMessages: Record<string, Record<string, string>> = {
    'zh-CN': {
        'ai.chat_success_codebuddy': '✅ AI 新对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。',
        'ai.chat_success_vscode': '✅ AI 对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。',
        'ai.chat_success_cursor': '✅ 已在 Cursor 打开 AI Chat 并自动粘贴指令。若未自动发送请按 Enter。',
        'ai.chat_success_cursor_autosend': '✅ 已在 Cursor 自动打开 AI Chat，指令已粘贴并发送。',
        'ai.chat_success_windsurf': '✅ 已在 Windsurf 打开 Cascade 并自动粘贴指令。若未自动发送请按 Enter。',
        'ai.chat_fallback': '⚠️ 自动派发未完成。已复制 AI 指令到剪贴板，请在 AI 对话窗口按 Ctrl+V 粘贴，然后回车发送（详情见 Output 面板）。',
        'ai.chat_error': '❌ 操作失败: ',
    },
    'en': {
        'ai.chat_success_codebuddy': '✅ New AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.',
        'ai.chat_success_vscode': '✅ AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.',
        'ai.chat_success_cursor': '✅ AI Chat opened in Cursor and instructions pasted automatically. Press Enter if not sent.',
        'ai.chat_success_cursor_autosend': '✅ AI Chat opened in Cursor; instructions pasted and sent automatically.',
        'ai.chat_success_windsurf': '✅ Cascade opened in Windsurf and instructions pasted automatically. Press Enter if not sent.',
        'ai.chat_fallback': '⚠️ Auto-dispatch did not complete. AI instructions copied to clipboard — please press Ctrl+V then Enter in the AI chat input (see Output panel for details).',
        'ai.chat_error': '❌ Operation failed: ',
    }
};

function _hostT(key: string): string {
    const lang = vscode.workspace.getConfiguration('mdReview').get<string>('language', 'zh-CN');
    const dict = _hostMessages[lang] || _hostMessages['zh-CN'];
    return dict[key] || _hostMessages['zh-CN'][key] || key;
}

// ===== 共享 Webview HTML 生成 =====

function _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * 生成 webview HTML 内容（共享逻辑，供 ReviewPanel 和 CustomEditorProvider 使用）
 */
export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const webviewUri = (relativePath: string) =>
        webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', relativePath)).toString();

    const cspSource = webview.cspSource;
    const nonce = _getNonce();

    const markedUri = webviewUri('lib/marked.min.js');
    const markedFootnoteUri = webviewUri('lib/marked-footnote.umd.js');
    const hljsUri = webviewUri('lib/highlight.min.js');
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
    const appBundleUri = webviewUri('dist/app.bundle.js');
    const pmBundleUri = webviewUri('dist/pm.bundle.js');

    // Read the HTML template
    const htmlPath = path.join(extensionUri.fsPath, 'webview', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Replace placeholders
    html = html.replace(/\$\{nonce\}/g, nonce);
    html = html.replace(/\$\{cspSource\}/g, cspSource);
    html = html.replace(/\$\{markedUri\}/g, markedUri);
    html = html.replace(/\$\{markedFootnoteUri\}/g, markedFootnoteUri);
    html = html.replace(/\$\{hljsUri\}/g, hljsUri);
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
    html = html.replace(/\$\{appBundleUri\}/g, appBundleUri);
    html = html.replace(/\$\{pmBundleUri\}/g, pmBundleUri);

    return html;
}

// ===== 共享消息处理上下文 =====

export interface MessageHandlerContext {
    /** 发送消息到 webview */
    postMessage: (message: any) => void;
    /** 扩展上下文 */
    extensionContext: vscode.ExtensionContext;
    /** 扩展 URI */
    extensionUri: vscode.Uri;
    /** 文件服务 */
    fileService: FileService;
    /** 状态服务 */
    stateService: StateService;
    /** 获取当前文件路径 */
    getCurrentFilePath: () => string | undefined;
    /** 设置当前文件路径 */
    setCurrentFilePath: (filePath: string) => void;
    /** 保存文件的实现（Panel 模式用 fs.writeFile，Custom Editor 模式用 WorkspaceEdit） */
    saveFileImpl: (filePath: string, content: string, requestId?: string) => Promise<void>;
    /** webview 就绪回调 */
    onReady: () => void;
    /** webview 面板（用于 resolveImageUris 等） */
    webview: vscode.Webview;
    /** 获取当前文档的脏状态（Custom Editor 返回真实 isDirty，WebviewPanel 返回 false） */
    getDocumentIsDirty: () => boolean;
}

/**
 * 创建共享消息处理器（供 ReviewPanel 和 CustomEditorProvider 使用）
 * 返回一个处理 webview 消息的函数
 */
export function createMessageHandler(ctx: MessageHandlerContext): (message: any) => Promise<void> {
    return async (message: any) => {
        const { type, payload, requestId } = message;

        switch (type) {
            case 'webviewError': {
                const errCh = vscode.window.createOutputChannel('MD Review - Webview');
                errCh.appendLine(`[Webview Error] ${payload.message}`);
                if (payload.filename) { errCh.appendLine(`  File: ${payload.filename}:${payload.lineno}:${payload.colno}`); }
                if (payload.stack) { errCh.appendLine(`  Stack: ${payload.stack}`); }
                errCh.show(true);
                break;
            }
            case 'ready': {
                ctx.onReady();
                break;
            }
            case 'readFile': {
                try {
                    const data = ctx.fileService.readFile(payload.filePath);
                    ctx.setCurrentFilePath(payload.filePath);
                    ctx.postMessage({ type: 'fileContent', payload: data, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'fileContent', payload: { error: e.message }, requestId });
                }
                break;
            }
            case 'saveFile': {
                await ctx.saveFileImpl(payload.filePath, payload.content, requestId);
                break;
            }
            case 'saveReview': {
                try {
                    const result = ctx.fileService.saveReview(payload.fileName, payload.content);
                    ctx.postMessage({ type: 'reviewSaved', payload: result, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'reviewSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'applyReview': {
                try {
                    const result = ctx.fileService.applyReview(payload.annotations, payload.sourceFile, payload.fileName, payload.relPath);
                    ctx.postMessage({ type: 'applyResult', payload: result, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'applyResult', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'getState': {
                const value = ctx.stateService.get(payload.key);
                ctx.postMessage({ type: 'stateValue', payload: { key: payload.key, value }, requestId });
                break;
            }
            case 'setState': {
                await ctx.stateService.set(payload.key, payload.value);
                break;
            }
            case 'resolveImageUris': {
                const uriMap = ctx.fileService.resolveImageUris(
                    payload.imagePaths,
                    payload.basePath,
                    ctx.webview
                );
                ctx.postMessage({ type: 'imageUris', payload: uriMap, requestId });
                break;
            }
            case 'pickImage': {
                try {
                    const uris = await vscode.window.showOpenDialog({
                        canSelectMany: true,
                        filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
                        title: 'Select Image'
                    });
                    if (!uris || uris.length === 0) {
                        ctx.postMessage({ type: 'pickImageResult', payload: { success: true, images: [] }, requestId });
                        break;
                    }
                    const images: { success: boolean; imagePath: string }[] = [];
                    for (const uri of uris) {
                        const fileBuffer = fs.readFileSync(uri.fsPath);
                        const ext = path.extname(uri.fsPath).slice(1).toLowerCase() || 'png';
                        const base64Data = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fileBuffer.toString('base64')}`;
                        const result = ctx.fileService.saveAnnotationImage(base64Data, undefined, payload.sourceDir);
                        images.push(result);
                    }
                    ctx.postMessage({ type: 'pickImageResult', payload: { success: true, images }, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'pickImageResult', payload: { success: false, error: e.message, images: [] }, requestId });
                }
                break;
            }
            case 'saveAnnotationImage': {
                try {
                    const result = ctx.fileService.saveAnnotationImage(payload.base64Data, payload.fileName, payload.sourceDir);
                    ctx.postMessage({ type: 'annotationImageSaved', payload: result, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'annotationImageSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'resolveAnnotationImageUris': {
                const annUriMap = ctx.fileService.resolveAnnotationImageUris(
                    payload.imagePaths,
                    ctx.webview
                );
                ctx.postMessage({ type: 'annotationImageUris', payload: annUriMap, requestId });
                break;
            }
            case 'deleteAnnotationImage': {
                const deleted = ctx.fileService.deleteAnnotationImage(payload.imagePath);
                ctx.postMessage({ type: 'annotationImageDeleted', payload: { success: deleted }, requestId });
                break;
            }
            case 'getReviewRecords': {
                const records = ctx.fileService.getReviewRecords(payload.fileName, payload.relPath);
                ctx.postMessage({ type: 'reviewRecords', payload: { records }, requestId });
                break;
            }
            case 'deleteReviewRecords': {
                const delResult = ctx.fileService.deleteReviewRecords(payload.fileName, payload.relPath);
                ctx.postMessage({ type: 'deleteReviewRecordsResult', payload: delResult, requestId });
                break;
            }
            case 'showInfo': {
                vscode.window.showInformationMessage(payload.message);
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
                    codeTheme: config.get<string>('codeTheme', 'default-light-modern'),
                    language: config.get<string>('language', 'zh-CN'),
                    customCss: config.get<string>('customCss', ''),
                    imageAssetsPath: config.get<string>('imageAssetsPath', 'assets/images'),
                };
                ctx.postMessage({ type: 'settingsData', payload: settings, requestId });
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
                    ctx.postMessage({ type: 'settingsSaved', payload: { success: true }, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'settingsSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'saveImage': {
                try {
                    const { dataUrl, filename, requestId: imgReqId } = payload;
                    if (!dataUrl || !filename) {
                        ctx.postMessage({ type: 'imageSaveError', payload: { error: 'Missing dataUrl or filename' }, requestId: imgReqId });
                        break;
                    }
                    const matches = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
                    if (!matches) {
                        ctx.postMessage({ type: 'imageSaveError', payload: { error: 'Invalid dataUrl format' }, requestId: imgReqId });
                        break;
                    }
                    const buffer = Buffer.from(matches[1], 'base64');
                    const config = vscode.workspace.getConfiguration('mdReview');
                    const assetsPath = config.get<string>('imageAssetsPath', 'assets/images');
                    let baseDir: string;
                    const currentFilePath = ctx.getCurrentFilePath();
                    if (currentFilePath) {
                        baseDir = path.dirname(currentFilePath);
                    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        baseDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    } else {
                        ctx.postMessage({ type: 'imageSaveError', payload: { error: 'No workspace folder available' }, requestId: imgReqId });
                        break;
                    }
                    const targetDir = path.join(baseDir, assetsPath);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    const targetPath = path.join(targetDir, filename);
                    fs.writeFileSync(targetPath, buffer);
                    const relativePath = path.posix.join(assetsPath, filename).replace(/\\/g, '/');
                    ctx.postMessage({ type: 'imageSaved', payload: { relativePath }, requestId: imgReqId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'imageSaveError', payload: { error: e.message }, requestId: payload.requestId });
                }
                break;
            }
            case 'openWorkspaceFile': {
                const linkPath = payload.filePath || '';
                if (!linkPath) { break; }
                try {
                    let absPath: string;
                    const currentFilePath = ctx.getCurrentFilePath();
                    if (path.isAbsolute(linkPath)) {
                        absPath = linkPath;
                    } else if (currentFilePath) {
                        absPath = path.resolve(path.dirname(currentFilePath), linkPath);
                    } else {
                        const wsFolder = vscode.workspace.workspaceFolders?.[0];
                        if (wsFolder) {
                            absPath = path.resolve(wsFolder.uri.fsPath, linkPath);
                        } else {
                            absPath = path.resolve(linkPath);
                        }
                    }
                    const fileUri = vscode.Uri.file(absPath);
                    if (fs.existsSync(absPath)) {
                        const ext = path.extname(absPath).toLowerCase();
                        if (ext === '.md' || ext === '.mdc' || ext === '.markdown') {
                            // 通过 Custom Editor 打开 Markdown 文件
                            vscode.commands.executeCommand('vscode.openWith', fileUri, 'mdReview.markdownEditor');
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
            case 'getDocumentDirtyState': {
                const isDirty = ctx.getDocumentIsDirty();
                ctx.postMessage({ type: 'documentDirtyState', payload: { isDirty }, requestId });
                break;
            }
            case 'refresh.showDirtyConfirm': {
                const lang = vscode.workspace.getConfiguration('mdReview').get<string>('language', 'zh-CN');
                const msg = lang === 'zh-CN'
                    ? '文档有未保存的修改。放弃修改并重新加载？'
                    : 'Document has unsaved changes. Discard and reload?';
                const discardLabel = lang === 'zh-CN' ? '放弃并重载' : 'Discard & Reload';
                const cancelLabel = lang === 'zh-CN' ? '取消' : 'Cancel';
                const choice = await vscode.window.showWarningMessage(
                    msg, { modal: true }, discardLabel, cancelLabel
                );
                const confirmed = choice === discardLabel;
                ctx.postMessage({ type: 'refresh.dirtyConfirmResult', payload: { confirmed }, requestId });
                break;
            }
            case 'refresh.revertFile': {
                try {
                    await vscode.commands.executeCommand('workbench.action.revertFile');
                    ctx.postMessage({ type: 'refresh.revertResult', payload: { success: true }, requestId });
                } catch (e: any) {
                    ctx.postMessage({ type: 'refresh.revertResult', payload: { success: false, fallback: 'visual' }, requestId });
                }
                break;
            }
            case 'openCodeBuddyChat': {
                const instruction = payload.instruction || '';
                try {
                    const outputChannel = vscode.window.createOutputChannel('MD Human Review - AI Chat');
                    outputChannel.clear();

                    await vscode.env.clipboard.writeText(instruction);
                    outputChannel.appendLine(`[DIAG:aiChat] clipboard written, length=${instruction.length}`);

                    const allCommands = await vscode.commands.getCommands(true);
                    const commandSet = new Set(allCommands);
                    const appName = vscode.env.appName || '';
                    const ide: IdeKind = detectIdeKind(appName, commandSet);
                    outputChannel.appendLine(`[DIAG:aiChat] ide=${ide} appName=${appName} commands=${allCommands.length} total`);

                    const result = await dispatchAiChat(ide, {
                        instruction,
                        log: (line) => outputChannel.appendLine(line),
                        availableCommands: commandSet
                    });

                    if (result.succeeded) {
                        const successKey = (ide === 'cursor' && result.autoSubmitted)
                            ? 'ai.chat_success_cursor_autosend'
                            : `ai.chat_success_${ide}`;
                        vscode.window.showInformationMessage(_hostT(successKey));
                    } else {
                        outputChannel.appendLine('');
                        outputChannel.appendLine('[NEXT-STEP] 自动派发未完成。请在 AI 对话窗口输入框按 Ctrl+V 粘贴，然后按回车发送。');
                        outputChannel.appendLine('[NEXT-STEP] Auto-dispatch did not complete. In the AI chat input, press Ctrl+V to paste, then Enter to send.');
                        vscode.window.showWarningMessage(_hostT('ai.chat_fallback'));
                    }
                } catch (e: any) {
                    vscode.window.showErrorMessage(_hostT('ai.chat_error') + e.message);
                }
                break;
            }
        }
    };
}
