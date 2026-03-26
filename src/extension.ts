import * as vscode from 'vscode';
import { ReviewPanel } from './reviewPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('[MD批阅] 插件已激活');

    context.subscriptions.push(
        vscode.commands.registerCommand('mdReview.openPanel', (uri?: vscode.Uri) => {
            let filePath: string | undefined;
            if (uri) {
                filePath = uri.fsPath;
            } else {
                const editor = vscode.window.activeTextEditor;
                if (editor && (
                    editor.document.languageId === 'markdown' ||
                    editor.document.languageId === 'mdc' ||
                    editor.document.fileName.endsWith('.md') ||
                    editor.document.fileName.endsWith('.mdc')
                )) {
                    filePath = editor.document.uri.fsPath;
                }
            }
            ReviewPanel.createOrShow(context, filePath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mdReview.exportReview', () => {
            if (ReviewPanel.currentPanel) {
                ReviewPanel.currentPanel.postMessage({ type: 'triggerExport' });
            }
        })
    );
}

export function deactivate() {
    console.log('[MD批阅] 插件已停用');
}
