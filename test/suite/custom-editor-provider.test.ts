import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Custom Editor Provider + Shared Webview Helper 测试
 * 
 * 三层测试模型：
 * - Tier 1: 存在性断言（文件存在、导出存在、package.json 配置正确）
 * - Tier 2: 行为级断言（模块导入、函数调用）
 * - Tier 3: 任务特定断言（Custom Editor 注册、文件列表移除验证）
 */
suite('Custom Editor Provider Tests', () => {

    const projectRoot = path.resolve(__dirname, '../../..');

    // ===== Tier 1: 存在性断言 =====

    test('BT-custom-editor.1 webviewHelper.ts 文件应存在', () => {
        const filePath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        assert.ok(fs.existsSync(filePath), 'src/webviewHelper.ts 应存在');
    });

    test('BT-custom-editor.2 customEditorProvider.ts 文件应存在', () => {
        const filePath = path.join(projectRoot, 'src', 'customEditorProvider.ts');
        assert.ok(fs.existsSync(filePath), 'src/customEditorProvider.ts 应存在');
    });

    test('BT-custom-editor.3 webviewHelper 应导出 getWebviewHtml 函数', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'webviewHelper.ts'), 'utf-8');
        assert.ok(content.includes('export function getWebviewHtml'), 'webviewHelper 应导出 getWebviewHtml');
    });

    test('BT-custom-editor.4 webviewHelper 应导出 createMessageHandler 函数', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'webviewHelper.ts'), 'utf-8');
        assert.ok(content.includes('export function createMessageHandler'), 'webviewHelper 应导出 createMessageHandler');
    });

    test('BT-custom-editor.5 webviewHelper 应导出 MessageHandlerContext 接口', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'webviewHelper.ts'), 'utf-8');
        assert.ok(content.includes('export interface MessageHandlerContext'), 'webviewHelper 应导出 MessageHandlerContext');
    });

    test('BT-custom-editor.6 customEditorProvider 应导出 MarkdownEditorProvider 类', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes('export class MarkdownEditorProvider'), 'customEditorProvider 应导出 MarkdownEditorProvider');
    });

    test('BT-custom-editor.7 MarkdownEditorProvider 应实现 CustomTextEditorProvider', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes('implements vscode.CustomTextEditorProvider'), '应实现 CustomTextEditorProvider 接口');
    });

    // ===== Tier 1: package.json 配置断言 =====

    test('BT-custom-editor.8 package.json 应包含 customEditors 贡献点', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        assert.ok(pkg.contributes.customEditors, 'package.json 应有 customEditors 贡献点');
        assert.ok(Array.isArray(pkg.contributes.customEditors), 'customEditors 应为数组');
        assert.strictEqual(pkg.contributes.customEditors.length, 1, '应有 1 个 custom editor');
    });

    test('BT-custom-editor.9 customEditors viewType 应为 mdReview.markdownEditor', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const editor = pkg.contributes.customEditors[0];
        assert.strictEqual(editor.viewType, 'mdReview.markdownEditor');
    });

    test('BT-custom-editor.10 customEditors priority 应为 option（不抢默认编辑器）', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const editor = pkg.contributes.customEditors[0];
        assert.strictEqual(editor.priority, 'option', 'priority 应为 option');
    });

    test('BT-custom-editor.11 customEditors selector 应覆盖 .md .mdc .markdown', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const editor = pkg.contributes.customEditors[0];
        const patterns = editor.selector.map((s: any) => s.filenamePattern);
        assert.ok(patterns.includes('*.md'), '应支持 *.md');
        assert.ok(patterns.includes('*.mdc'), '应支持 *.mdc');
        assert.ok(patterns.includes('*.markdown'), '应支持 *.markdown');
    });

    test('BT-custom-editor.12 activationEvents 应包含 onCustomEditor', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        assert.ok(
            pkg.activationEvents.includes('onCustomEditor:mdReview.markdownEditor'),
            'activationEvents 应包含 onCustomEditor:mdReview.markdownEditor'
        );
    });

    // ===== Tier 2: 行为级断言 =====

    test('BT-custom-editor.13 reviewPanel.ts 应导入 webviewHelper', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'reviewPanel.ts'), 'utf-8');
        assert.ok(content.includes("from './webviewHelper'"), 'reviewPanel 应导入 webviewHelper');
    });

    test('BT-custom-editor.14 reviewPanel.ts 应使用 getWebviewHtml', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'reviewPanel.ts'), 'utf-8');
        assert.ok(content.includes('getWebviewHtml('), 'reviewPanel 应调用 getWebviewHtml');
    });

    test('BT-custom-editor.15 reviewPanel.ts 应使用 createMessageHandler', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'reviewPanel.ts'), 'utf-8');
        assert.ok(content.includes('createMessageHandler('), 'reviewPanel 应调用 createMessageHandler');
    });

    test('BT-custom-editor.16 extension.ts 应导入 MarkdownEditorProvider', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'extension.ts'), 'utf-8');
        assert.ok(content.includes('MarkdownEditorProvider'), 'extension.ts 应导入 MarkdownEditorProvider');
    });

    test('BT-custom-editor.17 extension.ts 应注册 MarkdownEditorProvider', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'extension.ts'), 'utf-8');
        assert.ok(content.includes('MarkdownEditorProvider.register'), 'extension.ts 应调用 MarkdownEditorProvider.register');
    });

    test('BT-custom-editor.18 customEditorProvider 应使用 WorkspaceEdit 保存', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes('WorkspaceEdit'), 'customEditorProvider 应使用 WorkspaceEdit');
        assert.ok(content.includes('applyEdit'), 'customEditorProvider 应调用 applyEdit');
    });

    // ===== Tier 3: 文件列表移除验证 =====

    test('BT-custom-editor.19 webview/index.html 不应包含 fileSelectorGroup', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(!content.includes('fileSelectorGroup'), 'index.html 不应包含 fileSelectorGroup');
    });

    test('BT-custom-editor.20 webview/index.html 不应包含 btnRefresh', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(!content.includes('btnRefresh'), 'index.html 不应包含 btnRefresh');
    });

    test('BT-custom-editor.21 webview/js/app.js 不应包含 loadFileList 函数', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(!content.includes('function loadFileList'), 'app.js 不应包含 loadFileList 函数定义');
    });

    test('BT-custom-editor.22 webview/js/app.js 不应包含 serverFileList 变量', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(!content.includes('serverFileList'), 'app.js 不应包含 serverFileList');
    });

    test('BT-custom-editor.23 src/fileService.ts 不应包含 listMdFiles 方法', () => {
        const filePath = path.join(projectRoot, 'src', 'fileService.ts');
        const content = fs.readFileSync(filePath, 'utf-8');
        assert.ok(!content.includes('listMdFiles'), 'fileService.ts 不应包含 listMdFiles');
    });

    test('BT-custom-editor.24 src/ 目录不应包含 getFiles 消息处理', () => {
        const rpPath = path.join(projectRoot, 'src', 'reviewPanel.ts');
        const whPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const rpContent = fs.readFileSync(rpPath, 'utf-8');
        const whContent = fs.readFileSync(whPath, 'utf-8');
        assert.ok(!rpContent.includes("'getFiles'"), 'reviewPanel.ts 不应处理 getFiles 消息');
        assert.ok(!whContent.includes("'getFiles'"), 'webviewHelper.ts 不应处理 getFiles 消息');
    });

    test('BT-custom-editor.25 webview/css/style.css 不应包含 .file-selector-group 样式', () => {
        const cssPath = path.join(projectRoot, 'webview', 'css', 'style.css');
        const content = fs.readFileSync(cssPath, 'utf-8');
        assert.ok(!content.includes('.file-selector-group'), 'style.css 不应包含 .file-selector-group');
    });
});
