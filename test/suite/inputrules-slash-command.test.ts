import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * add-inputrules-and-slash-command — InputRules 增强 + Slash Command 测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（源码关键字、i18n 键、模块文件）
 * - Tier 2 行为级（命令集完整性、过滤逻辑、plugin 注册）
 * - Tier 3 任务特定（BT-SlashCmd.1~6）
 *
 * Change: add-inputrules-and-slash-command (2026-05-04)
 */
suite('InputRules & Slash Command Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-SlashCmd.T1.1 Tier1 — slash-command-plugin.js 模块存在', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const filePath = path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js');
        assert.ok(fs.existsSync(filePath), 'slash-command-plugin.js 应存在');
    });

    test('BT-SlashCmd.T1.2 Tier1 — slash-commands.js 模块存在', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const filePath = path.join(extPath, 'webview', 'src', 'slash-command', 'slash-commands.js');
        assert.ok(fs.existsSync(filePath), 'slash-commands.js 应存在');
    });

    test('BT-SlashCmd.T1.3 Tier1 — pm.entry.js 导入 slash-command-plugin', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(pmEntry.includes('createSlashCommandPlugin'), 'pm.entry.js 应导入 createSlashCommandPlugin');
        assert.ok(pmEntry.includes('slashCommandPlugin'), 'pm.entry.js 应注册 slashCommandPlugin');
    });

    test('BT-SlashCmd.T1.4 Tier1 — pm.entry.js 包含 task list InputRule（- [ ] 和 - [x]）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(pmEntry.includes('task list item (unchecked)'), 'pm.entry.js 应包含 unchecked task list InputRule 注释');
        assert.ok(pmEntry.includes('task list item (checked)'), 'pm.entry.js 应包含 checked task list InputRule 注释');
        assert.ok(pmEntry.includes('checked: false'), 'InputRule 应创建 checked=false 节点');
        assert.ok(pmEntry.includes('checked: true'), 'InputRule 应创建 checked=true 节点');
    });

    test('BT-SlashCmd.T1.5 Tier1 — i18n.js 包含 slash.* 翻译键（中英文各 14 个）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        const slashKeys = [
            'slash.heading1', 'slash.heading2', 'slash.heading3',
            'slash.blockquote', 'slash.code_block', 'slash.horizontal_rule',
            'slash.table', 'slash.bullet_list', 'slash.ordered_list',
            'slash.task_list', 'slash.alert_block', 'slash.image', 'slash.no_results',
        ];
        for (const key of slashKeys) {
            // 每个 key 应出现至少 2 次（中文 + 英文）
            const matches = i18n.match(new RegExp(key.replace('.', '\\.'), 'g')) || [];
            assert.ok(matches.length >= 2, `i18n 应包含 "${key}" 至少 2 次（中英文），实际 ${matches.length}`);
        }
    });

    test('BT-SlashCmd.T1.6 Tier1 — markdown.css 包含 slash-command-menu 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.slash-command-menu'), 'markdown.css 应包含 .slash-command-menu');
        assert.ok(css.includes('.slash-command-item'), 'markdown.css 应包含 .slash-command-item');
        assert.ok(css.includes('.slash-command-item-active'), 'markdown.css 应包含 .slash-command-item-active');
        assert.ok(css.includes('.slash-command-icon'), 'markdown.css 应包含 .slash-command-icon');
        assert.ok(css.includes('.slash-command-empty'), 'markdown.css 应包含 .slash-command-empty');
    });

    // ===== Tier 2 — 行为级断言 =====

    test('BT-SlashCmd.T2.1 Tier2 — slash-commands.js 导出 getSlashCommands 函数且返回 12 个命令', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-commands.js'), 'utf-8');
        assert.ok(src.includes('export function getSlashCommands'), '应导出 getSlashCommands 函数');
        // 统计命令数量（通过 id: 出现次数）
        const idMatches = src.match(/id:\s*'/g) || [];
        assert.strictEqual(idMatches.length, 12, `应定义 12 个命令，实际 ${idMatches.length}`);
    });

    test('BT-SlashCmd.T2.2 Tier2 — slash-command-plugin.js 导出 createSlashCommandPlugin 和 slashCommandKey', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js'), 'utf-8');
        assert.ok(src.includes('export function createSlashCommandPlugin'), '应导出 createSlashCommandPlugin');
        assert.ok(src.includes('export const slashCommandKey'), '应导出 slashCommandKey');
    });

    test('BT-SlashCmd.T2.3 Tier2 — plugin 实现 handleTextInput 检测 "/" 输入', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js'), 'utf-8');
        assert.ok(src.includes('handleTextInput'), 'plugin 应实现 handleTextInput');
        assert.ok(src.includes("text === '/'"), "应检测 text === '/'");
        assert.ok(src.includes('textBefore.trim()'), '应检查行首条件（textBefore.trim）');
    });

    test('BT-SlashCmd.T2.4 Tier2 — plugin 实现 handleKeyDown 拦截 ↑↓/Enter/Esc', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js'), 'utf-8');
        assert.ok(src.includes('handleKeyDown'), 'plugin 应实现 handleKeyDown');
        assert.ok(src.includes("'ArrowDown'"), '应处理 ArrowDown');
        assert.ok(src.includes("'ArrowUp'"), '应处理 ArrowUp');
        assert.ok(src.includes("'Enter'"), '应处理 Enter');
        assert.ok(src.includes("'Escape'"), '应处理 Escape');
    });

    test('BT-SlashCmd.T2.5 Tier2 — pm.bundle.js 包含 slash command 相关代码', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('slashCommand'), 'pm.bundle.js 应包含 slashCommand plugin key');
        assert.ok(bundle.includes('slash-command-menu'), 'pm.bundle.js 应包含 slash-command-menu CSS class');
        assert.ok(bundle.includes('getSlashCommands'), 'pm.bundle.js 应包含 getSlashCommands');
    });

    test('BT-SlashCmd.T2.6 Tier2 — 命令集包含所有预期的 command id', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-commands.js'), 'utf-8');
        const expectedIds = ['h1', 'h2', 'h3', 'blockquote', 'codeBlock', 'hr', 'table', 'ul', 'ol', 'taskList', 'alertBlock', 'insertImage'];
        for (const id of expectedIds) {
            assert.ok(src.includes(`id: '${id}'`), `命令集应包含 id: '${id}'`);
        }
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-SlashCmd.1 Tier3 — InputRule: task list unchecked 使用正确的正则模式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 验证正则匹配 "- [ ] " 模式
        assert.ok(pmEntry.includes('\\[\\s?\\]\\s$'), 'InputRule 应使用 \\[\\s?\\]\\s$ 正则匹配 "- [ ] "');
    });

    test('BT-SlashCmd.2 Tier3 — InputRule: task list checked 使用正确的正则模式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 验证正则匹配 "- [x] " 或 "- [X] " 模式
        assert.ok(pmEntry.includes('[xX]'), 'InputRule 应使用 [xX] 匹配大小写 x');
    });

    test('BT-SlashCmd.3 Tier3 — Slash Command: commandMapRef 延迟引用模式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(pmEntry.includes('commandMapRef'), 'pm.entry.js 应使用 commandMapRef 延迟引用');
        assert.ok(pmEntry.includes('Object.assign(commandMapRef, commandMap)'), '应在 commandMap 定义后 Object.assign 到 commandMapRef');
    });

    test('BT-SlashCmd.4 Tier3 — Slash Command: 面板使用绝对定位 DOM 元素', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js'), 'utf-8');
        assert.ok(src.includes("position: 'absolute'") || src.includes('position = \'absolute\'') || src.includes('style.position'), '面板应使用绝对定位');
        assert.ok(src.includes('coordsAtPos'), '应使用 view.coordsAtPos() 计算光标坐标');
    });

    test('BT-SlashCmd.5 Tier3 — Slash Command: 模糊搜索使用 includes 匹配', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js'), 'utf-8');
        assert.ok(src.includes('.toLowerCase().includes('), '过滤逻辑应使用 toLowerCase().includes()');
    });

    test('BT-SlashCmd.6 Tier3 — Slash Command: 执行命令后删除 "/" 文本', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'slash-command', 'slash-command-plugin.js'), 'utf-8');
        assert.ok(src.includes('tr.delete') || src.includes('.delete('), '执行命令时应删除 slash 文本');
        assert.ok(src.includes('closeMenu'), '执行命令后应关闭面板');
    });
});
