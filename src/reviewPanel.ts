import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileService } from './fileService';
import { StateService } from './stateService';

export class ReviewPanel {
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

        if (ReviewPanel.currentPanel) {
            ReviewPanel.currentPanel._panel.reveal(column);
            if (filePath) {
                ReviewPanel.currentPanel.loadFile(filePath);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ReviewPanel.viewType,
            'MD 批阅',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'webview'),
                    ...(vscode.workspace.workspaceFolders?.map(f => f.uri) || [])
                ]
            }
        );

        ReviewPanel.currentPanel = new ReviewPanel(panel, context, filePath);
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
        this._currentFilePath = filePath;
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
                    this._currentFilePath = payload.filePath;
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
                    const result = this._fileService.applyReview(payload.annotations, payload.sourceFile, payload.fileName);
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
            case 'getReviewRecords': {
                const records = this._fileService.getReviewRecords(payload.fileName);
                this.postMessage({ type: 'reviewRecords', payload: { records }, requestId });
                break;
            }
            case 'deleteReviewRecords': {
                const delResult = this._fileService.deleteReviewRecords(payload.fileName);
                this.postMessage({ type: 'deleteReviewRecordsResult', payload: delResult, requestId });
                break;
            }
            case 'showInfo': {
                vscode.window.showInformationMessage(payload.message);
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
        const turndownUri = webviewUri('lib/turndown.js');
        const styleUri = webviewUri('css/style.css');
        const markdownCssUri = webviewUri('css/markdown.css');
        const annotationsCssUri = webviewUri('css/annotations.css');
        const storeUri = webviewUri('js/store.js');
        const rendererUri = webviewUri('js/renderer.js');
        const annotationsUri = webviewUri('js/annotations.js');
        const exportUri = webviewUri('js/export.js');
        const appUri = webviewUri('js/app.js');

        // Read the HTML template
        const htmlPath = path.join(this._extensionUri.fsPath, 'webview', 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf-8');

        // Replace placeholders
        html = html.replace(/\$\{nonce\}/g, nonce);
        html = html.replace(/\$\{cspSource\}/g, cspSource);
        html = html.replace(/\$\{markedUri\}/g, markedUri);
        html = html.replace(/\$\{turndownUri\}/g, turndownUri);
        html = html.replace(/\$\{styleUri\}/g, styleUri);
        html = html.replace(/\$\{markdownCssUri\}/g, markdownCssUri);
        html = html.replace(/\$\{annotationsCssUri\}/g, annotationsCssUri);
        html = html.replace(/\$\{storeUri\}/g, storeUri);
        html = html.replace(/\$\{rendererUri\}/g, rendererUri);
        html = html.replace(/\$\{annotationsUri\}/g, annotationsUri);
        html = html.replace(/\$\{exportUri\}/g, exportUri);
        html = html.replace(/\$\{appUri\}/g, appUri);

        return html;
    }

    public dispose() {
        ReviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) { d.dispose(); }
        }
    }
}
