import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './customEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('[MD Human Review] 插件已激活');

    // 注册 Custom Editor Provider（"Open With..." 集成）
    context.subscriptions.push(MarkdownEditorProvider.register(context));

    context.subscriptions.push(
        vscode.commands.registerCommand('mdReview.exportReview', () => {
            const panel = MarkdownEditorProvider.getActiveWebviewPanel();
            if (panel) {
                panel.webview.postMessage({ type: 'triggerExport' });
            }
        })
    );
}

export function deactivate() {
    console.log('[MD Human Review] 插件已停用');
}
