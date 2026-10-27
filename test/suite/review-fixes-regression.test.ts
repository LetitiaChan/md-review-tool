import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * review-fixes-regression — 2026-10 全库代码评审修复项回归测试
 *
 * 本套件用于在 CI（`npm test`）中守住修复后的关键不变量，防止回退：
 *   - 预览渲染：CSP 兼容、链接行内 Markdown、标题 slug 去重、软换行批注
 *   - 富文本：顶层块批注定位、斜杠命令状态与按键优先级
 *   - 自动保存：用户关闭后不被隐式重新打开
 *   - YAML Front Matter：展开状态与滚动
 *
 * 行为级验证见 test/ui/specs/regression-fixes.spec.ts（Playwright）。
 */
suite('Review Fixes Regression Test Suite', () => {
    let extPath: string;

    /**
     * 读取扩展源码文件的文本内容；测试环境不可用时返回空串
     */
    function readSource(...segments: string[]): string {
        if (!extPath) return '';
        return fs.readFileSync(path.join(extPath, ...segments), 'utf-8');
    }

    /**
     * 提取名为 name 的函数体（大括号配平），找不到时返回空串
     */
    function extractFunctionBody(source: string, name: string): string {
        const start = source.indexOf(`function ${name}(`);
        if (start === -1) return '';
        const open = source.indexOf('{', start);
        if (open === -1) return '';
        let depth = 0;
        for (let i = open; i < source.length; i++) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') {
                depth--;
                if (depth === 0) return source.slice(start, i + 1);
            }
        }
        return '';
    }

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // =====================================================================
    // Tier 1 — 源码不变量
    // =====================================================================

    suite('Tier 1 — 源码不变量', () => {

        test('BT-ReviewFixes.T1.1 renderer.js 不得使用内联 onerror（CSP 会拦截）', () => {
            const source = readSource('webview', 'js', 'renderer.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(!/onerror\s*=\s*"/.test(source),
                'renderer.js 不应出现内联 onerror="..."，webview CSP 禁止内联事件处理器');
            assert.ok(source.includes('function bindImageFallbacks('),
                'renderer.js 应提供 bindImageFallbacks 统一绑定兜底');
            assert.ok(/bindImageFallbacks\(container\)/.test(source),
                'renderBlocks 结束前应调用 bindImageFallbacks(container)');
        });

        test('BT-ReviewFixes.T1.2 链接渲染应使用 parseInline 而非原始 data.text', () => {
            const source = readSource('webview', 'js', 'renderer.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            // renderer.link 是赋值给 renderer.link 的匿名函数，按标记片段截取
            const linkStart = source.indexOf('renderer.link = function');
            const linkEnd = source.indexOf('renderer.image = function', linkStart);
            const snippet = linkStart === -1 ? '' : source.slice(linkStart, linkEnd === -1 ? linkStart + 2000 : linkEnd);
            assert.ok(snippet, '应存在 renderer.link 实现');
            assert.ok(snippet.includes('this.parser.parseInline(data.tokens)'),
                '链接文本必须通过 parseInline 渲染，否则链接内的行内 Markdown 不生效');
            assert.ok(!/let\s+text\s*=\s*data\.text/.test(snippet),
                '不应再直接使用原始 data.text 作为链接 HTML');
        });

        test('BT-ReviewFixes.T1.3 标题 slug 必须去重，并在每次整篇渲染时重置', () => {
            const source = readSource('webview', 'js', 'renderer.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(source.includes('function uniqueHeadingSlug('),
                'renderer.js 应提供 uniqueHeadingSlug 去重函数');
            assert.ok(source.includes('uniqueHeadingSlug(baseSlug)'),
                '标题渲染应调用 uniqueHeadingSlug');
            assert.ok(/_slugCounts\s*=\s*Object\.create\(null\)/.test(source),
                'renderBlocks 开头应重置 _slugCounts，保证 id 稳定');
        });

        test('BT-ReviewFixes.T1.4 批注偏移计算必须把软换行 <br> 计入', () => {
            const source = readSource('webview', 'js', 'annotations.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const body = extractFunctionBody(source, 'computeGlobalOffset');
            assert.ok(body, '应存在 computeGlobalOffset 函数');
            assert.ok(body.includes("node.nodeName === 'BR'"),
                'computeGlobalOffset 必须识别 <br> 节点（breaks:true 的软换行）');
            assert.ok(/globalOffset \+= node\.nodeType === Node\.TEXT_NODE \? node\.textContent\.length : 1/.test(body),
                '<br> 应计为 1 个字符（\\n）');
        });

        test('BT-ReviewFixes.T1.5 关闭自动保存后 triggerAutoSave 不得隐式重新打开', () => {
            const source = readSource('webview', 'js', 'export.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const body = extractFunctionBody(source, 'triggerAutoSave');
            assert.ok(body, '应存在 triggerAutoSave 函数');
            assert.ok(/if\s*\(!autoSaveEnabled\)\s*return;/.test(body),
                'triggerAutoSave 在自动保存关闭时应直接返回');
            assert.ok(!/autoSaveEnabled\s*=\s*true/.test(body),
                'triggerAutoSave 不得把 autoSaveEnabled 置为 true');
        });

        test('BT-ReviewFixes.T1.6 app.js 应按用户配置同步自动保存开关', () => {
            const source = readSource('webview', 'js', 'app.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(source.includes('function syncAutoSaveWithSettings('),
                'app.js 应提供 syncAutoSaveWithSettings');
            assert.ok(/settings\.autoSave\s*!==\s*false/.test(source),
                '应根据 settings.autoSave 决定是否启用自动保存');
            assert.ok(source.includes('Exporter.setAutoSaveDelay('),
                '应把 autoSaveDelay 设置同步给 Exporter');
        });

        test('BT-ReviewFixes.T1.7 斜杠命令 state.apply 必须使用 newState', () => {
            const source = readSource('webview', 'src', 'slash-command', 'slash-command-plugin.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(!/tr\.state/.test(source),
                'Transaction 没有 state 属性，不能使用 tr.state');
            assert.ok(/apply\s*\(tr,\s*prev,\s*oldState,\s*newState\)/.test(source),
                'apply 应接收 newState 参数');
            assert.ok(source.includes('newState.selection.$from'),
                '过滤文本应基于 newState.selection 计算');
        });

        test('BT-ReviewFixes.T1.8 斜杠命令插件必须排在 baseKeymap 之前', () => {
            const source = readSource('webview', 'src', 'entries', 'pm.entry.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const slashIdx = source.indexOf('slashCommandPlugin,');
            const baseKeymapIdx = source.indexOf('keymap(baseKeymap)');
            assert.ok(slashIdx !== -1 && baseKeymapIdx !== -1, '应同时存在斜杠命令插件与 baseKeymap');
            assert.ok(slashIdx < baseKeymapIdx,
                'slashCommandPlugin 必须注册在 keymap(baseKeymap) 之前，否则 Enter 会被 splitBlock 抢先消费');
        });

        test('BT-ReviewFixes.T1.9 blockIndexToPos 只统计顶层块', () => {
            const source = readSource('webview', 'src', 'entries', 'pm.entry.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const body = extractFunctionBody(source, 'blockIndexToPos');
            assert.ok(body, '应存在 blockIndexToPos 函数');
            assert.ok(body.includes('doc.childCount'),
                'blockIndexToPos 应使用 doc.childCount 判断顶层块范围');
            assert.ok(!body.includes('doc.descendants'),
                '不得使用 descendants 全局计数（会把 list_item / table_cell 等嵌套块算进去）');
            assert.ok(source.includes('function collectTextblocks('),
                '应提供 collectTextblocks 在块内摊平文本偏移');
        });

        test('BT-ReviewFixes.T1.10 YAML frontmatter 展开态支持滚动且状态可保持', () => {
            const css = readSource('webview', 'css', 'markdown.css');
            if (!css) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const fmBodyMatch = css.match(/\.fm-body\s*\{([\s\S]*?)\}/);
            assert.ok(fmBodyMatch, '应存在 .fm-body 样式');
            const fmBody = fmBodyMatch![1];
            assert.ok(!/max-height:\s*500px/.test(fmBody),
                '.fm-body 不应再用固定的 500px 高度截断长 frontmatter');
            assert.ok(/overflow-y:\s*auto/.test(fmBody),
                '.fm-body 展开态应可滚动');
            assert.ok(/max-height:\s*70vh/.test(fmBody),
                '.fm-body 应使用视口相关的最大高度');

            const js = readSource('webview', 'js', 'renderer.js');
            assert.ok(js.includes('_frontmatterExpanded'),
                'renderer.js 应持久化 frontmatter 展开状态');
        });
    });

    // =====================================================================
    // Tier 2 — 构建产物
    // =====================================================================

    suite('Tier 2 — 构建产物包含修复', () => {

        test('BT-ReviewFixes.T2.1 app.bundle.js 含图片兜底与 slug 去重实现', () => {
            const bundle = readSource('webview', 'dist', 'app.bundle.js');
            if (!bundle) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(bundle.includes('bindImageFallbacks'), 'app.bundle.js 应包含 bindImageFallbacks');
            assert.ok(bundle.includes('uniqueHeadingSlug'), 'app.bundle.js 应包含 uniqueHeadingSlug');
            assert.ok(!/onerror\s*=\s*"/.test(bundle), 'app.bundle.js 不应残留内联 onerror');
        });

        test('BT-ReviewFixes.T2.2 pm.bundle.js 含顶层块定位实现', () => {
            const bundle = readSource('webview', 'dist', 'pm.bundle.js');
            if (!bundle) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(bundle.includes('collectTextblocks'), 'pm.bundle.js 应包含 collectTextblocks');
        });
    });

    // =====================================================================
    // Tier 3 — 任务特定断言
    // =====================================================================

    suite('Tier 3 — 任务特定断言', () => {

        test('BT-ReviewFixes.T3.1 批注定位：列表之后的块索引不再被嵌套块污染', () => {
            const source = readSource('webview', 'src', 'entries', 'pm.entry.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const body = extractFunctionBody(source, 'blockIndexToPos');
            assert.ok(/blockPos \+= child\.nodeSize/.test(body),
                '应按顶层子节点累加 nodeSize 计算绝对位置');
            assert.ok(body.includes("child.type.name !== 'footnote_def'"),
                '计数时应跳过 footnote_def（预览块列表会移除纯脚注定义块）');
            assert.ok(body.includes('textblocks.length === 0'),
                '块内无文本时应有兜底返回值');
        });

        test('BT-ReviewFixes.T3.2 跨行高亮：三个匹配路径都基于 collectTextSegments', () => {
            const source = readSource('webview', 'js', 'renderer.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            const crossBody = extractFunctionBody(source, 'tryCrossNodeHighlight');
            const partialBody = extractFunctionBody(source, 'tryPartialBlockHighlight');
            const insertBody = extractFunctionBody(source, 'applyInsertHighlight');
            const singleBody = extractFunctionBody(source, 'trySingleNodeHighlight');
            for (const [name, body] of Object.entries({ crossBody, partialBody, insertBody, singleBody })) {
                assert.ok(body.includes('collectTextSegments'), `${name} 应使用 collectTextSegments 计算偏移`);
            }
            assert.ok(/isBreak/.test(partialBody), '块级兜底应过滤 <br> 片段');
        });

        test('BT-ReviewFixes.T3.3 斜杠命令 Enter 越界时回退到首个命令而非报错', () => {
            const source = readSource('webview', 'src', 'slash-command', 'slash-command-plugin.js');
            if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
            assert.ok(/commands\[pluginState\.selectedIndex\]\s*\|\|\s*commands\[0\]/.test(source),
                'selectedIndex 越界时应回退到 commands[0]');
        });

        test('BT-ReviewFixes.T3.4 每个斜杠命令 id 都必须在 commandMap 中有实现', () => {
            const slashSource = readSource('webview', 'src', 'slash-command', 'slash-commands.js');
            const pmSource = readSource('webview', 'src', 'entries', 'pm.entry.js');
            if (!slashSource || !pmSource) { assert.ok(true, '测试环境中扩展路径不可用'); return; }

            // 解析命令集里的 id
            const ids: string[] = [];
            const idRe = /\{\s*id:\s*'([^']+)'/g;
            let match: RegExpExecArray | null;
            while ((match = idRe.exec(slashSource)) !== null) {
                ids.push(match[1]);
            }
            assert.ok(ids.length >= 12, `应解析出至少 12 个斜杠命令，实际 ${ids.length}`);

            // 截取 commandMap 对象字面量
            const mapStart = pmSource.indexOf('const commandMap = {');
            const mapEnd = mapStart === -1 ? -1 : pmSource.indexOf('\n    };', mapStart);
            const mapSource = mapStart === -1 ? '' : pmSource.slice(mapStart, mapEnd === -1 ? undefined : mapEnd);
            assert.ok(mapSource, '应能找到 pm.entry.js 中的 commandMap 定义');

            for (const id of ids) {
                // 避免 "table" 误匹配 "insertTable"
                const keyRe = new RegExp(`(^|[\\s,{])${id}\\s*:`, 'm');
                assert.ok(keyRe.test(mapSource),
                    `斜杠命令 id "${id}" 在 commandMap 中没有对应实现，选中后会静默无效果`);
            }
        });
    });
});
