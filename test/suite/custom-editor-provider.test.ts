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

    test('BT-custom-editor.13 customEditorProvider.ts 应导入 webviewHelper', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes("from './webviewHelper'"), 'customEditorProvider 应导入 webviewHelper');
    });

    test('BT-custom-editor.14 customEditorProvider.ts 应使用 getWebviewHtml', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes('getWebviewHtml('), 'customEditorProvider 应调用 getWebviewHtml');
    });

    test('BT-custom-editor.15 customEditorProvider.ts 应使用 createMessageHandler', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes('createMessageHandler('), 'customEditorProvider 应调用 createMessageHandler');
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

    test('BT-custom-editor.20 webview/index.html 应包含 btnRefresh 及 SVG 图标', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(content.includes('btnRefresh'), 'index.html 应包含 btnRefresh');
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
        const whPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const whContent = fs.readFileSync(whPath, 'utf-8');
        assert.ok(!whContent.includes("'getFiles'"), 'webviewHelper.ts 不应处理 getFiles 消息');
    });

    test('BT-custom-editor.25 webview/css/style.css 不应包含 .file-selector-group 样式', () => {
        const cssPath = path.join(projectRoot, 'webview', 'css', 'style.css');
        const content = fs.readFileSync(cssPath, 'utf-8');
        assert.ok(!content.includes('.file-selector-group'), 'style.css 不应包含 .file-selector-group');
    });

    // ===== BT-custom-editor.26~28：防止 updateFileSelectHighlight 死代码复活
    // （曾导致 "Cannot read properties of null (reading 'options')" 打不开文件）=====

    test('BT-custom-editor.26 webview/js/app.js 不应包含 updateFileSelectHighlight 函数定义', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(
            !content.includes('function updateFileSelectHighlight'),
            'app.js 不应包含 updateFileSelectHighlight 函数定义（fileSelect DOM 已移除）'
        );
        assert.ok(
            !content.includes('updateFileSelectHighlight('),
            'app.js 不应调用 updateFileSelectHighlight（会访问不存在的 fileSelect.options 引发 TypeError）'
        );
    });

    test('BT-custom-editor.27 webview/js/app.js 不应对已移除的 fileSelect DOM 执行 getElementById', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(
            !/getElementById\(\s*['"]fileSelect['"]\s*\)/.test(content),
            'app.js 不应 getElementById("fileSelect") —— 该元素在 add-custom-editor-provider 中已移除，访问其 .options 会抛 null 引用错误'
        );
    });

    test('BT-custom-editor.28 webview/dist/app.bundle.js 不应包含 updateFileSelectHighlight（编译产物同步）', () => {
        const bundlePath = path.join(projectRoot, 'webview', 'dist', 'app.bundle.js');
        if (!fs.existsSync(bundlePath)) {
            // 未编译环境跳过（compile 阶段会生成产物）
            return;
        }
        const content = fs.readFileSync(bundlePath, 'utf-8');
        assert.ok(
            !content.includes('updateFileSelectHighlight'),
            'app.bundle.js 不应包含 updateFileSelectHighlight —— 确保源码清理后 esbuild 产物同步更新'
        );
    });

    // ===== 右键菜单恢复（openWithReview 命令） =====

    test('BT-custom-editor.T1.29 Tier1 — package.json 应注册 mdReview.openWithReview 命令', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const cmds = pkg.contributes.commands.map((c: any) => c.command);
        assert.ok(cmds.includes('mdReview.openWithReview'),
            'commands 应包含 mdReview.openWithReview');
    });

    test('BT-custom-editor.T1.30 Tier1 — package.json menus 应包含 explorer/context 和 editor/context', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const menus = pkg.contributes.menus;
        assert.ok(menus['explorer/context'], 'menus 应包含 explorer/context');
        assert.ok(menus['editor/context'], 'menus 应包含 editor/context');
        assert.ok(menus['editor/title'], 'menus 应包含 editor/title');
        assert.ok(menus['editor/title/context'], 'menus 应包含 editor/title/context');
    });

    test('BT-custom-editor.T1.31 Tier1 — extension.ts 应注册 openWithReview 命令', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'extension.ts'), 'utf-8');
        assert.ok(content.includes("'mdReview.openWithReview'"),
            'extension.ts 应注册 mdReview.openWithReview 命令');
    });

    test('BT-custom-editor.T1.32 Tier1 — i18n 应包含 openWithReview 中英文翻译', () => {
        const nlsEn = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.nls.json'), 'utf-8'));
        const nlsZh = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.nls.zh-cn.json'), 'utf-8'));
        assert.ok(nlsEn['command.openWithReview'], 'package.nls.json 应包含 command.openWithReview');
        assert.ok(nlsZh['command.openWithReview'], 'package.nls.zh-cn.json 应包含 command.openWithReview');
    });

    test('BT-custom-editor.29 Tier3 — 右键菜单项应指向 openWithReview 而非已移除的 openPanel', () => {
        const pkgPath = path.join(projectRoot, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const menus = pkg.contributes.menus;
        // 所有菜单位置的命令都应为 openWithReview
        for (const location of ['explorer/context', 'editor/context', 'editor/title', 'editor/title/context']) {
            const items = menus[location];
            assert.ok(Array.isArray(items) && items.length > 0, `${location} 应有菜单项`);
            for (const item of items) {
                assert.strictEqual(item.command, 'mdReview.openWithReview',
                    `${location} 菜单项应指向 mdReview.openWithReview，而非 ${item.command}`);
            }
        }
        // 确保不引用已移除的 openPanel
        const pkgStr = JSON.stringify(pkg);
        assert.ok(!pkgStr.includes('mdReview.openPanel'),
            'package.json 不应引用已移除的 mdReview.openPanel 命令');
    });

    test('BT-custom-editor.30 Tier3 — openWithReview 命令实现应使用 vscode.openWith 打开 Custom Editor', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'extension.ts'), 'utf-8');
        assert.ok(content.includes('vscode.openWith'),
            'openWithReview 命令应调用 vscode.openWith');
        assert.ok(content.includes('mdReview.markdownEditor'),
            'openWithReview 命令应指定 mdReview.markdownEditor viewType');
    });
});
