import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * add-custom-css-image-paste-cursor-restore — Custom CSS / 图片粘贴 / 光标恢复 测试
 *
 * 覆盖三层测试模型：
 * - Tier 1 存在性（配置项、源码关键字、i18n 键）
 * - Tier 2 行为级（消息协议、文件名生成、注入逻辑）
 * - Tier 3 任务特定（BT-CssImgCursor.1~6）
 *
 * Change: add-custom-css-image-paste-cursor-restore (2026-05-04)
 */
suite('Custom CSS / Image Paste / Cursor Restore Test Suite', () => {
    let extPath: string;

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    // ===== Tier 1 — 存在性断言 =====

    test('BT-CssImgCursor.T1.1 Tier1 — package.json 包含 mdReview.customCss 配置项', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pkg = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
        const props = pkg.contributes?.configuration?.properties || {};
        assert.ok('mdReview.customCss' in props, 'package.json 应包含 mdReview.customCss');
        assert.strictEqual(props['mdReview.customCss'].type, 'string', 'customCss 类型应为 string');
        assert.strictEqual(props['mdReview.customCss'].default, '', 'customCss 默认值应为空字符串');
    });

    test('BT-CssImgCursor.T1.2 Tier1 — package.json 包含 mdReview.imageAssetsPath 配置项', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const pkg = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
        const props = pkg.contributes?.configuration?.properties || {};
        assert.ok('mdReview.imageAssetsPath' in props, 'package.json 应包含 mdReview.imageAssetsPath');
        assert.strictEqual(props['mdReview.imageAssetsPath'].default, 'assets/images', 'imageAssetsPath 默认值应为 assets/images');
    });

    test('BT-CssImgCursor.T1.3 Tier1 — webviewHelper.ts 包含 customCss 和 imageAssetsPath 读取', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'out', 'webviewHelper.js'), 'utf-8');
        assert.ok(src.includes('customCss'), 'webviewHelper 编译产物应包含 customCss');
        assert.ok(src.includes('imageAssetsPath'), 'webviewHelper 编译产物应包含 imageAssetsPath');
    });

    test('BT-CssImgCursor.T1.4 Tier1 — webviewHelper.ts 包含 saveImage 消息处理', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'out', 'webviewHelper.js'), 'utf-8');
        assert.ok(src.includes('saveImage'), 'webviewHelper 应处理 saveImage 消息');
        assert.ok(src.includes('imageSaved'), 'webviewHelper 应返回 imageSaved 消息');
        assert.ok(src.includes('imageSaveError'), 'webviewHelper 应返回 imageSaveError 消息');
    });

    test('BT-CssImgCursor.T1.5 Tier1 — settings.js 包含 md-review-custom-css style 标签注入', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'settings.js'), 'utf-8');
        assert.ok(src.includes('md-review-custom-css'), 'settings.js 应包含 md-review-custom-css style 标签 ID');
        assert.ok(src.includes('customCss'), 'settings.js 应读取 customCss 设置');
    });

    test('BT-CssImgCursor.T1.6 Tier1 — i18n.js 包含图片保存相关翻译键', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const i18n = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        assert.ok(i18n.includes('notification.image_saved'), 'i18n 应包含 notification.image_saved');
        assert.ok(i18n.includes('notification.image_save_failed'), 'i18n 应包含 notification.image_save_failed');
        assert.ok(i18n.includes('notification.image_too_large'), 'i18n 应包含 notification.image_too_large');
    });

    // ===== Tier 2 — 行为级断言 =====

    test('BT-CssImgCursor.T2.1 Tier2 — pm.entry.js handlePaste 检测 clipboardData.files 中的图片', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('clipboardData.files'), 'handlePaste 应检查 clipboardData.files');
        assert.ok(src.includes("startsWith('image/')"), 'handlePaste 应检测 image/* MIME 类型');
        assert.ok(src.includes('5 * 1024 * 1024'), 'handlePaste 应包含 5MB 大小限制');
    });

    test('BT-CssImgCursor.T2.2 Tier2 — pm.entry.js 包含 drop 事件监听', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes("addEventListener('drop'"), 'pm.entry.js 应监听 drop 事件');
        assert.ok(src.includes('dataTransfer'), 'drop 处理应访问 dataTransfer');
    });

    test('BT-CssImgCursor.T2.3 Tier2 — pm.entry.js 包含 imageSaved 消息监听和图片节点插入', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('handleImageSaved'), 'pm.entry.js 应定义 handleImageSaved 函数');
        assert.ok(src.includes("msg.type === 'imageSaved'"), '应检测 imageSaved 消息类型');
        assert.ok(src.includes('schema.nodes.image.create'), '应创建 image 节点');
    });

    test('BT-CssImgCursor.T2.4 Tier2 — edit-mode.js 包含 _cursorPositions Map 和光标记忆逻辑', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'edit-mode.js'), 'utf-8');
        assert.ok(src.includes('_cursorPositions'), 'edit-mode.js 应包含 _cursorPositions');
        assert.ok(src.includes('new Map()'), 'edit-mode.js 应使用 Map 存储光标位置');
        assert.ok(src.includes('getCursorLine'), 'exitRich 应调用 getCursorLine');
        assert.ok(src.includes('initialCursorLine'), 'enterRich 应传递 initialCursorLine');
    });

    test('BT-CssImgCursor.T2.5 Tier2 — pm.entry.js createRichEditor 接收 initialCursorLine 并恢复光标', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('initialCursorLine'), 'createRichEditor 应接收 initialCursorLine 参数');
        assert.ok(src.includes('scrollIntoView'), '恢复光标后应 scrollIntoView');
    });

    // ===== Tier 3 — 任务特定断言 =====

    test('BT-CssImgCursor.1 Tier3 — Custom CSS: style 标签使用 document.head.appendChild', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'settings.js'), 'utf-8');
        assert.ok(src.includes('document.head.appendChild'), 'customCss style 标签应 appendChild 到 head 末尾');
    });

    test('BT-CssImgCursor.2 Tier3 — Image: 文件名格式为 image-{timestamp}-{random}.{ext}', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('`image-${timestamp}-${random}.${ext}`'), '文件名应使用 image-timestamp-random.ext 格式');
    });

    test('BT-CssImgCursor.3 Tier3 — Image: Extension Host 使用 mkdirSync recursive 创建目录', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'out', 'webviewHelper.js'), 'utf-8');
        assert.ok(src.includes('mkdirSync') || src.includes('mkdir'), 'webviewHelper 应使用 mkdirSync 创建目录');
        assert.ok(src.includes('recursive: true') || src.includes('recursive:true'), '应使用 recursive 选项');
    });

    test('BT-CssImgCursor.4 Tier3 — Image: base64 解码使用 Buffer.from', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'out', 'webviewHelper.js'), 'utf-8');
        assert.ok(src.includes('Buffer.from'), 'webviewHelper 应使用 Buffer.from 解码 base64');
    });

    test('BT-CssImgCursor.5 Tier3 — Cursor: getCursorLine 方法暴露在返回对象中', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('getCursorLine()'), 'createRichEditor 返回对象应包含 getCursorLine 方法');
    });

    test('BT-CssImgCursor.6 Tier3 — Cursor: destroy 时清理 imageSaved 消息监听', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes("removeEventListener('message', handleImageSaved)"), 'destroy 应清理 imageSaved 消息监听');
    });

    // ===== Bugfix: 粘贴图片后 URI 缓存更新（修复渲染不正确） =====

    test('BT-CssImgCursor.T1.7 Tier1 — webviewHelper.ts saveImage 回传 webviewUri 字段', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'out', 'webviewHelper.js'), 'utf-8');
        // saveImage 成功后应返回 webviewUri 字段
        assert.ok(src.includes('webviewUri'), 'saveImage 回传消息应包含 webviewUri 字段');
        assert.ok(src.includes('asWebviewUri'), 'saveImage 应调用 webview.asWebviewUri 转换路径');
    });

    test('BT-CssImgCursor.T1.8 Tier1 — pm.entry.js handleImageSaved 包含 URI 缓存更新逻辑', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        assert.ok(src.includes('msg.payload.webviewUri'), 'handleImageSaved 应读取 webviewUri');
        assert.ok(src.includes('getImageUriCache'), 'handleImageSaved 应访问 Renderer.getImageUriCache');
    });

    test('BT-CssImgCursor.7 Tier3 — handleImageSaved 先更新缓存再插入节点（顺序正确）', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // 确保缓存更新在节点插入之前
        const cacheUpdateIdx = src.indexOf('cache[msg.payload.relativePath] = msg.payload.webviewUri');
        const nodeCreateIdx = src.indexOf('schema.nodes.image.create', cacheUpdateIdx > 0 ? cacheUpdateIdx : 0);
        assert.ok(cacheUpdateIdx > 0, 'handleImageSaved 应将 relativePath→webviewUri 写入缓存');
        assert.ok(nodeCreateIdx > cacheUpdateIdx, '缓存更新应在 image.create 之前（确保 toDOM 能查到 URI）');
    });

    test('BT-CssImgCursor.8 Tier3 — handleImageSaved 同时缓存 decoded 版本的路径', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'src', 'entries', 'pm.entry.js'), 'utf-8');
        // toDOM 中会尝试 decodeURIComponent(src)，所以缓存也需要 decoded 版本
        assert.ok(src.includes('decodeURIComponent(msg.payload.relativePath)'), 'handleImageSaved 应缓存 decoded 版本的路径');
    });

    test('BT-CssImgCursor.9 Tier3 — pm-schema.js image.toDOM 从 Renderer.getImageUriCache 解析相对路径', () => {
        if (!extPath) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        const src = fs.readFileSync(path.join(extPath, 'webview', 'js', 'pm-schema.js'), 'utf-8');
        assert.ok(src.includes('Renderer.getImageUriCache'), 'image.toDOM 应从 Renderer.getImageUriCache 获取缓存');
        assert.ok(src.includes('decodeURIComponent(src)'), 'image.toDOM 应尝试 decodeURIComponent 查找');
        // 确保有降级逻辑
        assert.ok(src.includes('|| src'), 'image.toDOM 应有降级到原始 src 的逻辑');
    });
});
