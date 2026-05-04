import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 刷新按钮三策略测试
 *
 * 三层测试模型：
 * - Tier 1: 存在性断言（按钮存在、SVG 图标、i18n 键、弹出菜单结构）
 * - Tier 3: 任务特定断言（三策略行为、脏状态分支、宿主消息处理器）
 */
suite('Refresh Three Strategies Tests', () => {

    const projectRoot = path.resolve(__dirname, '../../..');

    // ===== Tier 1: 存在性断言 =====

    test('BT-refresh.T1.1 index.html 应包含 #btnRefresh 按钮', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(content.includes('id="btnRefresh"'), 'index.html 应包含 id="btnRefresh"');
    });

    test('BT-refresh.T1.2 #btnRefresh 应包含 SVG 图标', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        // 找到 btnRefresh 按钮区域，确认包含 <svg>
        const btnIdx = content.indexOf('id="btnRefresh"');
        assert.ok(btnIdx > -1, 'btnRefresh 应存在');
        // 在按钮附近 500 字符内应有 svg
        const nearby = content.substring(Math.max(0, btnIdx - 200), btnIdx + 300);
        assert.ok(nearby.includes('<svg'), 'btnRefresh 附近应包含 SVG 图标');
    });

    test('BT-refresh.T1.3 #btnRefresh 应具有 data-i18n-title="toolbar.refresh_title"', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(
            content.includes('data-i18n-title="toolbar.refresh_title"'),
            'btnRefresh 应具有 data-i18n-title="toolbar.refresh_title"'
        );
    });

    test('BT-refresh.T1.4 index.html 应包含 refresh-popover 弹出菜单', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(content.includes('refresh-popover'), 'index.html 应包含 refresh-popover');
    });

    test('BT-refresh.T1.5 弹出菜单应包含三个策略选项 (visual/disk/editor)', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(content.includes('data-strategy="visual"'), '应包含 visual 策略选项');
        assert.ok(content.includes('data-strategy="disk"'), '应包含 disk 策略选项');
        assert.ok(content.includes('data-strategy="editor"'), '应包含 editor 策略选项');
    });

    test('BT-refresh.T1.6 i18n.js 应包含 8 个刷新相关 i18n 键', () => {
        const i18nPath = path.join(projectRoot, 'webview', 'js', 'i18n.js');
        const content = fs.readFileSync(i18nPath, 'utf-8');
        const requiredKeys = [
            'toolbar.refresh_title',
            'toolbar.refresh_visual',
            'toolbar.refresh_disk',
            'toolbar.refresh_editor',
            'refresh.dirty_confirm_title',
            'refresh.dirty_confirm_message',
            'refresh.dirty_confirm_discard',
            'refresh.dirty_confirm_cancel',
        ];
        for (const key of requiredKeys) {
            assert.ok(content.includes(`'${key}'`), `i18n.js 应包含键 '${key}'`);
        }
    });

    test('BT-refresh.T1.7 i18n 键在 zh-CN 和 en 下均应存在', () => {
        const i18nPath = path.join(projectRoot, 'webview', 'js', 'i18n.js');
        const content = fs.readFileSync(i18nPath, 'utf-8');
        // 简单检查：toolbar.refresh_title 在文件中出现至少 2 次（zh-CN + en）
        const matches = content.match(/toolbar\.refresh_title/g);
        assert.ok(matches && matches.length >= 2, 'toolbar.refresh_title 应在 zh-CN 和 en 中各出现一次');
    });

    test('BT-refresh.T1.8 app.js 应包含 setupRefreshButton 函数', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(content.includes('function setupRefreshButton'), 'app.js 应包含 setupRefreshButton 函数');
    });

    test('BT-refresh.T1.9 app.js 应包含三个策略处理函数', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(content.includes('refreshVisual'), 'app.js 应包含 refreshVisual');
        assert.ok(content.includes('refreshFromDisk'), 'app.js 应包含 refreshFromDisk');
        assert.ok(content.includes('refreshEditor'), 'app.js 应包含 refreshEditor');
    });

    test('BT-refresh.T1.10 webviewHelper.ts 应包含 getDocumentDirtyState 消息处理器', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(content.includes("'getDocumentDirtyState'"), 'webviewHelper 应处理 getDocumentDirtyState 消息');
    });

    test('BT-refresh.T1.11 webviewHelper.ts 应包含 refresh.showDirtyConfirm 消息处理器', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(content.includes("'refresh.showDirtyConfirm'"), 'webviewHelper 应处理 refresh.showDirtyConfirm 消息');
    });

    test('BT-refresh.T1.12 webviewHelper.ts 应包含 refresh.revertFile 消息处理器', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(content.includes("'refresh.revertFile'"), 'webviewHelper 应处理 refresh.revertFile 消息');
    });

    test('BT-refresh.T1.13 MessageHandlerContext 应包含 getDocumentIsDirty 方法', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(content.includes('getDocumentIsDirty'), 'MessageHandlerContext 应包含 getDocumentIsDirty');
    });

    // ===== Tier 3: 任务特定断言 =====

    test('BT-refresh.1 R1 视觉刷新不应发送 readFile 消息', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        // 提取 refreshVisual 函数体，确认不包含 callHost('readFile'
        const fnStart = content.indexOf('function refreshVisual');
        assert.ok(fnStart > -1, 'refreshVisual 函数应存在');
        // 找到函数体结束（简单启发式：从 fnStart 开始找匹配的 }）
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(!fnBody.includes("callHost('readFile"), 'refreshVisual 不应调用 callHost readFile');
        assert.ok(!fnBody.includes('callHost("readFile'), 'refreshVisual 不应调用 callHost readFile');
    });

    test('BT-refresh.2 R1 视觉刷新应调用 refreshCurrentView', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function refreshVisual');
        assert.ok(fnStart > -1, 'refreshVisual 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('refreshCurrentView'), 'refreshVisual 应调用 refreshCurrentView');
    });

    test('BT-refresh.3 R2 磁盘重载应查询脏状态', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function refreshFromDisk');
        assert.ok(fnStart > -1, 'refreshFromDisk 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('getDocumentDirtyState'), 'refreshFromDisk 应查询 getDocumentDirtyState');
    });

    test('BT-refresh.4 R2 磁盘重载脏状态时应弹确认框', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function refreshFromDisk');
        assert.ok(fnStart > -1, 'refreshFromDisk 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('showDirtyConfirm'), 'refreshFromDisk 脏状态时应发送 showDirtyConfirm');
    });

    test('BT-refresh.5 R2 磁盘重载应进行内容差异比较', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function refreshFromDisk');
        assert.ok(fnStart > -1, 'refreshFromDisk 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('.trim()'), 'refreshFromDisk 应使用 trim 进行内容差异比较');
    });

    test('BT-refresh.6 R4 编辑器重载应发送 revertFile', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function refreshEditor');
        assert.ok(fnStart > -1, 'refreshEditor 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('refresh.revertFile'), 'refreshEditor 应发送 refresh.revertFile');
    });

    test('BT-refresh.7 R4 编辑器重载应有 WebviewPanel 降级逻辑', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function refreshEditor');
        assert.ok(fnStart > -1, 'refreshEditor 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        // 降级逻辑：当 revertFile 返回 fallback 时调用 refreshVisual
        assert.ok(
            fnBody.includes('fallback') || fnBody.includes('refreshVisual'),
            'refreshEditor 应包含降级到 refreshVisual 的逻辑'
        );
    });

    test('BT-refresh.8 Custom Editor 模式 getDocumentIsDirty 应返回真实 isDirty', () => {
        const cepPath = path.join(projectRoot, 'src', 'customEditorProvider.ts');
        const content = fs.readFileSync(cepPath, 'utf-8');
        assert.ok(
            content.includes('getDocumentIsDirty') && content.includes('document.isDirty'),
            'customEditorProvider 应通过 document.isDirty 返回真实脏状态'
        );
    });

    test('BT-refresh.9 WebviewPanel 模式 getDocumentIsDirty 应始终返回 false', () => {
        const rpPath = path.join(projectRoot, 'src', 'reviewPanel.ts');
        const content = fs.readFileSync(rpPath, 'utf-8');
        assert.ok(
            content.includes('getDocumentIsDirty') && content.includes('false'),
            'reviewPanel 的 getDocumentIsDirty 应始终返回 false'
        );
    });

    test('BT-refresh.10 文件选择器保持移除状态', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(!content.includes('id="fileSelect"'), 'index.html 不应包含 fileSelect');
        assert.ok(!content.includes('fileSelectorGroup'), 'index.html 不应包含 fileSelectorGroup');
    });

    test('BT-refresh.11 loadFileList 函数保持移除状态', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(!content.includes('function loadFileList'), 'app.js 不应包含 loadFileList 函数');
    });

    test('BT-refresh.12 markdown.css 应包含 refresh-popover 样式', () => {
        const cssPath = path.join(projectRoot, 'webview', 'css', 'markdown.css');
        const content = fs.readFileSync(cssPath, 'utf-8');
        assert.ok(content.includes('.refresh-popover'), 'markdown.css 应包含 .refresh-popover 样式');
    });

    test('BT-refresh.13 宿主端确认框应使用 modal: true', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(content.includes('modal: true'), 'showDirtyConfirm 应使用 modal: true');
    });

    test('BT-refresh.14 宿主端 revertFile 应执行 workbench.action.revertFile', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(
            content.includes('workbench.action.revertFile'),
            'refresh.revertFile 处理器应执行 workbench.action.revertFile'
        );
    });
});

/**
 * 辅助函数：从函数声明位置提取函数体（括号深度扫描）
 */
function extractFunctionBody(source: string, startIdx: number): string {
    let braceDepth = 0;
    let bodyStart = -1;
    for (let i = startIdx; i < source.length; i++) {
        if (source[i] === '{') {
            if (bodyStart === -1) bodyStart = i;
            braceDepth++;
        } else if (source[i] === '}') {
            braceDepth--;
            if (braceDepth === 0 && bodyStart !== -1) {
                return source.substring(bodyStart, i + 1);
            }
        }
    }
    return source.substring(bodyStart || startIdx);
}
