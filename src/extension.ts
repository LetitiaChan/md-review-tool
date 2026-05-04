import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './customEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('[MD Human Review] 插件已激活');

    // 注册 Custom Editor Provider（"Open With..." 集成）
    context.subscriptions.push(MarkdownEditorProvider.register(context));

    // 注册右键菜单命令：用 MD Human Review 打开 Markdown 文件
    context.subscriptions.push(
        vscode.commands.registerCommand('mdReview.openWithReview', (uri?: vscode.Uri) => {
            const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
            if (targetUri) {
                vscode.commands.executeCommand('vscode.openWith', targetUri, 'mdReview.markdownEditor');
            }
        })
    );

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
