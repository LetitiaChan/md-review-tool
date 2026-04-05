import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('开始运行测试');

    // 在所有测试前先手动激活扩展
    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    // ===== 扩展激活 =====

    test('扩展应该被成功激活', async () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext, '扩展应该存在');
        assert.ok(ext!.isActive, '扩展应该已激活');
    });

    // ===== 命令注册 =====

    test('openPanel 命令应该被注册', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('mdReview.openPanel'), 'mdReview.openPanel 命令应该已注册');
    });

    test('exportReview 命令应该被注册', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('mdReview.exportReview'), 'mdReview.exportReview 命令应该已注册');
    });

    // ===== 扩展元信息 =====

    test('扩展 ID 应该正确', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        assert.strictEqual(ext!.id, 'letitia.md-human-review');
    });

    test('package.json 应包含正确的 displayName', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        assert.strictEqual(ext!.packageJSON.displayName, 'MD Human Review');
    });

    test('package.json 应包含正确的 main 入口', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        assert.strictEqual(ext!.packageJSON.main, './out/extension.js');
    });

    // ===== 配置项 =====

    test('mdReview 配置应有默认的 fontSize', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        const fontSize = config.get<number>('fontSize');
        assert.strictEqual(fontSize, 16, '默认字体大小应为 16');
    });

    test('mdReview 配置应有默认的 lineHeight', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        const lineHeight = config.get<number>('lineHeight');
        assert.strictEqual(lineHeight, 1.6, '默认行高应为 1.6');
    });

    test('mdReview 配置应有默认的 theme', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        const theme = config.get<string>('theme');
        assert.strictEqual(theme, 'light', '默认主题应为 light');
    });

    test('mdReview 配置应有默认的 contentMaxWidth', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        const maxWidth = config.get<number>('contentMaxWidth');
        assert.strictEqual(maxWidth, 1200, '默认最大宽度应为 1200');
    });

    test('mdReview 配置应有默认的 autoSave', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        const autoSave = config.get<boolean>('autoSave');
        assert.strictEqual(autoSave, true, '默认应启用自动保存');
    });

    test('mdReview 配置应有默认的 autoSaveDelay', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        const delay = config.get<number>('autoSaveDelay');
        assert.strictEqual(delay, 1500, '默认自动保存延迟应为 1500ms');
    });

    test('mdReview 配置应有默认的 showToc', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<boolean>('showToc'), true, '默认应显示目录');
    });

    test('mdReview 配置应有默认的 showAnnotations', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<boolean>('showAnnotations'), true, '默认应显示批注');
    });

    test('mdReview 配置应有默认的 enableMermaid', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<boolean>('enableMermaid'), true, '默认应启用 Mermaid');
    });

    test('mdReview 配置应有默认的 enableMath', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<boolean>('enableMath'), true, '默认应启用数学公式');
    });

    test('mdReview 配置应有默认的 enablePlantUML', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<boolean>('enablePlantUML'), true, '默认应启用 PlantUML');
    });

    test('mdReview 配置应有默认的 enableGraphviz', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<boolean>('enableGraphviz'), true, '默认应启用 Graphviz');
    });

    test('mdReview 配置应有默认的 sidebarLayout', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<string>('sidebarLayout'), 'toc-left', '默认侧边栏布局应为 toc-left');
    });

    test('mdReview 配置应有默认的 codeTheme', () => {
        const config = vscode.workspace.getConfiguration('mdReview');
        assert.strictEqual(config.get<string>('codeTheme'), 'default-dark-modern', '默认代码主题应为 default-dark-modern');
    });

    // ===== contributes 验证 =====

    test('扩展应注册 mdc 语言', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        const languages = ext!.packageJSON.contributes.languages;
        assert.ok(Array.isArray(languages), '应有 languages 配置');
        const mdc = languages.find((l: any) => l.id === 'mdc');
        assert.ok(mdc, '应注册 mdc 语言');
        assert.ok(mdc.extensions.includes('.mdc'), 'mdc 语言应关联 .mdc 扩展名');
    });

    test('扩展应注册 mdc 语法', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        const grammars = ext!.packageJSON.contributes.grammars;
        assert.ok(Array.isArray(grammars), '应有 grammars 配置');
        const mdcGrammar = grammars.find((g: any) => g.language === 'mdc');
        assert.ok(mdcGrammar, '应注册 mdc 语法');
        assert.strictEqual(mdcGrammar.scopeName, 'text.html.mdc');
    });

    test('扩展应注册快捷键绑定', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        const keybindings = ext!.packageJSON.contributes.keybindings;
        assert.ok(Array.isArray(keybindings), '应有 keybindings 配置');
        const exportBinding = keybindings.find((k: any) => k.command === 'mdReview.exportReview');
        assert.ok(exportBinding, '应有导出批阅的快捷键');
        assert.strictEqual(exportBinding.key, 'ctrl+e');
    });
});
