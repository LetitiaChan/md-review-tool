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

        test('T10.8 reviewPanel.ts 应注入 pmBundleUri', () => {
            const rpPath = path.join(extPath, 'src', 'reviewPanel.ts');
            const content = fs.readFileSync(rpPath, 'utf-8');
            assert.ok(/pmBundleUri\s*=\s*webviewUri\(['"]dist\/pm\.bundle\.js['"]\)/.test(content),
                'reviewPanel.ts 应声明 pmBundleUri = webviewUri("dist/pm.bundle.js")');
            assert.ok(/html\.replace\(\s*\/\\\$\\\{pmBundleUri\\\}\/g/.test(content),
                'reviewPanel.ts 应对 ${pmBundleUri} 做 html.replace');
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

        test('T11.3 edit-mode.js 三态状态机 — MODE 枚举应含 INACTIVE/SOURCE/RICH', () => {
            const content = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
            assert.ok(/INACTIVE/.test(content), 'edit-mode.js 应含 MODE.INACTIVE');
            assert.ok(/SOURCE/.test(content), 'edit-mode.js 应含 MODE.SOURCE');
            assert.ok(/RICH/.test(content), 'edit-mode.js 应含 MODE.RICH');
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
});
