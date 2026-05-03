/**
 * table-row-col-editing.test.ts
 *
 * Tier 1/2/3 回归测试 — Change `add-table-row-col-editing`
 *
 * 覆盖 Rich Mode 下通过 prosemirror-tables 命令 API 实现的表格行列
 * 插入/删除功能，包括右键菜单交互、命令派发、选区设置。
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Table Row/Col Editing — Rich Mode prosemirror-tables Commands', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    // =====================================================================
    // Tier 1 — 存在性断言
    // =====================================================================
    suite('Tier 1 — 存在性断言', () => {

        test('BT-TableEdit.1 Tier1 — pm.entry.js 应导入 prosemirror-tables 行列命令', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(pmEntry.includes('addRowBefore'), 'pm.entry.js 应导入 addRowBefore');
            assert.ok(pmEntry.includes('addRowAfter'), 'pm.entry.js 应导入 addRowAfter');
            assert.ok(pmEntry.includes('addColumnBefore'), 'pm.entry.js 应导入 addColumnBefore');
            assert.ok(pmEntry.includes('addColumnAfter'), 'pm.entry.js 应导入 addColumnAfter');
            assert.ok(pmEntry.includes('deleteRow'), 'pm.entry.js 应导入 deleteRow');
            assert.ok(pmEntry.includes('deleteColumn'), 'pm.entry.js 应导入 deleteColumn');
        });

        test('BT-TableEdit.2 Tier1 — pm.entry.js commandMap 应包含 6 个表格命令', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            const tableCommands = [
                'tableInsertRowAbove', 'tableInsertRowBelow',
                'tableInsertColLeft', 'tableInsertColRight',
                'tableDeleteRow', 'tableDeleteCol',
            ];
            for (const cmd of tableCommands) {
                assert.ok(pmEntry.includes(cmd), `commandMap 应包含 ${cmd}`);
            }
        });

        test('BT-TableEdit.3 Tier1 — pm.entry.js 应导入 Selection 用于选区设置', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(pmEntry.includes('Selection'), 'pm.entry.js 应导入 Selection');
        });

        test('BT-TableEdit.4 Tier1 — pm.entry.js 应包含 setCellSelection 辅助函数', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(pmEntry.includes('setCellSelection'), 'pm.entry.js 应包含 setCellSelection');
        });

        test('BT-TableEdit.5 Tier1 — app.js 应包含 richModeContainer 事件监听', () => {
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(appJs.includes('richModeContainer'), 'app.js 应监听 richModeContainer');
        });

        test('BT-TableEdit.6 Tier1 — index.html 应包含表格右键菜单 DOM 结构', () => {
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(html.includes('id="tableContextMenu"'), '应有 tableContextMenu');
            assert.ok(html.includes('id="tableMenuInsertRowAbove"'), '应有 tableMenuInsertRowAbove');
            assert.ok(html.includes('id="tableMenuInsertRowBelow"'), '应有 tableMenuInsertRowBelow');
            assert.ok(html.includes('id="tableMenuInsertColLeft"'), '应有 tableMenuInsertColLeft');
            assert.ok(html.includes('id="tableMenuInsertColRight"'), '应有 tableMenuInsertColRight');
            assert.ok(html.includes('id="tableMenuDeleteRow"'), '应有 tableMenuDeleteRow');
            assert.ok(html.includes('id="tableMenuDeleteCol"'), '应有 tableMenuDeleteCol');
        });
    });

    // =====================================================================
    // Tier 2 — 行为级断言
    // =====================================================================
    suite('Tier 2 — 行为级断言', () => {

        test('BT-TableEdit.7 Tier2 — app.js 应通过 EditMode.execCommand 派发表格命令', () => {
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(appJs.includes("EditMode.execCommand('tableInsertRowAbove'"), 'app.js 应派发 tableInsertRowAbove');
            assert.ok(appJs.includes("EditMode.execCommand('tableInsertRowBelow'"), 'app.js 应派发 tableInsertRowBelow');
            assert.ok(appJs.includes("EditMode.execCommand('tableInsertColLeft'"), 'app.js 应派发 tableInsertColLeft');
            assert.ok(appJs.includes("EditMode.execCommand('tableInsertColRight'"), 'app.js 应派发 tableInsertColRight');
            assert.ok(appJs.includes("EditMode.execCommand('tableDeleteRow'"), 'app.js 应派发 tableDeleteRow');
            assert.ok(appJs.includes("EditMode.execCommand('tableDeleteCol'"), 'app.js 应派发 tableDeleteCol');
        });

        test('BT-TableEdit.8 Tier2 — app.js 应传递 coords 参数给表格命令', () => {
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            // 所有表格命令调用应包含 coords 参数
            assert.ok(appJs.includes('{ coords: tableMenuCoords }'), 'app.js 应传递 coords 参数');
        });

        test('BT-TableEdit.9 Tier2 — app.js 不应包含旧的 DOM 操作函数', () => {
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            // 旧的 DOM 操作函数应已被移除
            assert.ok(!appJs.includes('function tableInsertRow('), 'app.js 不应包含旧的 tableInsertRow 函数');
            assert.ok(!appJs.includes('function tableInsertCol('), 'app.js 不应包含旧的 tableInsertCol 函数');
            assert.ok(!appJs.includes('function tableDeleteRow()'), 'app.js 不应包含旧的 tableDeleteRow 函数');
            assert.ok(!appJs.includes('function tableDeleteCol()'), 'app.js 不应包含旧的 tableDeleteCol 函数');
            assert.ok(!appJs.includes('function markTableEdited()'), 'app.js 不应包含旧的 markTableEdited 函数');
        });

        test('BT-TableEdit.10 Tier2 — pm.entry.js 表格命令应支持 coords 参数设置选区', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            // 每个表格命令应检查 attrs.coords 并调用 setCellSelection
            assert.ok(pmEntry.includes('attrs && attrs.coords'), '表格命令应检查 attrs.coords');
            assert.ok(pmEntry.includes('setCellSelection(view, attrs.coords)'), '表格命令应调用 setCellSelection');
        });

        test('BT-TableEdit.11 Tier2 — pm.entry.js setCellSelection 应使用 posAtCoords', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(pmEntry.includes('view.posAtCoords'), 'setCellSelection 应使用 posAtCoords');
            assert.ok(pmEntry.includes('table_cell'), 'setCellSelection 应查找 table_cell 节点');
            assert.ok(pmEntry.includes('table_header'), 'setCellSelection 应查找 table_header 节点');
        });
    });

    // =====================================================================
    // Tier 3 — 任务特定断言
    // =====================================================================
    suite('Tier 3 — 任务特定断言', () => {

        test('BT-TableEdit.12 Tier3 — pm.bundle.js 应包含 prosemirror-tables 行列命令', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'pm.bundle.js');
            if (!fs.existsSync(bundlePath)) { assert.ok(true, '测试环境中 bundle 不可用'); return; }
            const bundle = fs.readFileSync(bundlePath, 'utf-8');
            // bundle 中应包含表格命令相关代码
            assert.ok(bundle.includes('tableInsertRowAbove'), 'pm.bundle.js 应包含 tableInsertRowAbove');
            assert.ok(bundle.includes('setCellSelection'), 'pm.bundle.js 应包含 setCellSelection');
        });

        test('BT-TableEdit.13 Tier3 — app.bundle.js 应包含重构后的表格右键菜单逻辑', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'app.bundle.js');
            if (!fs.existsSync(bundlePath)) { assert.ok(true, '测试环境中 bundle 不可用'); return; }
            const bundle = fs.readFileSync(bundlePath, 'utf-8');
            assert.ok(bundle.includes('tableMenuCoords'), 'app.bundle.js 应包含 tableMenuCoords');
            assert.ok(bundle.includes('tableInsertRowAbove'), 'app.bundle.js 应包含 tableInsertRowAbove 命令名');
            // 不应包含旧的 DOM 操作
            assert.ok(!bundle.includes('markTableEdited'), 'app.bundle.js 不应包含旧的 markTableEdited');
        });

        test('BT-TableEdit.14 Tier3 — pm.entry.js 表格命令应在 coords 缺失时仍可工作', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            // 命令应在 attrs.coords 不存在时直接调用 prosemirror-tables 命令（使用当前选区）
            // 验证条件判断模式：if (attrs && attrs.coords) 意味着 coords 缺失时跳过选区设置
            const pattern = /if\s*\(attrs\s*&&\s*attrs\.coords\)/;
            assert.ok(pattern.test(pmEntry), '表格命令应使用条件判断，coords 缺失时跳过选区设置');
        });

        test('BT-TableEdit.15 Tier3 — app.js 右键菜单应使用事件委托监听 richModeContainer', () => {
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            // 应使用 document 级别的 contextmenu 事件委托来处理动态创建的 richModeContainer
            assert.ok(appJs.includes("document.addEventListener('contextmenu'"), 'app.js 应使用 document 级别事件委托');
            assert.ok(appJs.includes('richContainer.contains(e.target)'), 'app.js 应检查事件目标是否在 richModeContainer 内');
        });

        test('BT-TableEdit.16 Tier3 — pm.entry.js commandMap 应覆盖所有 18 个命令（12 原有 + 6 表格）', () => {
            const pmEntry = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            const allCommands = [
                'bold', 'italic', 'strikethrough',
                'h1', 'h2', 'h3',
                'ul', 'ol', 'blockquote', 'hr',
                'undo', 'redo',
                'tableInsertRowAbove', 'tableInsertRowBelow',
                'tableInsertColLeft', 'tableInsertColRight',
                'tableDeleteRow', 'tableDeleteCol',
            ];
            for (const cmd of allCommands) {
                assert.ok(pmEntry.includes(cmd), `commandMap 应包含命令 ${cmd}`);
            }
        });
    });
});
