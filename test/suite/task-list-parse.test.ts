/**
 * 回归测试：Task List 解析 — 编辑模式下 - [ ] 任务列表不应变成转义字符
 *
 * 验证 pm-markdown-bridge.js 中的 taskListPlugin 正确识别 task list，
 * 使得 list_item 的 checked 属性被正确设置，序列化时不会将 [ ] 转义为 \[ \]。
 */
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

suite('Hotfix — Task List 解析不转义', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    // ===== Tier 1 — 存在性断言 =====

    test('BT-TaskListParse.T1.1 Tier1 — pm-markdown-bridge.js 应包含 taskListPlugin 函数', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        assert.ok(src.includes('taskListPlugin'), 'pm-markdown-bridge.js 应定义 taskListPlugin');
        assert.ok(src.includes("md.use(taskListPlugin)"), 'taskListPlugin 应被注册到 markdown-it');
    });

    test('BT-TaskListParse.T1.2 Tier1 — parser 配置中 list_item 应有 getAttrs', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        // 验证 list_item 配置包含 getAttrs
        const listItemIdx = src.indexOf("list_item:");
        const listItemSection = src.substring(listItemIdx, listItemIdx + 200);
        assert.ok(listItemSection.includes('getAttrs'), 'list_item parser 配置应包含 getAttrs');
        assert.ok(listItemSection.includes('checked'), 'list_item getAttrs 应读取 checked 属性');
    });

    test('BT-TaskListParse.T1.3 Tier1 — pm.bundle.js 应包含 taskListPlugin 逻辑', () => {
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('task_list'), 'pm.bundle.js 应包含 task_list core rule');
        assert.ok(bundle.includes('list_item_open'), 'pm.bundle.js 应包含 list_item_open token 检测');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-TaskListParse.1 Tier3 — taskListPlugin 应识别 [ ] 前缀并设置 meta.checked = false', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        // 验证正则匹配 [ ] 和 [x]
        assert.ok(src.includes(String.raw`/^\[([ xX])\]\s?/`), 'taskListPlugin 应使用正则匹配 [ ]/[x]/[X] 前缀');
    });

    test('BT-TaskListParse.2 Tier3 — taskListPlugin 应从 inline content 中移除 checkbox 前缀', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        // 验证移除前缀逻辑
        assert.ok(src.includes('content.slice(taskMatch[0].length)'), 'taskListPlugin 应从 content 中 slice 掉 checkbox 前缀');
    });

    test('BT-TaskListParse.3 Tier3 — taskListPlugin 应同时更新 children token', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        // 验证 children 更新逻辑
        assert.ok(src.includes('tokens[j].children'), 'taskListPlugin 应处理 children 数组');
        assert.ok(src.includes('firstChild.content.slice'), 'taskListPlugin 应更新 firstChild 的 content');
    });

    test('BT-TaskListParse.4 Tier3 — serializer list_item 应根据 checked 属性输出 [ ] 或 [x]', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        // 验证序列化器正确输出 checkbox
        const listItemSerIdx = src.indexOf("list_item(state, node)");
        const listItemSerSection = src.substring(listItemSerIdx, listItemSerIdx + 300);
        assert.ok(listItemSerSection.includes('[x] '), 'list_item 序列化器应输出 [x] ');
        assert.ok(listItemSerSection.includes('[ ] '), 'list_item 序列化器应输出 [ ] ');
        assert.ok(listItemSerSection.includes('checked !== null'), 'list_item 序列化器应检查 checked !== null');
    });

    test('BT-TaskListParse.5 Tier3 — list_item getAttrs 应在 meta 无 checked 时返回 null', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
        // 验证 getAttrs 的 fallback 逻辑
        const listItemCfg = src.substring(src.indexOf("list_item:"), src.indexOf("list_item:") + 200);
        assert.ok(listItemCfg.includes('null'), 'list_item getAttrs 应在无 checked 时返回 null');
    });
});
