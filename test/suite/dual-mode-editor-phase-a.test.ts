/**
 * dual-mode-editor-phase-a.test.ts
 *
 * Tier 1/2/3 回归测试 — Change `add-dual-mode-editor-phase-a-cm6-source`
 *
 * 覆盖 tasks.md 任务组 10（Tier 1 存在性）、11（Tier 2 行为级/源码结构）、12（Tier 3 任务特定 BT-DualModePhaseA.*）
 *
 * Phase A 策略：骨架先行 — CM6 真盘接入 + Source Mode 状态机 + 工具栏入口；
 * 不改变已有 preview/edit 行为，739 个既有测试应保持 0 failing。
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Dual-Mode Editor Phase A — CM6 Source Mode Test Suite', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    // =====================================================================
    // Tier 1 — 存在性断言
    // =====================================================================
    suite('Tier 1 — 存在性断言', () => {

        test('T10.1 package.json 应声明 7 个 @codemirror/* 和 @lezer/markdown 依赖', () => {
            const pkgJson = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            const allDeps: Record<string, string> = Object.assign({}, pkgJson.dependencies || {}, pkgJson.devDependencies || {});
            const required = [
                '@codemirror/view',
                '@codemirror/state',
                '@codemirror/commands',
                '@codemirror/language',
                '@codemirror/lang-markdown',
                '@codemirror/search',
                '@lezer/markdown',
            ];
            for (const name of required) {
                assert.ok(allDeps[name], `package.json 应声明 ${name}（dependencies 或 devDependencies）`);
            }
        });

        test('T10.2 cm6.entry.js 应存在且导出 createEditor + 挂 globalThis.CM6', () => {
            const entryPath = path.join(extPath, 'webview', 'src', 'entries', 'cm6.entry.js');
            assert.ok(fs.existsSync(entryPath), 'webview/src/entries/cm6.entry.js 应存在');
            const content = fs.readFileSync(entryPath, 'utf-8');
            assert.ok(/function\s+createEditor\s*\(/.test(content) || /const\s+createEditor\s*=/.test(content),
                'cm6.entry.js 应定义 createEditor 函数');
            assert.ok(/globalThis\.CM6\s*=/.test(content),
                'cm6.entry.js 应挂载 globalThis.CM6');
            // 至少导入 5 个 @codemirror/* 或 @lezer/* 模块
            const imports = content.match(/from\s+['"]@(codemirror|lezer)\//g) || [];
            assert.ok(imports.length >= 5,
                `cm6.entry.js 应 import 至少 5 个 @codemirror/@lezer 包，实际 ${imports.length}`);
        });

        test('T10.3 edit-mode.js 应存在且导出 EditMode', () => {
            const emPath = path.join(extPath, 'webview', 'js', 'edit-mode.js');
            assert.ok(fs.existsSync(emPath), 'webview/js/edit-mode.js 应存在');
            const content = fs.readFileSync(emPath, 'utf-8');
            assert.ok(/export\s+\{?\s*EditMode/.test(content) || /export\s+const\s+EditMode/.test(content),
                'edit-mode.js 末尾应 export EditMode');
            assert.ok(/function\s+enterSource\s*\(/.test(content),
                'edit-mode.js 应定义 enterSource');
            assert.ok(/function\s+exitSource\s*\(/.test(content),
                'edit-mode.js 应定义 exitSource');
            assert.ok(/function\s+isSourceActive\s*\(/.test(content),
                'edit-mode.js 应定义 isSourceActive');
        });

        test('T10.4 index.html 应含 cm6BundleUri 占位符与 btnToggleSource 按钮', () => {
            const htmlPath = path.join(extPath, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');
            assert.ok(/\$\{cm6BundleUri\}/.test(html),
                'index.html 应包含 ${cm6BundleUri} 占位符');
            assert.ok(/id="btnToggleSource"/.test(html),
                'index.html 应包含 id="btnToggleSource" 按钮');
        });

        test('T10.5 reviewPanel.ts 应注入 cm6BundleUri', () => {
            const rpPath = path.join(extPath, 'src', 'reviewPanel.ts');
            const content = fs.readFileSync(rpPath, 'utf-8');
            assert.ok(/cm6BundleUri\s*=\s*webviewUri\(['"]dist\/cm6\.bundle\.js['"]\)/.test(content),
                'reviewPanel.ts 应声明 cm6BundleUri = webviewUri("dist/cm6.bundle.js")');
            assert.ok(/html\.replace\(\s*\/\\\$\\\{cm6BundleUri\\\}\/g/.test(content),
                'reviewPanel.ts 应对 ${cm6BundleUri} 做 html.replace');
        });

        test('T10.6 main.entry.js 应 import EditMode 并挂 globalThis', () => {
            const mainPath = path.join(extPath, 'webview', 'src', 'entries', 'main.entry.js');
            const content = fs.readFileSync(mainPath, 'utf-8');
            assert.ok(/import\s+\{\s*EditMode\s*\}\s+from\s+['"][^'"]*edit-mode\.js['"]/.test(content),
                'main.entry.js 应 import { EditMode } from edit-mode.js');
            assert.ok(/globalThis\.EditMode\s*=\s*EditMode/.test(content),
                'main.entry.js 应挂载 globalThis.EditMode');
        });

        test('T10.7 webview/dist/cm6.bundle.js 应存在且体积 > 100KB（非占位）', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'cm6.bundle.js');
            assert.ok(fs.existsSync(bundlePath), 'webview/dist/cm6.bundle.js 应存在');
            const size = fs.statSync(bundlePath).size;
            assert.ok(size > 100 * 1024,
                `cm6.bundle.js 体积应 > 100KB（当前 ${size} 字节），占位版本约 95B`);
        });

        test('T10.8 i18n.js 的 zh 与 en 两表应都含 edit_mode.source key', () => {
            const i18nPath = path.join(extPath, 'webview', 'js', 'i18n.js');
            const content = fs.readFileSync(i18nPath, 'utf-8');
            const zhMatches = content.match(/'edit_mode\.source':\s*'源码'/);
            assert.ok(zhMatches, 'i18n.js 应包含中文 edit_mode.source: 源码');
            const enMatches = content.match(/'edit_mode\.source':\s*'Source'/);
            assert.ok(enMatches, 'i18n.js 应包含英文 edit_mode.source: Source');
            // 另外 3 个 key 都应同时存在（双语计数 ≥ 2）
            for (const k of ['edit_mode.source_toggle_tooltip', 'edit_mode.source_hint', 'edit_mode.source_exit_hint']) {
                const escaped = k.replace(/\./g, '\\.');
                const occurrences = (content.match(new RegExp(`'${escaped}':`, 'g')) || []).length;
                assert.ok(occurrences >= 2, `i18n.js 中 ${k} 应至少出现 2 次（zh+en），实际 ${occurrences}`);
            }
        });
    });

    // =====================================================================
    // Tier 2 — 行为级断言（源码结构）
    // =====================================================================
    suite('Tier 2 — 行为级断言', () => {

        test('T11.1 cm6.entry.js 的 keymap 应含 Ctrl-f/Ctrl-e/Alt-z/F5 四个让路键', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'cm6.entry.js'), 'utf-8');
            assert.ok(/['"]Ctrl-f['"]/.test(content) || /['"]Mod-f['"]/.test(content),
                'cm6.entry.js keymap 应含 Ctrl-f 让路键');
            assert.ok(/['"]Ctrl-e['"]/.test(content) || /['"]Mod-e['"]/.test(content),
                'cm6.entry.js keymap 应含 Ctrl-e 让路键');
            assert.ok(/['"]Alt-z['"]/.test(content),
                'cm6.entry.js keymap 应含 Alt-z 让路键');
            assert.ok(/['"]F5['"]/.test(content),
                'cm6.entry.js keymap 应含 F5 让路键');
        });

        test('T11.2 cm6.entry.js 的 Ctrl-s keymap 应调 onSave 且返回 true', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'cm6.entry.js'), 'utf-8');
            assert.ok(/['"]Ctrl-s['"]/.test(content) || /['"]Mod-s['"]/.test(content),
                'cm6.entry.js keymap 应声明 Ctrl-s');
            // 宽松匹配 onSave 出现（表明 Ctrl-s 触发它）
            assert.ok(/onSave\s*\(/.test(content) || /onSave\?\.\(/.test(content),
                'cm6.entry.js 应调用 onSave() 回调');
        });

        test('T11.3 edit-mode.js 的 enterSource 应读 Store rawMarkdown + 调 CM6.createEditor', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/Store\.getData\s*\(\s*\)|store\.getData\s*\(\s*\)/.test(content) ||
                     /rawMarkdown/.test(content),
                'enterSource 应读 Store.getData().rawMarkdown 或等价路径');
            assert.ok(/CM6\.createEditor|globalThis\.CM6\.createEditor/.test(content),
                'enterSource 应调 CM6.createEditor');
        });

        test('T11.4 edit-mode.js 的 exitSource 应调 .destroy() + setRawMarkdown', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/\.destroy\s*\(\s*\)/.test(content),
                'exitSource 应调用 CM6 实例的 destroy()');
            assert.ok(/setRawMarkdown\s*\(/.test(content),
                'exitSource 应调用 Store.setRawMarkdown 写回真相源');
        });

        test('T11.5 app.js 应在 switchMode / handleSaveMd / scheduleAutoSave 三处加入 EditMode.isSourceActive() 保护', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            // EditMode.isSourceActive() 出现次数应 >= 3
            const protections = (content.match(/EditMode\.isSourceActive\s*\(\s*\)/g) || []).length;
            assert.ok(protections >= 3,
                `app.js 应至少 3 处调用 EditMode.isSourceActive() 做保护，实际 ${protections}`);
        });
    });

    // =====================================================================
    // Tier 3 — 任务特定断言（BT-DualModePhaseA.*）
    // =====================================================================
    suite('Tier 3 — BT-DualModePhaseA.*', () => {

        test('BT-DualModePhaseA.1 cm6.bundle.js 不应包含 eval( 或 new Function(（CSP 兼容）', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'cm6.bundle.js');
            const content = fs.readFileSync(bundlePath, 'utf-8');
            const evalMatches = (content.match(/\beval\s*\(/g) || []).length;
            const fnMatches = (content.match(/\bnew Function\s*\(/g) || []).length;
            assert.strictEqual(evalMatches, 0,
                `cm6.bundle.js 不应含 eval(（匹配数 ${evalMatches}）`);
            assert.strictEqual(fnMatches, 0,
                `cm6.bundle.js 不应含 new Function(（匹配数 ${fnMatches}）`);
        });

        test('BT-DualModePhaseA.2 index.html 的 CSP 约束未倒退', () => {
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(/script-src\s+'nonce-\$\{nonce\}'\s+\$\{cspSource\}/.test(html),
                'CSP script-src 应保留 nonce + cspSource 白名单');
            assert.ok(!/script-src[^;]*'unsafe-eval'[^-]/.test(html),
                'CSP script-src 不应引入 unsafe-eval（wasm-unsafe-eval 例外）');
            assert.ok(!/script-src[^;]*'unsafe-inline'/.test(html),
                'CSP script-src 不应引入 unsafe-inline');
        });

        test('BT-DualModePhaseA.3 edit-mode.js 默认 _active 初值为 false', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/let\s+_active\s*=\s*false/.test(content),
                'edit-mode.js 应有 let _active = false 初值');
            // app.js 的 init 路径不应主动调用 enterSource
            const appContent = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            // 仅允许在 click handler 中调 enterSource，init 路径 grep 不到
            // 简化断言：整文件中 enterSource() 调用不超过 2 次（1 处 click handler 的 EditMode.enterSource()）
            const enterCalls = (appContent.match(/EditMode\.enterSource\s*\(/g) || []).length;
            assert.ok(enterCalls <= 2, `app.js 中 EditMode.enterSource() 调用次数应 <= 2（仅 click handler），实际 ${enterCalls}`);
        });

        test('BT-DualModePhaseA.4 Source Mode 读真相源路径 — enterSource 读 rawMarkdown', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            const enterBody = content.match(/function\s+enterSource\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
            assert.ok(enterBody, 'enterSource 函数体应可被提取');
            assert.ok(/rawMarkdown/.test(enterBody![1]),
                'enterSource 函数体内应引用 rawMarkdown');
        });

        test('BT-DualModePhaseA.5 Source Mode 写真相源路径 — exitSource 写 setRawMarkdown', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            const exitBody = content.match(/function\s+exitSource\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
            assert.ok(exitBody, 'exitSource 函数体应可被提取');
            assert.ok(/setRawMarkdown\s*\(/.test(exitBody![1]),
                'exitSource 函数体内应调用 setRawMarkdown()');
        });

        test('BT-DualModePhaseA.6 构建产物三件套齐全且 cm6 > 100KB、pm 仍占位', () => {
            const distDir = path.join(extPath, 'webview', 'dist');
            const appPath = path.join(distDir, 'app.bundle.js');
            const cm6Path = path.join(distDir, 'cm6.bundle.js');
            const pmPath = path.join(distDir, 'pm.bundle.js');
            assert.ok(fs.existsSync(appPath), 'app.bundle.js 应存在');
            assert.ok(fs.existsSync(cm6Path), 'cm6.bundle.js 应存在');
            assert.ok(fs.existsSync(pmPath), 'pm.bundle.js 应存在（占位）');

            const appSize = fs.statSync(appPath).size;
            const cm6Size = fs.statSync(cm6Path).size;
            const pmSize = fs.statSync(pmPath).size;

            assert.ok(appSize > 100 * 1024, `app.bundle.js 应 > 100KB，实际 ${appSize}`);
            assert.ok(cm6Size > 100 * 1024, `cm6.bundle.js 应 > 100KB（真盘），实际 ${cm6Size}`);
            assert.ok(pmSize < 300, `pm.bundle.js 应仍为占位 < 300B，实际 ${pmSize}`);
        });

        test('BT-DualModePhaseA.7 Store 应暴露 setRawMarkdown setter', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'store.js'), 'utf-8');
            assert.ok(/function\s+setRawMarkdown\s*\(/.test(content),
                'store.js 应定义 setRawMarkdown 函数');
            // 且在 return 对象中导出
            const returnMatch = content.match(/return\s*\{([\s\S]*?)\}\s*;?\s*\}\s*\)\s*\(\s*\)\s*;/);
            assert.ok(returnMatch, 'store.js 应有 return 对象（IIFE 末尾）');
            assert.ok(/setRawMarkdown/.test(returnMatch![1]),
                'store.js return 对象中应包含 setRawMarkdown');
        });
    });
});
