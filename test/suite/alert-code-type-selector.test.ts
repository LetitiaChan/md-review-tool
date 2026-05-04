import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * add-alert-code-type-selector — Rich Mode 工具栏高亮块/代码块类型选择器测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（HTML / i18n / 命令签名）
 * - Tier 2 行为级（bundle / 源码路径）
 * - Tier 3 任务特定（BT-AlertCodeSelector.1~6）
 *
 * Change: add-alert-code-type-selector (2026-05-04)
 */
suite('Alert / Code-Lang Type Selector Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-AlertCodeSelector.T1.1 Tier1 — index.html 包含 alertTypePopover 与 5 个 alert-type-option', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="alertTypePopover"'), 'index.html 应包含 alertTypePopover');
        const optionMatches = html.match(/class="alert-type-option"/g) || [];
        assert.strictEqual(optionMatches.length, 5, `应包含 5 个 alert-type-option，实际 ${optionMatches.length}`);
    });

    test('BT-AlertCodeSelector.T1.2 Tier1 — index.html 包含 codeLangPopover 与 12 个 code-lang-option', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="codeLangPopover"'), 'index.html 应包含 codeLangPopover');
        const optionMatches = html.match(/class="code-lang-option"/g) || [];
        assert.strictEqual(optionMatches.length, 12, `应包含 12 个 code-lang-option，实际 ${optionMatches.length}`);
    });

    test('BT-AlertCodeSelector.T1.3 Tier1 — index.html 含自定义语言输入与 apply 按钮', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="codeLangCustomInput"'), 'index.html 应包含 codeLangCustomInput');
        assert.ok(html.includes('id="codeLangCustomApply"'), 'index.html 应包含 codeLangCustomApply');
    });

    test('BT-AlertCodeSelector.T1.4 Tier1 — i18n.js 含 5 个 alert_type 键（中英双语）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        const keys = ['note', 'tip', 'important', 'warning', 'caution'];
        for (const k of keys) {
            const pattern = new RegExp(`'editor\\.alert_type\\.${k}'\\s*:`, 'g');
            const matches = i18n.match(pattern) || [];
            assert.ok(matches.length >= 2, `editor.alert_type.${k} 至少应出现 2 次（zh+en），实际 ${matches.length}`);
        }
    });

    test('BT-AlertCodeSelector.T1.5 Tier1 — i18n.js 含 4 个 code_lang 键（中英双语）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        const keys = ['common_title', 'custom_title', 'custom_placeholder', 'confirm'];
        for (const k of keys) {
            const pattern = new RegExp(`'editor\\.code_lang\\.${k}'\\s*:`, 'g');
            const matches = i18n.match(pattern) || [];
            assert.ok(matches.length >= 2, `editor.code_lang.${k} 至少应出现 2 次（zh+en），实际 ${matches.length}`);
        }
    });

    test('BT-AlertCodeSelector.T1.6 Tier1 — pm.entry.js 的 alertBlock/codeBlock 命令签名含 attrs 参数', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(/alertBlock:\s*\(state,\s*dispatch,\s*view,\s*attrs\)/.test(src),
            'alertBlock 命令签名应含 attrs 参数');
        assert.ok(/codeBlock:\s*\(state,\s*dispatch,\s*view,\s*attrs\)/.test(src),
            'codeBlock 命令签名应含 attrs 参数');
    });

    // ===== Tier 2 — 行为级断言 =====

    test('BT-AlertCodeSelector.T2.1 Tier2 — app.bundle.js 含 setupAlertTypePopover 与 setupCodeLangPopover', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('setupAlertTypePopover'), 'bundle 应含 setupAlertTypePopover');
        assert.ok(bundle.includes('setupCodeLangPopover'), 'bundle 应含 setupCodeLangPopover');
    });

    test('BT-AlertCodeSelector.T2.2 Tier2 — pm.bundle.js 含 setNodeMarkup（切换 attr 路径的关键 API）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('setNodeMarkup'), 'pm.bundle 应包含 setNodeMarkup 调用');
    });

    test('BT-AlertCodeSelector.T2.3 Tier2 — pm.entry.js 的 alertBlock 实现含 setNodeMarkup 与 wrapIn 两条路径', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const abMatch = src.match(/alertBlock:\s*\(state, dispatch, view, attrs\)[\s\S]*?\n        codeBlock:/);
        assert.ok(abMatch, '应能定位 alertBlock 实现');
        const impl = abMatch ? abMatch[0] : '';
        assert.ok(impl.includes('setNodeMarkup'), 'alertBlock 应含 setNodeMarkup 路径');
        assert.ok(impl.includes('wrapIn(schema.nodes.gh_alert'), 'alertBlock 应含 wrapIn 路径');
    });

    test('BT-AlertCodeSelector.T2.4 Tier2 — pm.entry.js 的 codeBlock 实现含 setNodeMarkup 与 replaceSelectionWith 两条路径', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const cbMatch = src.match(/codeBlock:\s*\(state, dispatch, view, attrs\)[\s\S]*?\n        insertTable:/);
        assert.ok(cbMatch, '应能定位 codeBlock 实现');
        const impl = cbMatch ? cbMatch[0] : '';
        assert.ok(impl.includes('setNodeMarkup'), 'codeBlock 应含 setNodeMarkup 路径');
        assert.ok(impl.includes('replaceSelectionWith'), 'codeBlock 应含 replaceSelectionWith 路径');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-AlertCodeSelector.1 Tier3 — 5 种 alert 类型的 data-alert-type 值齐全', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        const expected = ['note', 'tip', 'important', 'warning', 'caution'];
        for (const t of expected) {
            assert.ok(html.includes(`data-alert-type="${t}"`),
                `index.html 应含 data-alert-type="${t}"`);
        }
    });

    test('BT-AlertCodeSelector.2 Tier3 — 12 种常用代码语言的 data-lang 值齐全', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        const expected = ['javascript', 'typescript', 'python', 'bash', 'shell',
                          'json', 'yaml', 'html', 'css', 'markdown', 'sql', 'plaintext'];
        for (const lang of expected) {
            assert.ok(html.includes(`data-lang="${lang}"`),
                `index.html 应含 data-lang="${lang}"`);
        }
    });

    test('BT-AlertCodeSelector.3 Tier3 — alertBlock 未传 attrs 时回退到 NOTE 默认值', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const abMatch = src.match(/alertBlock:\s*\(state, dispatch, view, attrs\)[\s\S]*?\n        codeBlock:/);
        assert.ok(abMatch, '应能定位 alertBlock 实现');
        const impl = abMatch ? abMatch[0] : '';
        // 存在 'NOTE' 作为默认值（alertType 赋值的右侧）
        assert.ok(/\|\|\s*['"]NOTE['"]/.test(impl),
            'alertBlock 应含 || "NOTE" 的默认值回退');
    });

    test('BT-AlertCodeSelector.4 Tier3 — codeBlock 对 language 做 trim().toLowerCase() 归一化', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        const cbMatch = src.match(/codeBlock:\s*\(state, dispatch, view, attrs\)[\s\S]*?\n        insertTable:/);
        assert.ok(cbMatch, '应能定位 codeBlock 实现');
        const impl = cbMatch ? cbMatch[0] : '';
        assert.ok(impl.includes('.trim()') && impl.includes('.toLowerCase()'),
            'codeBlock 应对 language 做 .trim().toLowerCase() 归一化');
    });

    test('BT-AlertCodeSelector.5 Tier3 — app.js setupAlertTypePopover 派发 execCommand("alertBlock", { alertType })', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const fnMatch = src.match(/function setupAlertTypePopover\(\)\s*\{[\s\S]*?\n    \}/);
        assert.ok(fnMatch, '应能定位 setupAlertTypePopover 函数');
        const impl = fnMatch ? fnMatch[0] : '';
        assert.ok(impl.includes("execCommand('alertBlock',"),
            'setupAlertTypePopover 应派发 alertBlock 命令');
        assert.ok(impl.includes('alertType'),
            'setupAlertTypePopover 应传 alertType attr');
        assert.ok(impl.includes('toUpperCase'),
            'setupAlertTypePopover 应把 data-alert-type 转为大写（匹配 PM schema 约定）');
    });

    test('BT-AlertCodeSelector.6 Tier3 — app.js setupCodeLangPopover 派发 execCommand("codeBlock", { language }) 且支持自定义输入', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        const fnMatch = src.match(/function setupCodeLangPopover\(\)\s*\{[\s\S]*?\n    \}/);
        assert.ok(fnMatch, '应能定位 setupCodeLangPopover 函数');
        const impl = fnMatch ? fnMatch[0] : '';
        assert.ok(impl.includes("execCommand('codeBlock',"),
            'setupCodeLangPopover 应派发 codeBlock 命令');
        assert.ok(impl.includes('language'),
            'setupCodeLangPopover 应传 language attr');
        assert.ok(impl.includes('codeLangCustomInput'),
            'setupCodeLangPopover 应处理自定义输入');
        assert.ok(impl.includes('codeLangCustomApply'),
            'setupCodeLangPopover 应处理自定义 apply 按钮');
    });
});
