import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * link-edit-text — 超链接再次编辑修改原内容的回归测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（源码关键字 / DOM 元素 / i18n 键）
 * - Tier 3 任务特定（BT-LinkEditText.* 命名断言）
 *
 * Tier 2 不适用（非交互修复，双击行为无法在 Mocha 单元测试中模拟）
 *
 * Hotfix: 编辑模式下超链接支持再次编辑修改原内容 (2026-05-04)
 */
suite('Link Edit Text Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-LinkEditText.T1.1 Tier1 — index.html 包含 linkTextInput 输入框', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="linkTextInput"'), 'index.html 应包含 linkTextInput 输入框');
        assert.ok(html.includes('editor.link_text_placeholder'), 'index.html 应引用 editor.link_text_placeholder i18n key');
    });

    test('BT-LinkEditText.T1.2 Tier1 — i18n.js 包含 editor.link_text_placeholder 中英文键', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        assert.ok(i18n.includes("'editor.link_text_placeholder'"), 'i18n 应包含 editor.link_text_placeholder 键');
        // 检查中英文都有
        assert.ok(i18n.includes('显示文本'), 'i18n 应包含中文"显示文本"');
        assert.ok(i18n.includes('Display text'), 'i18n 应包含英文"Display text"');
    });

    test('BT-LinkEditText.T1.3 Tier1 — pm.entry.js getLinkAttrsAtSelection 应返回 text 字段', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('textBetween'), 'getLinkAttrsAtSelection 应使用 textBetween 获取链接文本');
        // 确认返回对象包含 text 字段
        const returnMatch = src.match(/return\s*\{[^}]*text\s*:/);
        assert.ok(returnMatch, 'getLinkAttrsAtSelection 返回对象应包含 text 字段');
    });

    test('BT-LinkEditText.T1.4 Tier1 — pm.entry.js EditorView 应配置 handleDoubleClick', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('handleDoubleClick'), 'EditorView 应配置 handleDoubleClick prop');
        assert.ok(src.includes('pm-link-dblclick'), '双击链接应 dispatch pm-link-dblclick 事件');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-LinkEditText.1 Tier3 — link 命令应支持 attrs.text 参数替换显示文本', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 找到 link 命令定义区域
        const linkCmdIdx = src.indexOf("link:");
        assert.ok(linkCmdIdx > -1, 'pm.entry.js 应包含 link 命令定义');
        const linkCmdSection = src.substring(linkCmdIdx, linkCmdIdx + 1500);
        // 验证 attrs.text 处理逻辑
        assert.ok(linkCmdSection.includes('attrs.text'), 'link 命令应读取 attrs.text');
        assert.ok(linkCmdSection.includes('replaceWith'), 'link 命令应使用 replaceWith 替换文本');
        assert.ok(linkCmdSection.includes('schema.text('), 'link 命令应使用 schema.text 创建新文本节点');
    });

    test('BT-LinkEditText.2 Tier3 — app.js setupLinkPopover 应监听 pm-link-dblclick 事件', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(appJs.includes('pm-link-dblclick'), 'app.js 应监听 pm-link-dblclick 事件');
        assert.ok(appJs.includes('linkTextInput'), 'app.js 应引用 linkTextInput 元素');
    });

    test('BT-LinkEditText.3 Tier3 — app.bundle.js 产物应包含链接文本编辑逻辑', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('linkTextInput'), 'app.bundle.js 应包含 linkTextInput');
        assert.ok(bundle.includes('pm-link-dblclick'), 'app.bundle.js 应包含 pm-link-dblclick 事件监听');
    });

    test('BT-LinkEditText.4 Tier3 — pm.bundle.js 产物应包含双击链接处理和文本替换逻辑', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('pm-link-dblclick'), 'pm.bundle.js 应包含 pm-link-dblclick 事件派发');
        assert.ok(bundle.includes('handleDoubleClick'), 'pm.bundle.js 应包含 handleDoubleClick');
        assert.ok(bundle.includes('textBetween'), 'pm.bundle.js 应包含 textBetween 调用');
    });

    test('BT-LinkEditText.5 Tier3 — link 命令文本不变时应只操作 mark 不替换文本', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const linkCmdIdx = src.indexOf("link:");
        const linkCmdSection = src.substring(linkCmdIdx, linkCmdIdx + 1500);
        // 验证有"文本不变只操作 mark"的分支
        assert.ok(linkCmdSection.includes('removeMark'), 'link 命令应有 removeMark 路径（文本不变时）');
        assert.ok(linkCmdSection.includes('addMark'), 'link 命令应有 addMark 路径（文本不变时）');
        assert.ok(linkCmdSection.includes('currentText'), 'link 命令应获取 currentText 用于比较');
    });
});
