/**
 * remove-source-mode.test.ts
 *
 * Tier 1/2/3 回归测试 — Change `remove-source-mode`
 *
 * 验证 Source Mode（CodeMirror 6）已被彻底移除，
 * Rich Mode 成为扩展内唯一编辑器，工具栏图标为铅笔（✎）。
 */
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

suite('Remove Source Mode — Regression Test Suite', () => {

    // ===== Tier 1 — 存在性 / 缺失性断言 =====

    suite('Tier 1 — Existence / Absence Assertions', () => {

        test('T1.1 cm6.entry.js 应不存在', () => {
            const entryPath = path.join(extPath, 'webview', 'src', 'entries', 'cm6.entry.js');
            assert.ok(!fs.existsSync(entryPath),
                'webview/src/entries/cm6.entry.js 应已被删除');
        });

        test('T1.2 cm6.bundle.js 应不存在', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'cm6.bundle.js');
            assert.ok(!fs.existsSync(bundlePath),
                'webview/dist/cm6.bundle.js 应已被删除（不再构建）');
        });

        test('T1.3 package.json 不应包含 @codemirror 或 @lezer 依赖', () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            const deps = Object.keys(pkg.dependencies || {});
            const devDeps = Object.keys(pkg.devDependencies || {});
            const allDeps = [...deps, ...devDeps];
            const cmDeps = allDeps.filter(d => d.startsWith('@codemirror/') || d === '@lezer/markdown');
            assert.strictEqual(cmDeps.length, 0,
                `不应存在 @codemirror/@lezer 依赖，但发现: ${cmDeps.join(', ')}`);
        });

        test('T1.4 index.html 不应包含 btnToggleSource', () => {
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(!html.includes('btnToggleSource'),
                'index.html 不应包含 id="btnToggleSource"');
        });

        test('T1.5 index.html 不应包含 cm6BundleUri', () => {
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(!html.includes('cm6BundleUri'),
                'index.html 不应包含 ${cm6BundleUri} 占位符');
        });

        test('T1.6 edit-mode.js 不应包含 enterSource/exitSource/isSourceActive', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(!content.includes('enterSource'),
                'edit-mode.js 不应包含 enterSource');
            assert.ok(!content.includes('exitSource'),
                'edit-mode.js 不应包含 exitSource');
            assert.ok(!content.includes('isSourceActive'),
                'edit-mode.js 不应包含 isSourceActive');
        });

        test('T1.7 webviewHelper.ts 不应包含 cm6BundleUri', () => {
            const content = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
            assert.ok(!content.includes('cm6BundleUri'),
                'webviewHelper.ts 不应包含 cm6BundleUri');
        });

        test('T1.8 markdown.css 不应包含 source-mode-active 或 sourceModeContainer 或 btnToggleSource', () => {
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
            assert.ok(!css.includes('source-mode-active'),
                'markdown.css 不应包含 source-mode-active');
            assert.ok(!css.includes('sourceModeContainer'),
                'markdown.css 不应包含 sourceModeContainer');
            assert.ok(!css.includes('btnToggleSource'),
                'markdown.css 不应包含 btnToggleSource');
        });

        test('T1.9 app.js 不应包含 btnToggleSource 或 source-mode-exit', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(!content.includes('btnToggleSource'),
                'app.js 不应包含 btnToggleSource');
            assert.ok(!content.includes('source-mode-exit'),
                'app.js 不应包含 source-mode-exit 事件监听');
        });

        test('T1.10 build.config.mjs 不应包含 cm6.bundle 入口', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'build.config.mjs'), 'utf-8');
            assert.ok(!content.includes('cm6.bundle'),
                'build.config.mjs 不应包含 cm6.bundle 入口');
            assert.ok(!content.includes('cm6.entry'),
                'build.config.mjs 不应包含 cm6.entry 引用');
        });
    });

    // ===== Tier 2 — 行为级断言 =====

    suite('Tier 2 — Behavioral Assertions', () => {

        test('T2.1 index.html 的 btnToggleRich 应包含铅笔 SVG 图标', () => {
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            // 查找 btnToggleRich 按钮
            assert.ok(html.includes('id="btnToggleRich"'),
                'index.html 应包含 id="btnToggleRich" 按钮');
            // 铅笔 SVG 路径特征
            assert.ok(html.includes('M11.4 1.6'),
                'btnToggleRich 的 SVG path 应包含铅笔路径 M11.4 1.6');
        });

        test('T2.2 edit-mode.js 应导出 EditMode 对象，包含 enterRich/exitRich/isRichActive/isAnyEditorActive', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/export\s+const\s+EditMode\s*=/.test(content),
                'edit-mode.js 应导出 EditMode');
            assert.ok(content.includes('enterRich'),
                'EditMode 应包含 enterRich');
            assert.ok(content.includes('exitRich'),
                'EditMode 应包含 exitRich');
            assert.ok(content.includes('isRichActive'),
                'EditMode 应包含 isRichActive');
            assert.ok(content.includes('isAnyEditorActive'),
                'EditMode 应包含 isAnyEditorActive');
        });

        test('T2.3 app.js 应包含 btnToggleRich 事件处理器', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(content.includes('btnToggleRich'),
                'app.js 应包含 btnToggleRich 事件处理器');
            assert.ok(content.includes('rich-mode-exit'),
                'app.js 应包含 rich-mode-exit 事件监听');
        });
    });

    // ===== Tier 3 — 任务特定断言 =====

    suite('Tier 3 — Task-Specific Assertions (BT-RemoveSourceMode)', () => {

        test('BT-RemoveSourceMode.1 edit-mode.js MODE 枚举应仅含 INACTIVE 和 RICH', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            // MODE 枚举应包含 INACTIVE 和 RICH
            assert.ok(/MODE\s*=\s*\{[^}]*INACTIVE[^}]*RICH[^}]*\}/.test(content),
                'MODE 枚举应包含 INACTIVE 和 RICH');
            // MODE 枚举不应包含 SOURCE
            assert.ok(!/MODE\s*=\s*\{[^}]*SOURCE[^}]*\}/.test(content),
                'MODE 枚举不应包含 SOURCE');
        });

        test('BT-RemoveSourceMode.2 app.js 不应有 source-mode-exit 监听器', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(!content.includes("'source-mode-exit'"),
                'app.js 不应包含 source-mode-exit 事件字符串');
        });

        test('BT-RemoveSourceMode.3 build.config.mjs 不应有 cm6.bundle 入口', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'build.config.mjs'), 'utf-8');
            assert.ok(!/['"]cm6\.bundle['"]/.test(content),
                'build.config.mjs 不应有 cm6.bundle 入口键');
        });

        test('BT-RemoveSourceMode.4 package.json 版本应为 1.5.0', () => {
            const pkg = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            assert.strictEqual(pkg.version, '1.5.0',
                `package.json 版本应为 1.5.0，实际为 ${pkg.version}`);
        });

        test('BT-RemoveSourceMode.5 package-lock.json 不应包含 @codemirror 或 @lezer/markdown', () => {
            const lockPath = path.join(extPath, 'package-lock.json');
            if (fs.existsSync(lockPath)) {
                const lockContent = fs.readFileSync(lockPath, 'utf-8');
                assert.ok(!lockContent.includes('@codemirror/'),
                    'package-lock.json 不应包含 @codemirror/ 条目');
                assert.ok(!lockContent.includes('@lezer/markdown'),
                    'package-lock.json 不应包含 @lezer/markdown 条目');
            }
        });

        test('BT-RemoveSourceMode.6 dual-mode-editor-phase-a.test.ts 应已被删除', () => {
            const testPath = path.join(extPath, 'test', 'suite', 'dual-mode-editor-phase-a.test.ts');
            assert.ok(!fs.existsSync(testPath),
                'dual-mode-editor-phase-a.test.ts 应已被删除');
        });
    });
});
