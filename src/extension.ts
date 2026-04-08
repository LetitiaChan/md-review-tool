import * as vscode from 'vscode';
import { ReviewPanel } from './reviewPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('[MD Human Review] 插件已激活');

    context.subscriptions.push(
        vscode.commands.registerCommand('mdReview.openPanel', async (uri?: vscode.Uri) => {
            let filePath: string | undefined;
            if (uri) {
                filePath = uri.fsPath;
            } else {
                const editor = vscode.window.activeTextEditor;
                if (editor && (
                    editor.document.languageId === 'markdown' ||
                    editor.document.fileName.endsWith('.md') ||
                    editor.document.fileName.endsWith('.mdc')
                )) {
                    filePath = editor.document.uri.fsPath;
                }
            }

            // 当通过快捷键触发且无 uri 时，尝试从资源管理器选中项获取
            if (!filePath) {
                // 通过剪贴板技巧获取资源管理器选中的文件路径
                // 先保存当前剪贴板内容，执行复制路径命令，再恢复
                const originalClipboard = await vscode.env.clipboard.readText();
                await vscode.commands.executeCommand('copyFilePath');
                const copiedPath = await vscode.env.clipboard.readText();
                await vscode.env.clipboard.writeText(originalClipboard);

                if (copiedPath && copiedPath !== originalClipboard) {
                    const ext = copiedPath.toLowerCase();
                    if (ext.endsWith('.md') || ext.endsWith('.markdown') || ext.endsWith('.mdc')) {
                        filePath = copiedPath;
                    }
                }
            }

            ReviewPanel.createOrShow(context, filePath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('mdReview.exportReview', () => {
            const panel = ReviewPanel.currentPanel || ReviewPanel.panels.values().next().value;
            if (panel) {
                panel.postMessage({ type: 'triggerExport' });
            }
        })
    );
}

export function deactivate() {
    console.log('[MD Human Review] 插件已停用');
}
