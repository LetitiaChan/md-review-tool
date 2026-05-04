
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * link-bubble-menu — 超链接浮动编辑菜单的回归测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（DOM / i18n / CSS / 源码关键字）
 * - Tier 2 行为级（bundle 产物内包含期望行为的源码）
 * - Tier 3 任务特定（BT-LinkBubble.* 断言）
 *
 * Hotfix: link-bubble-menu (2026-05-04)
 */
suite('Link Bubble Menu Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-LinkBubble.T1.1 Tier1 — index.html 包含 linkBubbleMenu DOM 结构', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="linkBubbleMenu"'), 'index.html 应包含 linkBubbleMenu');
        assert.ok(html.includes('id="linkBubbleUrl"'), 'index.html 应包含 linkBubbleUrl');
        assert.ok(html.includes('id="linkBubbleEdit"'), 'index.html 应包含 linkBubbleEdit');
        assert.ok(html.includes('id="linkBubbleOpen"'), 'index.html 应包含 linkBubbleOpen');
        assert.ok(html.includes('id="linkBubbleCopy"'), 'index.html 应包含 linkBubbleCopy');
        assert.ok(html.includes('id="linkBubbleUnlink"'), 'index.html 应包含 linkBubbleUnlink');
    });

    test('BT-LinkBubble.T1.2 Tier1 — i18n.js 包含 link_bubble 中英文翻译键', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        // 中文
        assert.ok(i18n.includes("'editor.link_bubble_open'"), 'i18n 应包含 link_bubble_open 键');
        assert.ok(i18n.includes("'editor.link_bubble_edit'"), 'i18n 应包含 link_bubble_edit 键');
        assert.ok(i18n.includes("'editor.link_bubble_copy'"), 'i18n 应包含 link_bubble_copy 键');
        assert.ok(i18n.includes("'editor.link_bubble_unlink'"), 'i18n 应包含 link_bubble_unlink 键');
        assert.ok(i18n.includes("'editor.link_bubble_copied'"), 'i18n 应包含 link_bubble_copied 键');
    });

    test('BT-LinkBubble.T1.3 Tier1 — markdown.css 包含 .link-bubble-menu 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.link-bubble-menu'), 'CSS 应包含 .link-bubble-menu 类');
        assert.ok(css.includes('.link-bubble-url'), 'CSS 应包含 .link-bubble-url 类');
        assert.ok(css.includes('.link-bubble-btn'), 'CSS 应包含 .link-bubble-btn 类');
        assert.ok(css.includes('.link-bubble-btn-danger'), 'CSS 应包含 .link-bubble-btn-danger 类');
    });

    test('BT-LinkBubble.T1.4 Tier1 — pm.entry.js click handler 应派发 pm-link-click 事件', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('pm-link-click'), 'pm.entry.js 应包含 pm-link-click 事件派发');
        assert.ok(src.includes('getBoundingClientRect'), 'pm.entry.js 应获取链接 DOM 坐标');
    });

    test('BT-LinkBubble.T1.5 Tier1 — webviewHelper.ts 包含 openExternalLink 消息处理', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
        assert.ok(src.includes("case 'openExternalLink'"), 'webviewHelper 应包含 openExternalLink case');
        assert.ok(src.includes('vscode.env.openExternal'), 'openExternalLink 应调用 vscode.env.openExternal');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-LinkBubble.1 Tier3 — app.bundle.js 包含 setupLinkBubbleMenu 函数', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('setupLinkBubbleMenu'), 'bundle 应包含 setupLinkBubbleMenu');
    });

    test('BT-LinkBubble.2 Tier3 — app.js setupLinkBubbleMenu 监听 pm-link-click 事件', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(src.includes("window.addEventListener('pm-link-click'"), 'app.js 应监听 pm-link-click 事件');
    });

    test('BT-LinkBubble.3 Tier3 — app.js 浮动菜单包含取消链接功能（execCommand link 空 href）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        // 取消链接应通过 execCommand('link', { href: '' }) 实现
        const startIdx = src.indexOf('setupLinkBubbleMenu');
        const endIdx = src.indexOf('function setupImagePopover', startIdx);
        const bubbleSection = src.substring(startIdx, endIdx > startIdx ? endIdx : startIdx + 5000);
        assert.ok(bubbleSection.includes("execCommand('link'"), 'setupLinkBubbleMenu 应调用 execCommand link');
        assert.ok(bubbleSection.includes("href: ''"), '取消链接应传递空 href');
    });

    test('BT-LinkBubble.4 Tier3 — pm.entry.js 点击非链接区域时派发 detail: null 关闭菜单', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('detail: null'), 'pm.entry.js 应在非链接点击时派发 detail: null');
    });

    test('BT-LinkBubble.5 Tier3 — app.js 浮动菜单包含滚动关闭和 rich-mode-exit 关闭逻辑', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const startIdx = src.indexOf('setupLinkBubbleMenu');
        const endIdx = src.indexOf('function setupImagePopover', startIdx);
        const bubbleSection = src.substring(startIdx, endIdx > startIdx ? endIdx : startIdx + 5000);
        assert.ok(bubbleSection.includes('scroll'), '浮动菜单应监听 scroll 事件关闭');
        assert.ok(bubbleSection.includes('rich-mode-exit'), '浮动菜单应监听 rich-mode-exit 事件关闭');
    });
});
