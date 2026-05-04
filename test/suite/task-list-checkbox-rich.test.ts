/**
 * 回归测试：Task List Checkbox — Rich Mode 编辑器中任务列表 checkbox 渲染与交互
 *
 * 验证 pm-schema.js 的 list_item.toDOM 正确渲染 checkbox，
 * pm.entry.js 的 list_item NodeView 支持点击切换 checked 状态。
 */
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

suite('Hotfix — Task List Checkbox Rich Mode 渲染', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    // ===== Tier 1 — 存在性断言 =====

    test('BT-TaskListCheckbox.T1.1 Tier1 — pm-schema.js list_item toDOM 应包含 checkbox 结构', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-schema.js'), 'utf-8');
        assert.ok(src.includes('task-list-checkbox'), 'list_item toDOM 应输出 task-list-checkbox class');
        assert.ok(src.includes('task-list-content'), 'list_item toDOM 应输出 task-list-content 容器');
    });

    test('BT-TaskListCheckbox.T1.2 Tier1 — pm.entry.js 应包含 list_item NodeView', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('list_item(node, view, getPos)'), 'pm.entry.js 应定义 list_item NodeView');
    });

    test('BT-TaskListCheckbox.T1.3 Tier1 — pm.bundle.js 应包含 task-list-checkbox 渲染逻辑', () => {
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('task-list-checkbox'), 'pm.bundle.js 应包含 task-list-checkbox');
        assert.ok(bundle.includes('task-list-content'), 'pm.bundle.js 应包含 task-list-content');
    });

    test('BT-TaskListCheckbox.T1.4 Tier1 — markdown.css 应包含 Rich Mode 任务列表样式', () => {
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('#richModeContainer .ProseMirror .task-list-item'), 'CSS 应包含 Rich Mode 任务列表样式');
        assert.ok(css.includes('#richModeContainer .ProseMirror .task-list-item .task-list-checkbox'), 'CSS 应包含 Rich Mode checkbox 样式');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-TaskListCheckbox.1 Tier3 — NodeView 在 checked=null 时应返回 undefined（不使用自定义渲染）', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // NodeView 应检查 checked === null 并返回 undefined
        const nodeViewIdx = src.indexOf('list_item(node, view, getPos)');
        const nodeViewSection = src.substring(nodeViewIdx, nodeViewIdx + 200);
        assert.ok(nodeViewSection.includes('checked === null'), 'NodeView 应检查 checked === null');
        assert.ok(nodeViewSection.includes('return undefined'), 'checked=null 时应返回 undefined');
    });

    test('BT-TaskListCheckbox.2 Tier3 — NodeView 应通过 setNodeMarkup 切换 checked 状态', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const nodeViewIdx = src.indexOf('list_item(node, view, getPos)');
        const nodeViewSection = src.substring(nodeViewIdx, nodeViewIdx + 1200);
        assert.ok(nodeViewSection.includes('setNodeMarkup'), 'NodeView 应使用 setNodeMarkup 更新 checked');
        assert.ok(nodeViewSection.includes('!currentChecked'), 'NodeView 应切换 checked 值');
    });

    test('BT-TaskListCheckbox.3 Tier3 — NodeView update 方法应同步 checkbox 状态和 DOM class', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const nodeViewIdx = src.indexOf('list_item(node, view, getPos)');
        const nodeViewSection = src.substring(nodeViewIdx, nodeViewIdx + 2000);
        assert.ok(nodeViewSection.includes('update(updatedNode)'), 'NodeView 应实现 update 方法');
        assert.ok(nodeViewSection.includes('checkbox.checked = updatedNode.attrs.checked'), 'update 应同步 checkbox.checked');
        assert.ok(nodeViewSection.includes("classList.toggle('checked'"), 'update 应切换 DOM class');
    });

    test('BT-TaskListCheckbox.4 Tier3 — toDOM 在 checked=true 时应输出 checked 属性', () => {
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-schema.js'), 'utf-8');
        // 直接在整个文件中搜索 checkboxAttrs.checked
        assert.ok(src.includes("checkboxAttrs.checked"), 'pm-schema.js 应包含 checkboxAttrs.checked 赋值');
        assert.ok(src.includes("'checked'"), 'toDOM 应设置 checked 属性值');
    });

    test('BT-TaskListCheckbox.5 Tier3 — CSS 应包含 checkbox :checked 伪类样式（勾选标记）', () => {
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.task-list-checkbox:checked::after'), 'CSS 应包含 checkbox :checked::after 伪元素（勾选标记）');
        assert.ok(css.includes('.task-list-checkbox:checked'), 'CSS 应包含 checkbox :checked 样式');
    });
});
