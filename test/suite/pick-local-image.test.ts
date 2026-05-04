import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('Pick Local Image for Editor Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-PickLocalImage.T1.1 Tier1 — index.html 应包含 imagePickLocalBtn 按钮', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('id="imagePickLocalBtn"'), 'index.html 应包含 imagePickLocalBtn 按钮');
    });

    test('BT-PickLocalImage.T1.2 Tier1 — index.html 图片 popover 应包含分隔线', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
        assert.ok(html.includes('popover-divider'), 'index.html 应包含 popover-divider 分隔线');
    });

    test('BT-PickLocalImage.T1.3 Tier1 — webviewHelper.ts 编译产物应包含 pickImageForEditor 消息处理器', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const helperJs = fs.readFileSync(path.join(extPath, 'out', 'webviewHelper.js'), 'utf-8');
        assert.ok(
            helperJs.includes("case 'pickImageForEditor'"),
            'webviewHelper.js 应包含 pickImageForEditor case'
        );
    });

    test('BT-PickLocalImage.T1.4 Tier1 — webviewHelper.ts 源码应包含 pickImageForEditor 处理器', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const helperTs = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
        assert.ok(
            helperTs.includes("case 'pickImageForEditor'"),
            'webviewHelper.ts 源码应包含 pickImageForEditor case'
        );
    });

    test('BT-PickLocalImage.T1.5 Tier1 — i18n.js 应包含 image_pick_local 和 image_or 翻译键（中英双语）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        assert.ok(i18n.includes("'editor.image_pick_local'"), 'i18n.js 应包含 editor.image_pick_local 键');
        assert.ok(i18n.includes("'editor.image_or'"), 'i18n.js 应包含 editor.image_or 键');
        // 验证中英文都有
        assert.ok(i18n.includes('选择本地图片'), 'i18n.js 应包含中文翻译"选择本地图片"');
        assert.ok(i18n.includes('Pick Local Image'), 'i18n.js 应包含英文翻译"Pick Local Image"');
    });

    test('BT-PickLocalImage.T1.6 Tier1 — app.bundle.js 应包含 pickImageForEditor 调用', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const bundle = fs.readFileSync(path.join(extPath, 'webview', 'dist', 'app.bundle.js'), 'utf-8');
        assert.ok(bundle.includes('pickImageForEditor'), 'app.bundle.js 应包含 pickImageForEditor 调用');
    });

    test('BT-PickLocalImage.T1.7 Tier1 — markdown.css 应包含 popover-pick-btn 和 popover-divider 样式', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');
        assert.ok(css.includes('.popover-pick-btn'), 'markdown.css 应包含 .popover-pick-btn 样式');
        assert.ok(css.includes('.popover-divider'), 'markdown.css 应包含 .popover-divider 样式');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-PickLocalImage.1 Tier3 — pickImageForEditor 处理器应调用 showOpenDialog 且限制图片类型', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const helperTs = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
        // 提取 pickImageForEditor case 块
        const caseStart = helperTs.indexOf("case 'pickImageForEditor'");
        const caseEnd = helperTs.indexOf("case '", caseStart + 30);
        const caseBlock = helperTs.substring(caseStart, caseEnd);
        assert.ok(caseBlock.includes('showOpenDialog'), 'pickImageForEditor 应调用 showOpenDialog');
        assert.ok(caseBlock.includes('canSelectMany: true'), 'pickImageForEditor 应支持多选');
        assert.ok(caseBlock.includes("'png'") && caseBlock.includes("'jpg'") && caseBlock.includes("'svg'"),
            'pickImageForEditor 应限制图片文件类型');
    });

    test('BT-PickLocalImage.2 Tier3 — pickImageForEditor 应使用 copyFileSync 而非 base64 编码', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const helperTs = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
        const caseStart = helperTs.indexOf("case 'pickImageForEditor'");
        const caseEnd = helperTs.indexOf("case '", caseStart + 30);
        const caseBlock = helperTs.substring(caseStart, caseEnd);
        assert.ok(caseBlock.includes('copyFileSync'), 'pickImageForEditor 应使用 copyFileSync 直接复制文件');
        assert.ok(!caseBlock.includes('readFileSync') || !caseBlock.includes('base64'),
            'pickImageForEditor 不应使用 base64 编码（应直接复制文件）');
    });

    test('BT-PickLocalImage.3 Tier3 — pickImageForEditor 返回结果应包含 relativePath 和 webviewUri', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const helperTs = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
        const caseStart = helperTs.indexOf("case 'pickImageForEditor'");
        const caseEnd = helperTs.indexOf("case '", caseStart + 30);
        const caseBlock = helperTs.substring(caseStart, caseEnd);
        assert.ok(caseBlock.includes('relativePath'), '返回结果应包含 relativePath');
        assert.ok(caseBlock.includes('webviewUri'), '返回结果应包含 webviewUri');
    });

    test('BT-PickLocalImage.4 Tier3 — app.js setupImagePopover 应获取 imagePickLocalBtn 并绑定 click 事件', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(appJs.includes("getElementById('imagePickLocalBtn')"), 'app.js 应获取 imagePickLocalBtn 元素');
        assert.ok(appJs.includes('pickImageForEditor'), 'app.js 应调用 pickImageForEditor');
    });

    test('BT-PickLocalImage.5 Tier3 — app.js 选取图片后应更新 Renderer 图片 URI 缓存', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
        // 在 pickImageForEditor 回调中应更新缓存
        const pickIdx = appJs.indexOf('pickImageForEditor');
        const closePopIdx = appJs.indexOf('closeAllPopovers', pickIdx);
        const block = appJs.substring(pickIdx, closePopIdx);
        assert.ok(block.includes('getImageUriCache'), '选取图片后应更新 Renderer 图片 URI 缓存');
    });

    test('BT-PickLocalImage.6 Tier3 — pickImageForEditor 用户取消时应返回空 images 数组', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const helperTs = fs.readFileSync(path.join(extPath, 'src', 'webviewHelper.ts'), 'utf-8');
        const caseStart = helperTs.indexOf("case 'pickImageForEditor'");
        const caseEnd = helperTs.indexOf("case '", caseStart + 30);
        const caseBlock = helperTs.substring(caseStart, caseEnd);
        assert.ok(
            caseBlock.includes('images: []'),
            'pickImageForEditor 用户取消时应返回 { success: true, images: [] }'
        );
    });
});
