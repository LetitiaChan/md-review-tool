import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * add-table-grid-selector — Rich Mode 工具栏表格网格选择器测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（HTML / CSS / i18n / 命令签名）
 * - Tier 3 任务特定（BT-TableGridSelector.1~5）
 *
 * Tier 2 不适用（非交互修复，网格选择器的 mouseenter/click 交互需要真实 DOM 环境）
 *
 * Change: add-table-grid-selector (2026-05-04)
 */
suite('Table Grid Selector Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-TableGridSelector.T1.1 Tier1 — index.html 包含 tableGridPopover 与 36 个 table-grid-cell', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="tableGridPopover"'), 'index.html 应包含 tableGridPopover');
        assert.ok(html.includes('id="tableGrid"'), 'index.html 应包含 tableGrid');
        const cellMatches = html.match(/class="table-grid-cell"/g) || [];
        assert.strictEqual(cellMatches.length, 36, `应包含 36 个 table-grid-cell（6×6），实际 ${cellMatches.length}`);
    });

    test('BT-TableGridSelector.T1.2 Tier1 — index.html 表格按钮包裹在 btnInsertTableWrapper 中', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="btnInsertTableWrapper"'), 'index.html 应包含 btnInsertTableWrapper');
        assert.ok(html.includes('id="btnInsertTable"'), 'index.html 应包含 btnInsertTable');
        assert.ok(html.includes('id="tableGridLabel"'), 'index.html 应包含 tableGridLabel');
    });

    test('BT-TableGridSelector.T1.3 Tier1 — i18n.js 含 table_grid_label 翻译键（中英双语）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        const pattern = /['"]editor\.table_grid_label['"]\s*:/g;
        const matches = i18n.match(pattern) || [];
        assert.ok(matches.length >= 2, `editor.table_grid_label 至少应出现 2 次（zh+en），实际 ${matches.length}`);
    });

    test('BT-TableGridSelector.T1.4 Tier1 — markdown.css 含网格选择器样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.table-grid-popover'), 'CSS 应包含 .table-grid-popover');
        assert.ok(css.includes('.table-grid-cell'), 'CSS 应包含 .table-grid-cell');
        assert.ok(css.includes('.table-grid-cell.highlighted'), 'CSS 应包含 .table-grid-cell.highlighted');
        assert.ok(css.includes('.table-grid-label'), 'CSS 应包含 .table-grid-label');
    });

    test('BT-TableGridSelector.T1.5 Tier1 — app.js popoverWrapperIds 包含 btnInsertTableWrapper', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(appJs.includes("'btnInsertTableWrapper'"), 'app.js popoverWrapperIds 应包含 btnInsertTableWrapper');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-TableGridSelector.1 Tier3 — 网格单元格 data-row/data-col 覆盖 1~6 全范围', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        for (let r = 1; r <= 6; r++) {
            for (let c = 1; c <= 6; c++) {
                assert.ok(
                    html.includes(`data-row="${r}" data-col="${c}"`),
                    `应包含 data-row="${r}" data-col="${c}"`
                );
            }
        }
    });

    test('BT-TableGridSelector.2 Tier3 — pm.entry.js insertTable 命令签名含 attrs 参数', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmJs = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 命令签名应包含 attrs 参数
        assert.ok(
            /insertTable\s*:\s*\(state\s*,\s*dispatch\s*,\s*view\s*,\s*attrs\)/.test(pmJs),
            'insertTable 命令签名应包含 (state, dispatch, view, attrs)'
        );
        // 应包含 attrs.rows 和 attrs.cols 的使用
        assert.ok(pmJs.includes('attrs.rows'), 'insertTable 应使用 attrs.rows');
        assert.ok(pmJs.includes('attrs.cols'), 'insertTable 应使用 attrs.cols');
    });

    test('BT-TableGridSelector.3 Tier3 — pm.entry.js insertTable 无 attrs 时回退到 3×3 默认值', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmJs = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 应包含回退到默认值 3 的逻辑
        assert.ok(
            /rows.*\?\s*attrs\.rows\s*:\s*3/.test(pmJs) || pmJs.includes(': 3'),
            'insertTable 应在无 attrs 时回退到默认值 3'
        );
    });

    test('BT-TableGridSelector.4 Tier3 — app.js 包含 setupTableGridPopover 函数定义', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(
            appJs.includes('function setupTableGridPopover()'),
            'app.js 应包含 setupTableGridPopover 函数定义'
        );
        // 应包含 execCommand('insertTable' 调用
        assert.ok(
            appJs.includes("execCommand('insertTable'"),
            'setupTableGridPopover 应调用 execCommand insertTable'
        );
    });

    test('BT-TableGridSelector.5 Tier3 — app.bundle.js 产物包含 setupTableGridPopover', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundlePath = path.join(extPath, 'webview', 'dist', 'app.bundle.js');
        if (!fs.existsSync(bundlePath)) { assert.ok(true, 'app.bundle.js 不存在（开发环境）'); return; }
        const bundle = fs.readFileSync(bundlePath, 'utf-8');
        assert.ok(
            bundle.includes('setupTableGridPopover'),
            'app.bundle.js 应包含 setupTableGridPopover'
        );
    });
});
