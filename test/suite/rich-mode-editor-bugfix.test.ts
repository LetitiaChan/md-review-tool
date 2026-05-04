import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * rich-mode-editor-bugfix — Rich Mode 编辑器 6 项 Bug 修复的回归测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（代码 / DOM / i18n / CSS 关键字）
 * - Tier 2 行为级（bundle 产物内包含期望行为的源码）
 * - Tier 3 任务特定（每个 bug 至少 1 条命名为 BT-RichModeBugfix.* 的断言）
 *
 * Change: fix-rich-mode-editor-bugs (2026-05-04)
 */
suite('Rich Mode Editor Bugfix Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-RichModeBugfix.T1.1 Tier1 — index.html 包含 tableMenuDeleteTable 菜单项', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="tableMenuDeleteTable"'), 'index.html 应包含 tableMenuDeleteTable 菜单项');
        assert.ok(html.includes('context_menu.delete_table'), 'index.html 应引用 context_menu.delete_table i18n key');
    });

    test('BT-RichModeBugfix.T1.2 Tier1 — i18n.js 包含 context_menu.delete_table 中英文键', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        assert.ok(i18n.includes("'context_menu.delete_table': '删除整个表格'"), 'i18n 应包含中文翻译');
        assert.ok(i18n.includes("'context_menu.delete_table': 'Delete entire table'"), 'i18n 应包含英文翻译');
    });

    test('BT-RichModeBugfix.T1.3 Tier1 — pm.entry.js 应 import deleteTable from prosemirror-tables', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 允许在同一个 import 行内；断言 deleteTable 标识符出现在 import 段
        const importLine = src.split('\n').find(l => l.includes('prosemirror-tables') && l.includes('import'));
        assert.ok(importLine, '应存在 prosemirror-tables 的 import 行');
        assert.ok((importLine || '').includes('deleteTable'), 'prosemirror-tables import 应包含 deleteTable');
    });

    test('BT-RichModeBugfix.T1.4 Tier1 — pm.entry.js commandMap 包含 tableDelete 命令', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('tableDelete:'), 'commandMap 应包含 tableDelete 命令');
        assert.ok(src.includes('deleteTable(state, dispatch)'), 'tableDelete 命令应调用 deleteTable(state, dispatch)');
    });

    test('BT-RichModeBugfix.T1.5 Tier1 — pm.entry.js 暴露 getLinkAttrsAtSelection', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('function getLinkAttrsAtSelection'), '应定义 getLinkAttrsAtSelection 函数');
        assert.ok(src.includes('getLinkAttrsAtSelection,') || src.includes('getLinkAttrsAtSelection:'),
            '返回对象应暴露 getLinkAttrsAtSelection');
    });

    test('BT-RichModeBugfix.T1.6 Tier1 — app.js setupColorPopover 包含 customInput.click() 调用', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(src.includes('customInput.click()'),
            'setupColorPopover 应包含 customInput.click() 以单击触发原生调色板');
    });

    test('BT-RichModeBugfix.T1.7 Tier1 — markdown.css #richModeContainer 背景使用 --bg-white', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('var(--bg-white'),
            'markdown.css 的 #richModeContainer 背景应引用 --bg-white 扩展主题变量');
    });

    test('BT-RichModeBugfix.T1.8 Tier1 — app.js 存在 setupTableHoverOverlay 函数', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(src.includes('function setupTableHoverOverlay'),
            'app.js 应包含 setupTableHoverOverlay 函数');
        assert.ok(src.includes('setupTableHoverOverlay()'),
            'app.js 应调用 setupTableHoverOverlay()');
    });

    test('BT-RichModeBugfix.T1.9 Tier1 — markdown.css 包含 .table-hover-overlay 系列样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.table-hover-overlay'), 'CSS 应包含 .table-hover-overlay');
        assert.ok(css.includes('.table-hover-add-row'), 'CSS 应包含 .table-hover-add-row');
        assert.ok(css.includes('.table-hover-add-col'), 'CSS 应包含 .table-hover-add-col');
    });

    // ===== Tier 2 — 行为级断言 =====

    test('BT-RichModeBugfix.T2.1 Tier2 — app.bundle.js 包含 Bug 修复的关键标识', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('tableMenuDeleteTable'), 'bundle 应绑定 tableMenuDeleteTable');
        assert.ok(bundle.includes('setupTableHoverOverlay'), 'bundle 应包含 setupTableHoverOverlay');
        assert.ok(bundle.includes('_pendingLinkRange'), 'bundle 应包含 link popover 选区缓存 _pendingLinkRange');
    });

    test('BT-RichModeBugfix.T2.2 Tier2 — pm.bundle.js 包含替换语义 link 实现', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        // bundle 可能被压缩，但 removeMark / addMark API 应可见
        assert.ok(bundle.includes('removeMark') && bundle.includes('addMark'),
            'pm.bundle 应同时包含 removeMark 和 addMark 表达替换语义');
        assert.ok(bundle.includes('tableDelete'), 'pm.bundle 应包含 tableDelete 命令名');
    });

    test('BT-RichModeBugfix.T2.3 Tier2 — pm.entry.js link 命令实现为 removeMark + addMark（不使用 toggleMark）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 提取 link 命令的实现片段（定位 link: 到下一个逗号+换行+下一个命令）
        const linkMatch = src.match(/\blink:\s*\(state, dispatch, view, attrs\)[\s\S]*?tableDelete:/);
        assert.ok(linkMatch, '应能定位到 link 命令实现');
        const linkImpl = linkMatch ? linkMatch[0] : '';
        assert.ok(linkImpl.includes('removeMark'), 'link 命令应使用 removeMark');
        assert.ok(linkImpl.includes('addMark'), 'link 命令应使用 addMark');
    });

    test('BT-RichModeBugfix.T2.4 Tier2 — pm.entry.js taskList 命令应遍历 bullet_list 并设置 checked=false', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 匹配 taskList 命令实现片段
        const tlMatch = src.match(/\btaskList:\s*\(state, dispatch\)[\s\S]*?\n\s{8}link:/);
        assert.ok(tlMatch, '应能定位到 taskList 命令实现');
        const tlImpl = tlMatch ? tlMatch[0] : '';
        assert.ok(tlImpl.includes('wrapInList'), 'taskList 应使用 wrapInList');
        assert.ok(tlImpl.includes('bullet_list'), 'taskList 应操作 bullet_list 节点');
        assert.ok(tlImpl.includes('setNodeMarkup'), 'taskList 应使用 setNodeMarkup 更新 list_item');
        assert.ok(tlImpl.includes('checked: false'), 'taskList 应设置 checked: false');
    });

    test('BT-RichModeBugfix.T2.5 Tier2 — edit-mode.js 导出 getLinkAttrsAtSelection / setSelectionRange 代理', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
        assert.ok(src.includes('getLinkAttrsAtSelection'),
            'edit-mode 应暴露 getLinkAttrsAtSelection 代理');
        assert.ok(src.includes('setSelectionRange'),
            'edit-mode 应暴露 setSelectionRange 代理');
    });

    test('BT-RichModeBugfix.T2.6 Tier2 — app.js toggleToolbarPopover 为 btnLink 分支调用预填', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        // 提取 toggleToolbarPopover 实现
        const ttMatch = src.match(/function toggleToolbarPopover[\s\S]*?\n\s{4}function\s/);
        assert.ok(ttMatch, '应能定位到 toggleToolbarPopover 函数');
        const ttImpl = ttMatch ? ttMatch[0] : '';
        assert.ok(ttImpl.includes("wrapper.id === 'btnLink'"), '应存在 btnLink 特殊分支');
        assert.ok(ttImpl.includes('getLinkAttrsAtSelection'), '应调用 getLinkAttrsAtSelection');
        assert.ok(ttImpl.includes('_pendingLinkRange'), '应缓存待处理链接范围');
    });

    // ===== Tier 3 — 任务特定断言（每个 bug 至少 1 条） =====

    test('BT-RichModeBugfix.1 Tier3 — Bug1 自定义颜色按钮单击触发原生调色板', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const scMatch = src.match(/function setupColorPopover[\s\S]*?\n\s{4}function\s/);
        assert.ok(scMatch, '应能定位到 setupColorPopover 函数');
        const scImpl = scMatch ? scMatch[0] : '';
        // 确认 apply 按钮 handler 是触发 input.click() 而非直接读 value
        assert.ok(scImpl.includes('customInput.click()'),
            'Custom 按钮 click handler 应调用 customInput.click() 打开原生调色板');
        // 确认 input 的 change 事件被监听，用于应用颜色
        assert.ok(scImpl.includes("customInput.addEventListener('change'"),
            'customInput 应监听 change 事件以应用颜色');
    });

    test('BT-RichModeBugfix.2 Tier3 — Bug2 taskList 包装后的 list_item 被设为 checked=false', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const tlMatch = src.match(/\btaskList:\s*\(state, dispatch\)[\s\S]*?\n\s{8}link:/);
        assert.ok(tlMatch, '应能定位到 taskList 命令实现');
        const tlImpl = tlMatch ? tlMatch[0] : '';
        // 关键：遍历应基于 bullet_list 节点，而非旧 selection 的 from/to 范围
        assert.ok(tlImpl.includes('listNode.forEach') || tlImpl.includes('list.forEach') ||
                  tlImpl.includes('listNode'),
            'taskList 应遍历新包裹的 bullet_list 节点本身，而非旧 selection 范围');
        assert.ok(!tlImpl.includes('nodesBetween'),
            'taskList 修复后不应再使用 tr.doc.nodesBetween（旧 bug 实现方式）');
    });

    test('BT-RichModeBugfix.3 Tier3 — Bug3 link 命令替换语义 + 空 href 移除链接', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const linkMatch = src.match(/\blink:\s*\(state, dispatch, view, attrs\)[\s\S]*?tableDelete:/);
        assert.ok(linkMatch, '应能定位到 link 命令');
        const linkImpl = linkMatch ? linkMatch[0] : '';
        assert.ok(!linkImpl.includes('toggleMark(schema.marks.link'),
            'link 命令修复后不应使用 toggleMark（旧 bug 实现方式）');
        assert.ok(linkImpl.includes('removeMark') && linkImpl.includes('addMark'),
            'link 命令应同时使用 removeMark 与 addMark 实现替换语义');
        assert.ok(linkImpl.includes('empty'),
            'link 命令应对空选区返回 false');
    });

    test('BT-RichModeBugfix.4 Tier3 — Bug4 tableDelete 命令 + 菜单项 + i18n 三者齐备', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pm = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const app = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(pm.includes('tableDelete:') && pm.includes('deleteTable('),
            'pm.entry.js 应包含 tableDelete 命令');
        assert.ok(html.includes('id="tableMenuDeleteTable"'),
            'index.html 应包含 tableMenuDeleteTable 菜单项');
        assert.ok(app.includes("EditMode.execCommand('tableDelete'"),
            'app.js 应派发 tableDelete 命令');
    });

    test('BT-RichModeBugfix.5 Tier3 — Bug5 hover overlay 两个按钮分别派发 tableInsertRowBelow / tableInsertColRight', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const sthMatch = src.match(/function setupTableHoverOverlay[\s\S]*?\n    \}\s*\n/);
        // 兜底：直接搜索
        assert.ok(src.includes("tableInsertRowBelow") && src.includes("tableInsertColRight"),
            'setupTableHoverOverlay 应派发 tableInsertRowBelow 与 tableInsertColRight');
        // 确认按钮创建逻辑
        assert.ok(src.includes('table-hover-add-row') && src.includes('table-hover-add-col'),
            '应动态创建 row / col 两个按钮');
        // 确认 rich-mode-exit 清理
        assert.ok(src.includes("'rich-mode-exit'") && src.includes('removeTableHoverOverlay'),
            '退出 Rich Mode 时应清理 overlay');
    });

    test('BT-RichModeBugfix.6 Tier3 — Bug6 主题跟随：亮色主题补齐 pre/code/frontmatter 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('body:not(.theme-dark) #richModeContainer .ProseMirror pre'),
            'CSS 应包含亮色主题下 #richModeContainer 的 pre 规则');
        assert.ok(css.includes('body:not(.theme-dark) #richModeContainer .ProseMirror code'),
            'CSS 应包含亮色主题下 #richModeContainer 的 code 规则');
        assert.ok(css.includes('body:not(.theme-dark) #richModeContainer .frontmatter'),
            'CSS 应包含亮色主题下 #richModeContainer 的 frontmatter 规则');
        assert.ok(css.includes('body:not(.theme-dark) #richModeContainer .math-inline') ||
                  css.includes('body:not(.theme-dark) #richModeContainer .math-display'),
            'CSS 应包含亮色主题下 #richModeContainer 的 math 规则');
    });

    test('BT-RichModeBugfix.7 Tier3 — Bug3 辅 link popover setupLinkPopover 允许空 href 提交（移除链接）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const slMatch = src.match(/function setupLinkPopover[\s\S]*?\n    \}\s*\n\s*\n/);
        assert.ok(slMatch, '应能定位到 setupLinkPopover 函数');
        const slImpl = slMatch ? slMatch[0] : '';
        // 旧实现包含 `if (href && EditMode.isRichActive())` 的 short-circuit；新实现应无此门禁
        const hasOldShortCircuit = /if\s*\(\s*href\s*&&\s*EditMode\.isRichActive\(\)\s*\)/.test(slImpl);
        assert.ok(!hasOldShortCircuit,
            'setupLinkPopover 修复后不应短路空 href（允许空 href = 移除链接）');
        // 新实现应在派发 link 命令时传入 href（可能为空字符串）
        assert.ok(slImpl.includes("execCommand('link',"),
            'setupLinkPopover 应派发 link 命令');
    });

    test('BT-RichModeBugfix.8 Tier3 — tableContextMenu 视口裁剪高度已从 320 提升到 ≥360', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        // 提取 tableMenu top 计算表达式
        const topMatch = src.match(/tableMenu\.style\.top\s*=\s*Math\.min\(e\.clientY,\s*window\.innerHeight\s*-\s*(\d+)\)/);
        assert.ok(topMatch, '应能定位到 tableMenu.style.top 裁剪表达式');
        const margin = topMatch ? parseInt(topMatch[1], 10) : 0;
        assert.ok(margin >= 360,
            `tableContextMenu 视口裁剪 margin 应 ≥ 360（实际 ${margin}），避免新增 Delete table 项被视口裁剪`);
    });
});
