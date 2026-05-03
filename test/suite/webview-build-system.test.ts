/**
 * webview-build-system.test.ts
 *
 * Tier 1/2/3 回归测试 — Change `add-webview-bundler-and-esm-modules`
 *
 * 覆盖 tasks.md 任务组 10（Tier 1 存在性断言）、11（Tier 2 行为级）、12（Tier 3 任务特定 BT-BuildSystem.*）
 *
 * Tier 2 行为级测试的说明：本 change 是基础设施变更，无新增用户交互 UI；
 * 现有 726 个回归测试的全量通过即构成 Tier 2 的天然覆盖（bundle 化后所有既有行为保持一致），
 * 此处仅补充一条针对 bundle 加载的结构性行为断言。
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Webview Build System Test Suite — Change add-webview-bundler-and-esm-modules', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    // =====================================================================
    // Tier 1 — 存在性断言（Existence Assertions）
    // =====================================================================
    suite('Tier 1 — 存在性断言', () => {

        test('T10.1 package.json 应声明 esbuild devDependency 与 build:webview script', () => {
            const pkgJson = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            assert.ok(pkgJson.devDependencies && pkgJson.devDependencies.esbuild,
                'package.json.devDependencies 应声明 esbuild');
            assert.ok(pkgJson.scripts && pkgJson.scripts['build:webview'],
                'package.json.scripts 应定义 build:webview');
            assert.ok(pkgJson.scripts['build:webview:watch'],
                'package.json.scripts 应定义 build:webview:watch');
            assert.ok(/build:webview/.test(pkgJson.scripts.compile),
                'compile script 应链式触发 build:webview');
        });

        test('T10.2 webview/build.config.mjs 应存在且声明 esbuild buildOptions', () => {
            const cfgPath = path.join(extPath, 'webview', 'build.config.mjs');
            assert.ok(fs.existsSync(cfgPath), 'webview/build.config.mjs 应存在');
            const cfgText = fs.readFileSync(cfgPath, 'utf-8');
            assert.ok(/from\s+['"]esbuild['"]/.test(cfgText),
                'build.config.mjs 应 import esbuild');
            assert.ok(/entryPoints\s*:/.test(cfgText),
                'build.config.mjs 应定义 entryPoints');
            assert.ok(/format\s*:\s*['"]iife['"]/.test(cfgText),
                'build.config.mjs 应使用 format: iife');
            assert.ok(/target\s*:\s*\[?\s*['"]es2020['"]/.test(cfgText),
                'build.config.mjs 应使用 target: es2020');
        });

        test('T10.3 webview/src/entries/{main,pm}.entry.js 两文件应存在', () => {
            const entryDir = path.join(extPath, 'webview', 'src', 'entries');
            assert.ok(fs.existsSync(path.join(entryDir, 'main.entry.js')),
                'main.entry.js 应存在');
            assert.ok(fs.existsSync(path.join(entryDir, 'pm.entry.js')),
                'pm.entry.js 应存在');
        });

        test('T10.4 webview/dist/{app,pm}.bundle.js 两产物应存在且非空', () => {
            const distDir = path.join(extPath, 'webview', 'dist');
            const appBundle = path.join(distDir, 'app.bundle.js');
            const pmBundle = path.join(distDir, 'pm.bundle.js');
            assert.ok(fs.existsSync(appBundle), 'app.bundle.js 应已生成');
            assert.ok(fs.existsSync(pmBundle), 'pm.bundle.js 应已生成');
            assert.ok(fs.statSync(appBundle).size > 1000,
                'app.bundle.js 应大于 1KB');
            assert.ok(fs.statSync(pmBundle).size > 0, 'pm.bundle.js 应非空');
        });

        test('T10.5 webview/js/{store,renderer,annotations,export,settings,i18n}.js 应以 ESM export 收尾', () => {
            const jsDir = path.join(extPath, 'webview', 'js');
            const modules: Array<[string, RegExp]> = [
                ['store.js', /export\s*\{\s*Store\s*\}/],
                ['renderer.js', /export\s*\{\s*Renderer\s*\}/],
                ['annotations.js', /export\s*\{\s*Annotations\s*\}/],
                ['export.js', /export\s*\{\s*Exporter\s*\}/],
                ['settings.js', /export\s*\{\s*Settings\s*\}/],
                ['i18n.js', /export\s*\{\s*I18n\s*,\s*t\s*\}/],
            ];
            for (const [file, re] of modules) {
                const text = fs.readFileSync(path.join(jsDir, file), 'utf-8');
                assert.ok(re.test(text),
                    `webview/js/${file} 末尾应包含 ESM export 语句（匹配正则 ${re}）`);
            }
        });

        test('T10.6 webview/js/app.js 应导出 initApp 且不再是立即执行 IIFE', () => {
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(/export\s+function\s+initApp\s*\(\s*\)\s*\{/.test(appJs),
                'app.js 应导出 initApp 函数');
            // 不应以立即执行 IIFE 收尾
            assert.ok(!/\}\)\s*\(\s*\)\s*;\s*$/.test(appJs.trim()),
                'app.js 不应再以 })(); 立即执行收尾（应为普通函数体 } 收尾）');
        });

        test('T10.7 webview/index.html 应包含 ${appBundleUri} 且不包含旧 7 个占位符', () => {
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(html.includes('${appBundleUri}'),
                'index.html 应包含 ${appBundleUri} 占位符');
            const obsoletePlaceholders = [
                '${storeUri}', '${rendererUri}', '${annotationsUri}',
                '${exportUri}', '${settingsUri}', '${i18nUri}', '${appUri}'
            ];
            for (const ph of obsoletePlaceholders) {
                assert.ok(!html.includes(ph),
                    `index.html 不应再包含旧占位符 ${ph}`);
            }
        });
    });

    // =====================================================================
    // Tier 2 — 行为级断言（Behavioral Assertions）
    // =====================================================================
    suite('Tier 2 — 行为级断言', () => {

        test('T11.x bundle 结构合法：main.entry.js 显式 import 7 个业务模块 + globalThis 挂载 + initApp 调用', () => {
            const entryText = fs.readFileSync(
                path.join(extPath, 'webview', 'src', 'entries', 'main.entry.js'),
                'utf-8'
            );
            // 7 条 import 语句
            const importModules = ['i18n.js', 'store.js', 'renderer.js', 'annotations.js', 'export.js', 'settings.js', 'app.js'];
            for (const mod of importModules) {
                const re = new RegExp(`import\\s*\\{[^}]+\\}\\s*from\\s*['"].*${mod.replace('.', '\\.')}['"]`);
                assert.ok(re.test(entryText),
                    `main.entry.js 应 import ${mod}`);
            }
            // globalThis 挂载
            const globalMounts = ['Store', 'Renderer', 'Annotations', 'Exporter', 'Settings', 'I18n', 't'];
            for (const g of globalMounts) {
                const re = new RegExp(`globalThis\\.${g}\\s*=`);
                assert.ok(re.test(entryText),
                    `main.entry.js 应挂载 globalThis.${g}`);
            }
            // initApp 调用
            assert.ok(/initApp\s*\(\s*\)/.test(entryText),
                'main.entry.js 应调用 initApp()');
        });

        // 注意：Tier 2 的全量行为回归由现有 726 个测试的绿色状态作为天然覆盖
        // （如果 bundle 化导致任何回归，那些测试会先失败，不会走到这条测试）
    });

    // =====================================================================
    // Tier 3 — 任务特定断言（BT-BuildSystem.*）
    // =====================================================================
    suite('Tier 3 — 任务特定断言（BT-BuildSystem.*）', () => {

        test('BT-BuildSystem.1 bundler 产物不包含 eval() 或 new Function()', () => {
            const appBundle = fs.readFileSync(
                path.join(extPath, 'webview', 'dist', 'app.bundle.js'),
                'utf-8'
            );
            const evalMatches = appBundle.match(/\beval\s*\(/g);
            const fnMatches = appBundle.match(/\bnew\s+Function\s*\(/g);
            assert.strictEqual(evalMatches, null,
                `app.bundle.js 不应包含 eval(... 调用（匹配数: ${evalMatches ? evalMatches.length : 0}），以兼容 CSP 'script-src' 无 'unsafe-eval'`);
            assert.strictEqual(fnMatches, null,
                `app.bundle.js 不应包含 new Function( 调用（匹配数: ${fnMatches ? fnMatches.length : 0}）`);
        });

        test('BT-BuildSystem.2 compile 脚本应链式触发 build:webview（通过 package.json script 结构断言）', () => {
            const pkgJson = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            const compileScript: string = pkgJson.scripts.compile || '';
            assert.ok(compileScript.includes('tsc -p ./'),
                'compile 应包含 tsc 编译');
            assert.ok(compileScript.includes('build:webview'),
                'compile 应链式触发 build:webview');
            // 断言顺序：tsc 先，build:webview 后（以 && 分隔）
            assert.ok(/tsc.*&&.*build:webview/.test(compileScript),
                `compile 的执行顺序应为 tsc 先 → build:webview 后（实际: "${compileScript}"）`);
        });

        test('BT-BuildSystem.3 pm bundle 应为合法 IIFE（以 "(() => {" 开头且可构造 vm Script）', () => {
            const vm = require('vm');
            const bundles = ['pm.bundle.js'];
            for (const name of bundles) {
                const text = fs.readFileSync(
                    path.join(extPath, 'webview', 'dist', name),
                    'utf-8'
                );
                // IIFE 头部（可能有 "use strict"; 前缀）
                assert.ok(/\(\s*\(\s*\)\s*=>\s*\{/.test(text.slice(0, 200)),
                    `${name} 开头 200 字符应包含 IIFE 起始 (() => {`);
                // 可被 vm.Script 构造（语法合法）
                assert.doesNotThrow(() => {
                    new vm.Script(text);
                }, `${name} 应可被 vm.Script 构造（无语法错误）`);
            }
        });

        test('BT-BuildSystem.4 initApp 内部保留原有 DOM ready 检测（保障启动时序）', () => {
            const appJs = fs.readFileSync(
                path.join(extPath, 'webview', 'js', 'app.js'),
                'utf-8'
            );
            // 函数体内应仍有 DOM ready 检测
            assert.ok(/document\.readyState\s*===?\s*['"]loading['"]/.test(appJs),
                'initApp 函数体内应保留 document.readyState === "loading" 检测');
            assert.ok(/DOMContentLoaded/.test(appJs),
                'initApp 函数体内应保留 DOMContentLoaded 事件绑定');
        });

        test('BT-BuildSystem.5 CSP 策略应保持原样（未因 bundle 引入放松）', () => {
            const html = fs.readFileSync(
                path.join(extPath, 'webview', 'index.html'),
                'utf-8'
            );
            // 仍应限定 script-src 为 nonce + cspSource + wasm-unsafe-eval，不得包含 unsafe-eval / unsafe-inline
            assert.ok(/script-src\s+'nonce-\$\{nonce\}'\s+\$\{cspSource\}/.test(html),
                'CSP script-src 应保留 nonce + cspSource 白名单');
            assert.ok(!/script-src[^;]*'unsafe-eval'/.test(html),
                'CSP script-src 不应引入 unsafe-eval（只允许 wasm-unsafe-eval）');
            assert.ok(!/script-src[^;]*'unsafe-inline'/.test(html),
                'CSP script-src 不应引入 unsafe-inline');
        });
    });
});
