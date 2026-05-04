/**
 * dual-mode-editor-phase-b.test.ts
 *
 * Tier 1/2/3 回归测试 — Change `add-dual-mode-editor-phase-b-pm-rich`
 *
 * 覆盖 ProseMirror Rich Mode 引擎接入、PM Schema、markdown↔PM 双向桥、
 * 图表 NodeView、批注 Decoration、状态机三态扩展、app.js 三态升级、
 * 工具栏命令适配、CSP 兼容性。
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Dual-Mode Editor Phase B — ProseMirror Rich Mode Test Suite', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    // =====================================================================
    // Tier 1 — 存在性断言
    // =====================================================================
    suite('Tier 1 — 存在性断言', () => {

        test('T10.1 package.json 应声明 12 个 prosemirror-* 依赖', () => {
            const pkgJson = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            const allDeps: Record<string, string> = Object.assign({}, pkgJson.dependencies || {}, pkgJson.devDependencies || {});
            const required = [
                'prosemirror-model', 'prosemirror-state', 'prosemirror-view',
                'prosemirror-transform', 'prosemirror-commands', 'prosemirror-keymap',
                'prosemirror-inputrules', 'prosemirror-schema-list', 'prosemirror-markdown',
                'prosemirror-tables', 'prosemirror-history', 'prosemirror-gapcursor',
            ];
            for (const name of required) {
                assert.ok(allDeps[name], `package.json 应声明 ${name}`);
            }
        });

        test('T10.2 pm.entry.js 应存在且导出 createRichEditor + 挂 globalThis.PM', () => {
            const entryPath = path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js');
            assert.ok(fs.existsSync(entryPath), 'webview/src/entries/pm.entry.js 应存在');
            const content = fs.readFileSync(entryPath, 'utf-8');
            assert.ok(/function\s+createRichEditor\s*\(/.test(content) || /const\s+createRichEditor\s*=/.test(content),
                'pm.entry.js 应定义 createRichEditor 函数');
            assert.ok(/globalThis\.PM\s*=/.test(content),
                'pm.entry.js 应挂载 globalThis.PM');
        });

        test('T10.3 pm-schema.js 应存在且导出 schema', () => {
            const schemaPath = path.join(extPath, 'webview', 'js', 'pm-schema.js');
            assert.ok(fs.existsSync(schemaPath), 'webview/js/pm-schema.js 应存在');
            const content = fs.readFileSync(schemaPath, 'utf-8');
            assert.ok(/export\s+\{[^}]*schema/.test(content),
                'pm-schema.js 应导出 schema');
        });

        test('T10.4 pm-markdown-bridge.js 应存在且导出 parser/serializer', () => {
            const bridgePath = path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js');
            assert.ok(fs.existsSync(bridgePath), 'webview/js/pm-markdown-bridge.js 应存在');
            const content = fs.readFileSync(bridgePath, 'utf-8');
            assert.ok(/export\s+\{[^}]*parser/.test(content),
                'pm-markdown-bridge.js 应导出 parser');
            assert.ok(/export\s+\{[^}]*serializer/.test(content),
                'pm-markdown-bridge.js 应导出 serializer');
        });

        test('T10.5 webview/dist/pm.bundle.js 应存在且体积 > 100KB（非占位）', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'pm.bundle.js');
            assert.ok(fs.existsSync(bundlePath), 'webview/dist/pm.bundle.js 应存在');
            const size = fs.statSync(bundlePath).size;
            assert.ok(size > 100 * 1024,
                `pm.bundle.js 体积应 > 100KB（当前 ${size} 字节），占位版本约 94B`);
        });

        test('T10.6 edit-mode.js 应含 enterRich/exitRich/isRichActive/isAnyEditorActive', () => {
            const emPath = path.join(extPath, 'webview', 'js', 'edit-mode.js');
            const content = fs.readFileSync(emPath, 'utf-8');
            assert.ok(/function\s+enterRich\s*\(/.test(content), 'edit-mode.js 应定义 enterRich');
            assert.ok(/function\s+exitRich\s*\(/.test(content), 'edit-mode.js 应定义 exitRich');
            assert.ok(/function\s+isRichActive\s*\(/.test(content), 'edit-mode.js 应定义 isRichActive');
            assert.ok(/function\s+isAnyEditorActive\s*\(/.test(content), 'edit-mode.js 应定义 isAnyEditorActive');
        });

        test('T10.7 index.html 应含 pmBundleUri 占位符', () => {
            const htmlPath = path.join(extPath, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');
            assert.ok(/\$\{pmBundleUri\}/.test(html),
                'index.html 应包含 ${pmBundleUri} 占位符');
        });

        test('T10.8 webviewHelper.ts 应注入 pmBundleUri', () => {
            const rpPath = path.join(extPath, 'src', 'webviewHelper.ts');
            const content = fs.readFileSync(rpPath, 'utf-8');
            assert.ok(/pmBundleUri\s*=\s*webviewUri\(['"]dist\/pm\.bundle\.js['"]\)/.test(content),
                'webviewHelper.ts 应声明 pmBundleUri = webviewUri("dist/pm.bundle.js")');
            assert.ok(/html\.replace\(\s*\/\\\$\\\{pmBundleUri\\\}\/g/.test(content),
                'webviewHelper.ts 应对 ${pmBundleUri} 做 html.replace');
        });

        test('T10.9 i18n.js 的 zh 与 en 两表应都含 edit_mode.rich key', () => {
            const i18nPath = path.join(extPath, 'webview', 'js', 'i18n.js');
            const content = fs.readFileSync(i18nPath, 'utf-8');
            const zhMatches = content.match(/'edit_mode\.rich':\s*'富文本'/);
            assert.ok(zhMatches, 'i18n.js 应包含中文 edit_mode.rich: 富文本');
            const enMatches = content.match(/'edit_mode\.rich':\s*'Rich'/);
            assert.ok(enMatches, 'i18n.js 应包含英文 edit_mode.rich: Rich');
        });
    });

    // =====================================================================
    // Tier 2 — 行为级断言
    // =====================================================================
    suite('Tier 2 — 行为级断言', () => {

        test('T11.1 pm-schema.js 应定义所有必需的节点类型', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-schema.js'), 'utf-8');
            const requiredNodes = [
                'doc', 'paragraph', 'heading', 'blockquote', 'gh_alert', 'code_block',
                'horizontal_rule', 'bullet_list', 'ordered_list', 'list_item',
                'image', 'hard_break', 'math_inline', 'math_display', 'diagram', 'frontmatter',
            ];
            for (const node of requiredNodes) {
                assert.ok(new RegExp(`['"]?${node}['"]?\\s*:`).test(content) || content.includes(`${node}:`),
                    `pm-schema.js 应定义节点 ${node}`);
            }
        });

        test('T11.2 pm-schema.js 应定义所有必需的标记类型', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-schema.js'), 'utf-8');
            const requiredMarks = [
                'strong', 'em', 'code', 'link', 'strikethrough', 'colored_text',
                'kbd', 'mark', 'subscript', 'superscript', 'underline',
            ];
            for (const mark of requiredMarks) {
                assert.ok(new RegExp(`['"]?${mark}['"]?\\s*:`).test(content) || content.includes(`${mark}:`),
                    `pm-schema.js 应定义标记 ${mark}`);
            }
        });

        test('T11.3 edit-mode.js 二态状态机 — MODE 枚举应含 INACTIVE/RICH（不含 SOURCE）', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/INACTIVE/.test(content), 'edit-mode.js 应含 MODE.INACTIVE');
            assert.ok(/RICH/.test(content), 'edit-mode.js 应含 MODE.RICH');
            assert.ok(!/MODE\s*=\s*\{[^}]*SOURCE[^}]*\}/.test(content), 'edit-mode.js MODE 枚举不应含 SOURCE');
        });

        test('T11.4 edit-mode.js 的 enterRich 应读 Store rawMarkdown + 调 PM.createRichEditor', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/PM\.createRichEditor|globalThis\.PM\.createRichEditor/.test(content),
                'enterRich 应调 PM.createRichEditor');
            assert.ok(/rawMarkdown/.test(content),
                'enterRich 应读 rawMarkdown');
        });

        test('T11.5 edit-mode.js 的 exitRich 应调 .destroy() + setRawMarkdown', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            const exitBody = content.match(/function\s+exitRich\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
            assert.ok(exitBody, 'exitRich 函数体应可被提取');
            assert.ok(/\.destroy\s*\(\s*\)/.test(exitBody![1]),
                'exitRich 应调用 PM 实例的 destroy()');
            assert.ok(/setRawMarkdown\s*\(/.test(exitBody![1]),
                'exitRich 应调用 Store.setRawMarkdown');
        });

        test('T11.6 app.js 应含 isRichActive 和 isAnyEditorActive 保护', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(/EditMode\.isRichActive\s*\(\s*\)/.test(content),
                'app.js 应含 EditMode.isRichActive() 调用');
            assert.ok(/EditMode\.isAnyEditorActive\s*\(\s*\)/.test(content),
                'app.js 应含 EditMode.isAnyEditorActive() 调用');
        });

        test('T11.7 app.js handleSaveMd 应有 Rich Mode 分支', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(/rich-mode.*save|Rich Mode.*save|isRichActive.*saveViaHost/s.test(content),
                'handleSaveMd 应有 Rich Mode 保存分支');
        });

        test('T11.8 pm.entry.js 的 keymap 应含 G1 让路键', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(/['"]Ctrl-f['"]|['"]Mod-f['"]/.test(content), 'pm.entry.js keymap 应含 Ctrl-f 让路键');
            assert.ok(/['"]Ctrl-e['"]|['"]Mod-e['"]/.test(content), 'pm.entry.js keymap 应含 Ctrl-e 让路键');
            assert.ok(/['"]Alt-z['"]/.test(content), 'pm.entry.js keymap 应含 Alt-z 让路键');
            assert.ok(/['"]F5['"]/.test(content), 'pm.entry.js keymap 应含 F5 让路键');
        });
    });

    // =====================================================================
    // Tier 3 — 任务特定断言（BT-DualModePhaseB.*）
    // =====================================================================
    suite('Tier 3 — BT-DualModePhaseB.*', () => {

        test('BT-DualModePhaseB.1 pm.bundle.js 不应包含 eval( 或 new Function(（CSP 兼容）', () => {
            const bundlePath = path.join(extPath, 'webview', 'dist', 'pm.bundle.js');
            const content = fs.readFileSync(bundlePath, 'utf-8');
            const evalMatches = (content.match(/\beval\s*\(/g) || []).length;
            const fnMatches = (content.match(/\bnew Function\s*\(/g) || []).length;
            assert.strictEqual(evalMatches, 0, `pm.bundle.js 不应含 eval(（匹配数 ${evalMatches}）`);
            assert.strictEqual(fnMatches, 0, `pm.bundle.js 不应含 new Function(（匹配数 ${fnMatches}）`);
        });

        test('BT-DualModePhaseB.2 PM schema 应覆盖所有必需节点类型（含表格）', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-schema.js'), 'utf-8');
            // 表格节点由 prosemirror-tables 提供
            assert.ok(/tableNodes/.test(content) || /table_row/.test(content),
                'pm-schema.js 应包含表格节点定义（tableNodes 或 table_row）');
            // 图表节点
            assert.ok(/diagram/.test(content), 'pm-schema.js 应包含 diagram 节点');
            // 数学节点
            assert.ok(/math_inline/.test(content), 'pm-schema.js 应包含 math_inline 节点');
            assert.ok(/math_display/.test(content), 'pm-schema.js 应包含 math_display 节点');
        });

        test('BT-DualModePhaseB.3 pm-markdown-bridge.js 应含自定义 markdown-it 插件', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            assert.ok(/frontmatterPlugin|frontmatter/.test(content), '应含 frontmatter 插件');
            assert.ok(/mathPlugin|math_display|math_inline/.test(content), '应含 math 插件');
            assert.ok(/ghAlertPlugin|gh_alert/.test(content), '应含 GH alert 插件');
            assert.ok(/coloredTextPlugin|colored_text/.test(content), '应含 colored text 插件');
            assert.ok(/diagramPlugin|diagram/.test(content), '应含 diagram 插件');
        });

        test('BT-DualModePhaseB.4 pm.entry.js 应含 DiagramNodeView 类', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(/class\s+DiagramNodeView/.test(content),
                'pm.entry.js 应定义 DiagramNodeView 类');
            assert.ok(/renderPreview/.test(content),
                'DiagramNodeView 应含 renderPreview 方法');
            assert.ok(/enterEdit/.test(content),
                'DiagramNodeView 应含 enterEdit 方法');
        });

        test('BT-DualModePhaseB.5 pm.entry.js 应含批注 decoration plugin', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(/annotationPlugin|buildAnnotationPlugin|annotations-changed/.test(content),
                'pm.entry.js 应含批注 decoration plugin');
            assert.ok(/DecorationSet|Decoration\.inline/.test(content),
                'pm.entry.js 应使用 DecorationSet 或 Decoration.inline');
        });

        test('BT-DualModePhaseB.6 app.js currentMode 不再使用 edit 值', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            const editModeRefs = (content.match(/currentMode\s*===\s*'edit'/g) || []).length;
            assert.strictEqual(editModeRefs, 0,
                `app.js 不应再有 currentMode === 'edit' 引用（实际 ${editModeRefs}）`);
            const richModeRefs = (content.match(/currentMode\s*===\s*'rich'/g) || []).length;
            assert.ok(richModeRefs > 0,
                `app.js 应有 currentMode === 'rich' 引用（实际 ${richModeRefs}）`);
        });

        test('BT-DualModePhaseB.7 markdown.css 应含 rich-mode-active 样式', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
            assert.ok(/rich-mode-active/.test(content),
                'markdown.css 应含 rich-mode-active 样式规则');
            assert.ok(/#richModeContainer/.test(content),
                'markdown.css 应含 #richModeContainer 样式');
            assert.ok(/\.ProseMirror/.test(content),
                'markdown.css 应含 .ProseMirror 样式');
        });
    });

    // ===== Hotfix: Rich Mode 按钮入口恢复 =====
    suite('Rich Mode 按钮入口', () => {
        test('BT-RichModeBtn.1 index.html 应包含 btnToggleRich 按钮（Tier 1 — 存在性断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(html.includes('id="btnToggleRich"'), 'index.html 应包含 btnToggleRich 按钮');
        });

        test('BT-RichModeBtn.2 app.js 应注册 btnToggleRich click 事件并调用 EditMode.enterRich（Tier 2 — 行为级断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(appJs.includes("getElementById('btnToggleRich')"), 'app.js 应获取 btnToggleRich 元素');
            assert.ok(/EditMode\.enterRich\s*\(/.test(appJs), 'app.js 应调用 EditMode.enterRich()');
            assert.ok(appJs.includes('EditMode.exitRich()'), 'app.js 应调用 EditMode.exitRich()');
        });

        test('BT-RichModeBtn.3 i18n 应包含 rich_toggle_tooltip 翻译（Tier 1 — 存在性断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
            assert.ok(i18n.includes('edit_mode.rich_toggle_tooltip'), 'i18n 应包含 rich_toggle_tooltip 翻译键');
        });

        test('BT-RichModeBtn.4 rich-mode-exit 事件应清除 btnToggleRich active 状态（Tier 3 — 回归断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            // rich-mode-exit handler 应获取 btnToggleRich 并移除 active class
            assert.ok(appJs.includes("rich-mode-exit"), 'app.js 应监听 rich-mode-exit 事件');
            const exitHandler = appJs.substring(appJs.indexOf("rich-mode-exit"), appJs.indexOf("rich-mode-exit") + 300);
            assert.ok(exitHandler.includes("btnToggleRich") && exitHandler.includes("remove('active')"),
                'rich-mode-exit handler 应清除 btnToggleRich 的 active 状态');
        });
    });

    // ===== Hotfix: Table token 映射修复 =====
    suite('Table token 映射', () => {
        test('BT-TableParse.1 pm-markdown-bridge.js 应包含 table/tr/th/td token 映射（Tier 1 — 存在性断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bridge = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            assert.ok(/table:\s*\{\s*block:\s*'table'\s*\}/.test(bridge), 'parser 应映射 table → table 节点');
            assert.ok(/tr:\s*\{\s*block:\s*'table_row'\s*\}/.test(bridge), 'parser 应映射 tr → table_row 节点');
            assert.ok(/th:\s*\{[^}]*block:\s*'table_header'/.test(bridge), 'parser 应映射 th → table_header 节点');
            assert.ok(/td:\s*\{[^}]*block:\s*'table_cell'/.test(bridge), 'parser 应映射 td → table_cell 节点');
        });

        test('BT-TableParse.2 thead/tbody 应被 ignore（Tier 2 — 行为级断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bridge = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            assert.ok(/thead:\s*\{\s*ignore:\s*true\s*\}/.test(bridge), 'parser 应 ignore thead token');
            assert.ok(/tbody:\s*\{\s*ignore:\s*true\s*\}/.test(bridge), 'parser 应 ignore tbody token');
        });

        test('BT-TableParse.3 th/td 映射应提取 align 属性（Tier 3 — 回归断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bridge = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            assert.ok(/th:\s*\{[^}]*getAttrs/.test(bridge), 'th 映射应有 getAttrs');
            assert.ok(/td:\s*\{[^}]*getAttrs/.test(bridge), 'td 映射应有 getAttrs');
            assert.ok(/text-align/.test(bridge), 'getAttrs 应解析 text-align 样式');
        });
    });

    // ===== Hotfix: HTML inline/block token 映射修复 =====
    suite('HTML token 映射', () => {
        test('BT-HtmlToken.1 pm-markdown-bridge.js 应包含 html_inline/html_block 兜底映射（Tier 1 — 存在性断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bridge = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            assert.ok(/html_inline:\s*\{[^}]*ignore:\s*true[^}]*noCloseToken:\s*true/.test(bridge),
                'parser 应包含 html_inline → ignore + noCloseToken 兜底映射');
            assert.ok(/html_block:\s*\{[^}]*ignore:\s*true[^}]*noCloseToken:\s*true/.test(bridge),
                'parser 应包含 html_block → ignore + noCloseToken 兜底映射');
        });

        test('BT-HtmlToken.2 应注册 htmlTagConverterPlugin 和 mark token 映射（Tier 2 — 行为级断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bridge = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            // htmlTagConverterPlugin 应被定义并注册
            assert.ok(/function\s+htmlTagConverterPlugin\s*\(/.test(bridge),
                'bridge 应定义 htmlTagConverterPlugin');
            assert.ok(/md\.use\(htmlTagConverterPlugin\)/.test(bridge),
                'bridge 应通过 md.use 注册 htmlTagConverterPlugin');
            // parser 应有 kbd/mark/subscript/superscript/underline 的 mark 映射
            assert.ok(/kbd:\s*\{\s*mark:\s*'kbd'\s*\}/.test(bridge), 'parser 应映射 kbd → mark');
            assert.ok(/subscript:\s*\{\s*mark:\s*'subscript'\s*\}/.test(bridge), 'parser 应映射 subscript → mark');
            assert.ok(/superscript:\s*\{\s*mark:\s*'superscript'\s*\}/.test(bridge), 'parser 应映射 superscript → mark');
            assert.ok(/underline:\s*\{\s*mark:\s*'underline'\s*\}/.test(bridge), 'parser 应映射 underline → mark');
        });

        test('BT-HtmlToken.3 htmlTagConverterPlugin 应识别 <br>/<kbd>/<mark>/<sub>/<sup>/<ins>/<u>（Tier 3 — 任务特定断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bridge = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-markdown-bridge.js'), 'utf-8');
            // markTagMap 应覆盖 kbd/mark/sub/sup/ins/u
            const mapRegion = bridge.substring(
                bridge.indexOf('markTagMap'),
                bridge.indexOf('markTagMap') + 400
            );
            assert.ok(/'kbd'\s*:\s*'kbd'/.test(mapRegion), 'markTagMap 应映射 kbd');
            assert.ok(/'mark'\s*:\s*'mark'/.test(mapRegion), 'markTagMap 应映射 mark');
            assert.ok(/'sub'\s*:\s*'subscript'/.test(mapRegion), 'markTagMap 应映射 sub → subscript');
            assert.ok(/'sup'\s*:\s*'superscript'/.test(mapRegion), 'markTagMap 应映射 sup → superscript');
            assert.ok(/'ins'\s*:\s*'underline'/.test(mapRegion), 'markTagMap 应映射 ins → underline');
            assert.ok(/'u'\s*:\s*'underline'/.test(mapRegion), 'markTagMap 应映射 u → underline');
            // <br> 应被转为 hardbreak
            assert.ok(/kind:\s*'br'/.test(bridge) && /hardbreak/.test(bridge),
                '<br> 应被转换为 hardbreak token');
            // 未识别标签应降级为 text（保证不崩溃）
            assert.ok(/kind:\s*'text'/.test(bridge), '未识别 HTML 标签应降级为 text token');
        });
    });

    // ========= Suite: Rich Mode Editor Toolbar =========
    suite('Rich Mode 编辑器工具栏', () => {
        // ---- Tier 1：存在性断言 ----

        test('BT-EditorToolbar.1 Tier1 — index.html 应包含 #editorToolbar 元素', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(html.includes('id="editorToolbar"'), 'index.html 应包含 #editorToolbar');
        });

        test('BT-EditorToolbar.2 Tier1 — 工具栏应包含所有格式化按钮（data-cmd 属性）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            const expectedCmds = ['bold', 'italic', 'strikethrough', 'h1', 'h2', 'h3', 'ul', 'ol', 'blockquote', 'hr', 'undo', 'redo'];
            for (const cmd of expectedCmds) {
                assert.ok(html.includes(`data-cmd="${cmd}"`), `工具栏应包含 data-cmd="${cmd}" 按钮`);
            }
        });

        test('BT-EditorToolbar.3 Tier1 — 工具栏按钮应使用 data-i18n-title 属性', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            const i18nKeys = ['editor.bold_title', 'editor.italic_title', 'editor.h1_title', 'editor.undo_title', 'editor.redo_title'];
            for (const key of i18nKeys) {
                assert.ok(html.includes(`data-i18n-title="${key}"`), `工具栏按钮应有 data-i18n-title="${key}"`);
            }
        });

        test('BT-EditorToolbar.4 Tier1 — CSS 应包含 #editorToolbar 样式规则', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
            assert.ok(css.includes('#editorToolbar'), 'CSS 应包含 #editorToolbar 规则');
            assert.ok(css.includes('.editor-toolbar-btn'), 'CSS 应包含 .editor-toolbar-btn 规则');
            assert.ok(css.includes('.editor-toolbar-separator'), 'CSS 应包含 .editor-toolbar-separator 规则');
        });

        test('BT-EditorToolbar.5 Tier1 — pm.entry.js 应包含 execCommand 方法和命令映射表', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const pm = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(pm.includes('commandMap'), 'pm.entry.js 应包含 commandMap 命令映射表');
            assert.ok(pm.includes('execCommand'), 'pm.entry.js 应包含 execCommand 方法');
        });

        test('BT-EditorToolbar.6 Tier1 — edit-mode.js 应导出 execCommand 方法', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const editMode = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(editMode.includes('execCommand'), 'edit-mode.js 应包含 execCommand');
            assert.ok(/EditMode\s*=\s*\{[^}]*execCommand/.test(editMode), 'EditMode 导出对象应包含 execCommand');
        });

        // ---- Tier 2：行为级断言 ----

        test('BT-EditorToolbar.7 Tier2 — app.js 应为 editorToolbar 绑定 click 事件委托', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(appJs.includes("getElementById('editorToolbar')"), 'app.js 应获取 editorToolbar 元素');
            assert.ok(appJs.includes("data-cmd"), 'app.js 应读取 data-cmd 属性');
            assert.ok(appJs.includes('EditMode.execCommand'), 'app.js 应调用 EditMode.execCommand');
        });

        test('BT-EditorToolbar.8 Tier2 — app.js 应传入 onSelectionChange 回调给 enterRich', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(appJs.includes('onSelectionChange'), 'app.js 应传入 onSelectionChange 回调');
            assert.ok(appJs.includes('updateEditorToolbarState'), 'app.js 应包含 updateEditorToolbarState 函数');
        });

        test('BT-EditorToolbar.9 Tier2 — CSS 应在 rich-mode-active 时显示工具栏', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
            assert.ok(css.includes('body.rich-mode-active #editorToolbar'), 'CSS 应有 body.rich-mode-active #editorToolbar 规则');
            // 默认隐藏
            const defaultRule = css.substring(css.indexOf('#editorToolbar {'), css.indexOf('#editorToolbar {') + 100);
            assert.ok(defaultRule.includes('display: none'), '默认 #editorToolbar 应 display: none');
        });

        test('BT-EditorToolbar.10 Tier2 — rich-mode-exit 时应清除工具栏按钮状态', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            assert.ok(appJs.includes('clearEditorToolbarState'), 'app.js 应包含 clearEditorToolbarState 函数');
            // 确认在 rich-mode-exit handler 中调用
            const exitIdx = appJs.indexOf("'rich-mode-exit'");
            const afterExit = appJs.slice(exitIdx, exitIdx + 500);
            assert.ok(afterExit.includes('clearEditorToolbarState'), 'rich-mode-exit handler 应调用 clearEditorToolbarState');
        });

        // ---- Tier 3：任务特定断言 ----

        test('BT-EditorToolbar.11 Tier3 — pm.entry.js commandMap 应覆盖所有 12 个命令', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const pm = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            const cmds = ['bold', 'italic', 'strikethrough', 'h1', 'h2', 'h3', 'ul', 'ol', 'blockquote', 'hr', 'undo', 'redo'];
            for (const cmd of cmds) {
                assert.ok(new RegExp(`['"]?${cmd}['"]?\\s*:`).test(pm), `commandMap 应包含 ${cmd} 命令`);
            }
        });

        test('BT-EditorToolbar.12 Tier3 — pm.entry.js onSelectionChange Plugin 应收集 activeMarks 和 blockType', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const pm = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
            assert.ok(pm.includes('onSelectionChange'), 'pm.entry.js 应接受 onSelectionChange 参数');
            assert.ok(pm.includes('activeMarks'), 'onSelectionChange Plugin 应收集 activeMarks');
            assert.ok(pm.includes('blockType'), 'onSelectionChange Plugin 应收集 blockType');
        });

        test('BT-EditorToolbar.13 Tier3 — 工具栏按钮应按功能分组（separator 分隔）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            // 匹配整个 editorToolbar div（包含嵌套 div）
            const startIdx = html.indexOf('id="editorToolbar"');
            assert.ok(startIdx > 0, '应能找到 editorToolbar');
            const endMarker = '<div class="document-content"';
            const endIdx = html.indexOf(endMarker, startIdx);
            const toolbarHtml = html.substring(startIdx, endIdx);
            const separatorCount = (toolbarHtml.match(/editor-toolbar-separator/g) || []).length;
            assert.ok(separatorCount >= 6, `工具栏应至少有 6 个分隔符（实际 ${separatorCount}）`);
        });

        test('BT-EditorToolbar.14 Tier3 — CSS 工具栏按钮应有 .active 高亮样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
            assert.ok(css.includes('.editor-toolbar-btn.active'), 'CSS 应包含 .editor-toolbar-btn.active 样式');
        });

        test('BT-EditorToolbar.15 Tier3 — bundle 产物应包含 commandMap 和 execCommand', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
            assert.ok(bundle.includes('editorToolbar'), 'app.bundle.js 应包含 editorToolbar 引用');
            assert.ok(bundle.includes('execCommand'), 'app.bundle.js 应包含 execCommand');
            assert.ok(bundle.includes('updateEditorToolbarState'), 'app.bundle.js 应包含 updateEditorToolbarState');
        });
    });
});
