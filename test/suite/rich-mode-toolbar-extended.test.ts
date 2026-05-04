import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Rich Mode Toolbar Extended Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-ToolbarExt.1 Tier1 — pm.entry.js 应包含所有 13 个新命令', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const commands = ['code:', 'highlight:', 'textColor:', 'taskList:', 'link:', 'insertImage:', 'alertBlock:', 'codeBlock:', 'insertTable:', 'insertMermaid:', 'insertEmoji:', 'insertPlantuml:', 'insertGraphviz:'];
        for (const cmd of commands) {
            assert.ok(src.includes(cmd), `pm.entry.js 应包含命令 ${cmd}`);
        }
    });

    test('BT-ToolbarExt.2 Tier1 — index.html 应包含所有新工具栏按钮', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        const cmds = ['data-cmd="code"', 'data-cmd="textColor"', 'data-cmd="highlight"', 'data-cmd="taskList"', 'data-cmd="link"', 'data-cmd="insertImage"', 'data-cmd="insertTable"', 'data-cmd="alertBlock"', 'data-cmd="codeBlock"', 'data-cmd="insertMermaid"', 'data-cmd="insertPlantuml"', 'data-cmd="insertGraphviz"', 'data-cmd="insertEmoji"'];
        for (const cmd of cmds) {
            assert.ok(html.includes(cmd), `index.html 应包含 ${cmd}`);
        }
    });

    test('BT-ToolbarExt.3 Tier1 — index.html 应包含颜色/链接/图片/emoji popover', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="colorPopover"'), '应包含颜色 popover');
        assert.ok(html.includes('id="linkPopover"'), '应包含链接 popover');
        assert.ok(html.includes('id="imagePopover"'), '应包含图片 popover');
        assert.ok(html.includes('id="emojiPopover"'), '应包含 emoji popover');
    });

    test('BT-ToolbarExt.4 Tier1 — CSS 应包含 popover 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.toolbar-popover'), 'CSS 应包含 .toolbar-popover');
        assert.ok(css.includes('.color-popover'), 'CSS 应包含 .color-popover');
        assert.ok(css.includes('.emoji-popover'), 'CSS 应包含 .emoji-popover');
        assert.ok(css.includes('.link-popover'), 'CSS 应包含 .link-popover');
        assert.ok(css.includes('.image-popover'), 'CSS 应包含 .image-popover');
    });

    test('BT-ToolbarExt.5 Tier1 — i18n 应包含所有新按钮翻译键', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        const keys = ['editor.code_title', 'editor.color_title', 'editor.highlight_title', 'editor.task_list_title', 'editor.link_title', 'editor.image_title', 'editor.alert_title', 'editor.code_block_title', 'editor.table_title', 'editor.mermaid_title', 'editor.emoji_title', 'editor.plantuml_title', 'editor.graphviz_title'];
        for (const key of keys) {
            assert.ok(i18n.includes(key), `i18n 应包含翻译键 ${key}`);
        }
    });

    // ===== Tier 2 — 行为级断言 =====

    test('BT-ToolbarExt.6 Tier2 — app.js 应包含 popover 切换逻辑', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('toggleToolbarPopover'), 'bundle 应包含 toggleToolbarPopover');
        assert.ok(bundle.includes('closeAllPopovers'), 'bundle 应包含 closeAllPopovers');
        assert.ok(bundle.includes('setupColorPopover'), 'bundle 应包含 setupColorPopover');
        assert.ok(bundle.includes('setupLinkPopover'), 'bundle 应包含 setupLinkPopover');
        assert.ok(bundle.includes('setupImagePopover'), 'bundle 应包含 setupImagePopover');
        assert.ok(bundle.includes('setupEmojiPopover'), 'bundle 应包含 setupEmojiPopover');
    });

    test('BT-ToolbarExt.7 Tier2 — app.js 应为带 popover 的按钮阻止直接命令执行', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('btnTextColor'), 'bundle 应包含 btnTextColor ID');
        assert.ok(bundle.includes('btnLink'), 'bundle 应包含 btnLink ID');
        assert.ok(bundle.includes('btnImage'), 'bundle 应包含 btnImage ID');
        assert.ok(bundle.includes('btnEmoji'), 'bundle 应包含 btnEmoji ID');
    });

    test('BT-ToolbarExt.8 Tier2 — pm.bundle.js 应包含所有新命令实现', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('insertTable'), 'pm.bundle 应包含 insertTable');
        assert.ok(bundle.includes('insertMermaid'), 'pm.bundle 应包含 insertMermaid');
        assert.ok(bundle.includes('insertPlantuml'), 'pm.bundle 应包含 insertPlantuml');
        assert.ok(bundle.includes('insertGraphviz'), 'pm.bundle 应包含 insertGraphviz');
        assert.ok(bundle.includes('alertBlock'), 'pm.bundle 应包含 alertBlock');
        assert.ok(bundle.includes('codeBlock'), 'pm.bundle 应包含 codeBlock');
    });

    test('BT-ToolbarExt.9 Tier2 — _toolbarMarkMap 应包含新 mark 按钮映射', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(src.includes("code: 'code'"), '_toolbarMarkMap 应包含 code 映射');
        assert.ok(src.includes("highlight: 'mark'"), '_toolbarMarkMap 应包含 highlight 映射');
        assert.ok(src.includes("textColor: 'colored_text'"), '_toolbarMarkMap 应包含 textColor 映射');
    });

    test('BT-ToolbarExt.10 Tier2 — 颜色 popover 应包含 8 个预设色块', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        const swatchCount = (html.match(/class="color-swatch"/g) || []).length;
        assert.strictEqual(swatchCount, 8, '应有 8 个预设色块');
    });

    test('BT-ToolbarExt.11 Tier2 — emoji popover 应包含至少 70 个 emoji', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        const emojiCount = (html.match(/class="emoji-item"/g) || []).length;
        assert.ok(emojiCount >= 70, `应有至少 70 个 emoji（实际 ${emojiCount}）`);
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-ToolbarExt.12 Tier3 — textColor 命令应接收 color 属性并应用 colored_text mark', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('colored_text'), 'textColor 命令应引用 colored_text mark');
        assert.ok(src.includes('attrs.color'), 'textColor 命令应读取 attrs.color');
    });

    test('BT-ToolbarExt.13 Tier3 — insertTable 命令应创建 3×3 表格（header + 2 body rows）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('table_header'), 'insertTable 应使用 table_header 节点');
        assert.ok(src.includes('table_cell'), 'insertTable 应使用 table_cell 节点');
        assert.ok(src.includes('table_row'), 'insertTable 应使用 table_row 节点');
    });

    test('BT-ToolbarExt.14 Tier3 — diagram 插入命令应包含默认模板', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes("graph TD"), 'insertMermaid 应包含默认 mermaid 模板');
        assert.ok(src.includes("@startuml"), 'insertPlantuml 应包含默认 plantuml 模板');
        assert.ok(src.includes("digraph G"), 'insertGraphviz 应包含默认 graphviz 模板');
    });

    test('BT-ToolbarExt.15 Tier3 — taskList 命令应设置 list_item checked=false', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('checked: false'), 'taskList 命令应设置 checked: false');
    });

    test('BT-ToolbarExt.16 Tier3 — Escape 键应关闭 popover', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(src.includes("e.key === 'Escape'"), 'app.js 应监听 Escape 键关闭 popover');
        assert.ok(src.includes('closeAllPopovers'), 'app.js 应调用 closeAllPopovers');
    });
});
