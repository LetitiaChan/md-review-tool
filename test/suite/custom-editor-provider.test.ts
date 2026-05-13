import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Custom Editor Provider + Shared Webview Helper 测试
 * 
 * 三层测试模型：
 * - Tier 1: 存在性断言（文件存在、导出存在、package.json 配置正确）
 * - Tier 2: 行为级断言（模块导入、函数调用）
 * - Tier 3: 任务特定断言（Custom Editor 注册、文件列表移除验证）
 * - Integration: 真正通过 vscode.openWith 打开 md 文件，验证 Custom Editor 实际工作
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

    // ===== Hotfix: 文件已更新徽章闪烁 + 刷新无法消除 =====

    test('BT-custom-editor.T1.33 Tier1 — customEditorProvider.ts 应包含 _suppressFileChanged 标志位', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        assert.ok(content.includes('_suppressFileChanged'),
            'customEditorProvider.ts 应定义 _suppressFileChanged 标志位');
    });

    test('BT-custom-editor.T1.34 Tier1 — app.js refreshFromDisk 应调用 hideFileChangeBadge', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(content.includes('hideFileChangeBadge()'),
            'app.js 应在 refreshFromDisk 中调用 hideFileChangeBadge()');
    });

    test('BT-custom-editor.31 Tier3 — fileWatcher.onDidChange 应检查 _suppressFileChanged 后再发送 fileChanged', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        const watcherIdx = content.indexOf('fileWatcher.onDidChange');
        assert.ok(watcherIdx > -1, 'customEditorProvider.ts 应包含 fileWatcher.onDidChange');
        const watcherBlock = content.substring(watcherIdx, watcherIdx + 300);
        assert.ok(watcherBlock.includes('_suppressFileChanged'),
            'fileWatcher.onDidChange 回调应检查 _suppressFileChanged 标志位');
    });

    test('BT-custom-editor.32 Tier3 — saveFileImpl 应在 applyEdit 前设置 _suppressFileChanged = true', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'customEditorProvider.ts'), 'utf-8');
        const saveIdx = content.indexOf('saveFileImpl');
        assert.ok(saveIdx > -1, 'customEditorProvider.ts 应包含 saveFileImpl');
        const saveBlock = content.substring(saveIdx, saveIdx + 1000);
        const suppressIdx = saveBlock.indexOf('_suppressFileChanged = true');
        const applyIdx = saveBlock.indexOf('applyEdit');
        assert.ok(suppressIdx > -1, 'saveFileImpl 应设置 _suppressFileChanged = true');
        assert.ok(applyIdx > -1, 'saveFileImpl 应调用 applyEdit');
        assert.ok(suppressIdx < applyIdx,
            '_suppressFileChanged = true 应在 applyEdit 之前设置');
    });

    test('BT-custom-editor.33 Tier3 — refreshFromDisk 中 hideFileChangeBadge 应在 loadDocument 之后调用', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'webview', 'js', 'app.js'), 'utf-8');
        const refreshIdx = content.indexOf('async function refreshFromDisk');
        assert.ok(refreshIdx > -1, 'app.js 应包含 refreshFromDisk 函数');
        const refreshBlock = content.substring(refreshIdx, refreshIdx + 2000);
        const loadDocIdx = refreshBlock.indexOf('loadDocument(');
        const hideIdx = refreshBlock.indexOf('hideFileChangeBadge()');
        assert.ok(loadDocIdx > -1, 'refreshFromDisk 应调用 loadDocument');
        assert.ok(hideIdx > -1, 'refreshFromDisk 应调用 hideFileChangeBadge');
        assert.ok(hideIdx > loadDocIdx,
            'hideFileChangeBadge 应在 loadDocument 之后调用');
    });

    // ===== Integration: 真正通过 VS Code API 打开 md 文件，验证 Custom Editor 实际工作 =====

    suite('Integration — 通过 vscode.openWith 打开 md 文件', () => {
        const testIntegrationDir = path.join(projectRoot, '.test-custom-editor-integration');
        let testFilePath: string;

        suiteSetup(async () => {
            // 确保扩展已激活
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            if (ext && !ext.isActive) {
                await ext.activate();
            }
            // 创建临时测试目录
            if (!fs.existsSync(testIntegrationDir)) {
                fs.mkdirSync(testIntegrationDir, { recursive: true });
            }
        });

        suiteTeardown(async () => {
            // 关闭所有编辑器
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await new Promise(resolve => setTimeout(resolve, 300));
            // 清理临时目录
            if (fs.existsSync(testIntegrationDir)) {
                fs.rmSync(testIntegrationDir, { recursive: true, force: true });
            }
        });

        setup(() => {
            testFilePath = path.join(testIntegrationDir, 'integration-test.md');
            fs.writeFileSync(testFilePath, [
                '# 集成测试文档',
                '',
                '**文档版本**：v1.0.0',
                '',
                '## 概述',
                '',
                '这是一份用于集成测试的 Markdown 文档。',
                '',
                '## 详细内容',
                '',
                '- 列表项 1',
                '- 列表项 2',
                '- 列表项 3',
                '',
                '## 总结',
                '',
                '测试完成。'
            ].join('\n'), 'utf-8');
        });

        teardown(async () => {
            // 每个测试后关闭所有编辑器
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await new Promise(resolve => setTimeout(resolve, 300));
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });

        test('BT-custom-editor.INT.1 vscode.openWith 应成功打开 md 文件为 Custom Editor', async () => {
            const uri = vscode.Uri.file(testFilePath);

            // 通过 vscode.openWith 命令打开文件
            await vscode.commands.executeCommand('vscode.openWith', uri, 'mdReview.markdownEditor');
            // 等待 Custom Editor 初始化
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 验证：当前活跃编辑器的 tab 应该存在
            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            assert.ok(activeTab, '应有活跃的 tab');
            assert.ok(activeTab!.label.includes('integration-test.md'),
                `活跃 tab 的标签应包含文件名，实际为: ${activeTab!.label}`);
        });

        test('BT-custom-editor.INT.2 Custom Editor 打开后 tab 的 input 应为 CustomEditorTabInput', async () => {
            const uri = vscode.Uri.file(testFilePath);

            await vscode.commands.executeCommand('vscode.openWith', uri, 'mdReview.markdownEditor');
            await new Promise(resolve => setTimeout(resolve, 1500));

            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            assert.ok(activeTab, '应有活跃的 tab');

            // TabInputCustom 表示这是一个 Custom Editor（而非普通文本编辑器）
            const input = activeTab!.input;
            assert.ok(input instanceof vscode.TabInputCustom,
                `tab input 应为 TabInputCustom 类型，实际为: ${input?.constructor?.name}`);

            // 验证 viewType 正确
            if (input instanceof vscode.TabInputCustom) {
                assert.strictEqual(input.viewType, 'mdReview.markdownEditor',
                    'Custom Editor 的 viewType 应为 mdReview.markdownEditor');
                assert.strictEqual(input.uri.fsPath, uri.fsPath,
                    'Custom Editor 打开的文件路径应与请求的路径一致');
            }
        });

        test('BT-custom-editor.INT.3 openWithReview 命令应能打开 md 文件为 Custom Editor', async () => {
            const uri = vscode.Uri.file(testFilePath);

            // 使用扩展自定义的 openWithReview 命令
            await vscode.commands.executeCommand('mdReview.openWithReview', uri);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            assert.ok(activeTab, '应有活跃的 tab');

            const input = activeTab!.input;
            assert.ok(input instanceof vscode.TabInputCustom,
                `openWithReview 命令应打开 Custom Editor，实际 tab input 类型: ${input?.constructor?.name}`);
        });

        test('BT-custom-editor.INT.4 同时打开多个 md 文件应各自独立', async () => {
            // 创建第二个测试文件
            const testFilePath2 = path.join(testIntegrationDir, 'integration-test-2.md');
            fs.writeFileSync(testFilePath2, '# 第二个测试文档\n\n内容。\n', 'utf-8');

            try {
                const uri1 = vscode.Uri.file(testFilePath);
                const uri2 = vscode.Uri.file(testFilePath2);

                // 打开两个文件
                await vscode.commands.executeCommand('vscode.openWith', uri1, 'mdReview.markdownEditor');
                await new Promise(resolve => setTimeout(resolve, 1000));
                await vscode.commands.executeCommand('vscode.openWith', uri2, 'mdReview.markdownEditor');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 验证：应有至少 2 个 tab
                const tabs = vscode.window.tabGroups.activeTabGroup.tabs;
                const customEditorTabs = tabs.filter(t => t.input instanceof vscode.TabInputCustom);
                assert.ok(customEditorTabs.length >= 2,
                    `应有至少 2 个 Custom Editor tab，实际: ${customEditorTabs.length}`);

                // 验证两个 tab 的文件路径不同
                const paths = customEditorTabs
                    .map(t => (t.input as vscode.TabInputCustom).uri.fsPath);
                assert.ok(paths.includes(uri1.fsPath), '应包含第一个文件');
                assert.ok(paths.includes(uri2.fsPath), '应包含第二个文件');
            } finally {
                if (fs.existsSync(testFilePath2)) {
                    fs.unlinkSync(testFilePath2);
                }
            }
        });

        test('BT-custom-editor.INT.5 打开 .mdc 文件也应使用 Custom Editor', async () => {
            const mdcFilePath = path.join(testIntegrationDir, 'test.mdc');
            fs.writeFileSync(mdcFilePath, '# MDC 测试\n\n内容。\n', 'utf-8');

            try {
                const uri = vscode.Uri.file(mdcFilePath);
                await vscode.commands.executeCommand('vscode.openWith', uri, 'mdReview.markdownEditor');
                await new Promise(resolve => setTimeout(resolve, 1500));

                const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
                assert.ok(activeTab, '应有活跃的 tab');
                const input = activeTab!.input;
                assert.ok(input instanceof vscode.TabInputCustom,
                    '.mdc 文件应能通过 Custom Editor 打开');
            } finally {
                if (fs.existsSync(mdcFilePath)) {
                    fs.unlinkSync(mdcFilePath);
                }
            }
        });
    });
});
