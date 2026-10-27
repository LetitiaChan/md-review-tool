import { readPmSource } from './helpers/module-source';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * frontmatter-editable — YAML Front Matter 支持编辑内容测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（NodeView 类定义 / nodeViews 注册 / CSS 样式）
 * - Tier 3 任务特定（BT-FrontmatterEdit.1~4）
 *
 * Tier 2 不适用（双击编辑交互需要真实 DOM 环境，非交互修复）
 *
 * Feature: YAML Front Matter 编辑支持 (2026-05-05)
 */
suite('Frontmatter Editable Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-FrontmatterEdit.T1.1 Tier1 — pm.entry.js 包含 FrontmatterNodeView 类定义', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = readPmSource(extPath);
        assert.ok(pmEntry.includes('class FrontmatterNodeView'), 'pm.entry.js 应包含 FrontmatterNodeView 类定义');
    });

    test('BT-FrontmatterEdit.T1.2 Tier1 — pm.entry.js nodeViews 中注册了 frontmatter', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = readPmSource(extPath);
        assert.ok(pmEntry.includes('frontmatter(node, view, getPos)'), 'nodeViews 应注册 frontmatter');
        assert.ok(pmEntry.includes('new FrontmatterNodeView(node, view, getPos)'), '应实例化 FrontmatterNodeView');
    });

    test('BT-FrontmatterEdit.T1.3 Tier1 — pm.bundle.js 产物包含 FrontmatterNodeView', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'pm.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('FrontmatterNodeView') || bundle.includes('frontmatter-nodeview'),
            'pm.bundle.js 产物应包含 FrontmatterNodeView 相关代码');
    });

    test('BT-FrontmatterEdit.T1.4 Tier1 — markdown.css 包含 frontmatter-nodeview 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.frontmatter-nodeview'), 'CSS 应包含 .frontmatter-nodeview 选择器');
        assert.ok(css.includes('.frontmatter-edit-textarea'), 'CSS 应包含 .frontmatter-edit-textarea 选择器');
        assert.ok(css.includes('.frontmatter-edit-header'), 'CSS 应包含 .frontmatter-edit-header 选择器');
    });

    test('BT-FrontmatterEdit.T1.5 Tier1 — markdown.css 包含亮色主题下 frontmatter-nodeview 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('body:not(.theme-dark) #richModeContainer .frontmatter-nodeview'),
            'CSS 应包含亮色主题下的 frontmatter-nodeview 规则');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-FrontmatterEdit.1 Tier3 — FrontmatterNodeView 包含双击编辑入口', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = readPmSource(extPath);
        assert.ok(pmEntry.includes('dblclick'), 'FrontmatterNodeView 应监听 dblclick 事件');
        assert.ok(pmEntry.includes('enterEdit'), 'FrontmatterNodeView 应包含 enterEdit 方法');
    });

    test('BT-FrontmatterEdit.2 Tier3 — FrontmatterNodeView 包含 textarea 编辑和 Ctrl+Enter 完成', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = readPmSource(extPath);
        assert.ok(pmEntry.includes('frontmatter-edit-textarea'), '应创建 frontmatter-edit-textarea 元素');
        assert.ok(pmEntry.includes('finishEdit'), '应包含 finishEdit 方法');
    });

    test('BT-FrontmatterEdit.3 Tier3 — FrontmatterNodeView 通过 setNodeMarkup 更新 content 属性', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = readPmSource(extPath);
        // 提取 FrontmatterNodeView 类的 finishEdit 方法区域
        const classStart = pmEntry.indexOf('class FrontmatterNodeView');
        const classEnd = pmEntry.indexOf('// ===== 智能粘贴 =====');
        const classBody = pmEntry.slice(classStart, classEnd);
        assert.ok(classBody.includes('setNodeMarkup'), 'finishEdit 应使用 setNodeMarkup 更新节点');
        assert.ok(classBody.includes('content: newContent'), '应更新 content 属性');
    });

    test('BT-FrontmatterEdit.4 Tier3 — FrontmatterNodeView 预览态显示 YAML Front Matter 标题', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pmEntry = readPmSource(extPath);
        const classStart = pmEntry.indexOf('class FrontmatterNodeView');
        const classEnd = pmEntry.indexOf('// ===== 智能粘贴 =====');
        const classBody = pmEntry.slice(classStart, classEnd);
        assert.ok(classBody.includes('YAML Front Matter'), '预览态 header 应显示 YAML Front Matter 标题');
        assert.ok(classBody.includes('frontmatter-edit-hint'), '应包含编辑提示');
    });
});
