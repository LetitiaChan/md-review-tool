import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 刷新按钮简化测试（simplify-refresh-button）
 *
 * 设计变更：
 * - 移除 3 策略弹出菜单
 * - 点击 #btnRefresh 直接触发"从磁盘重载"（refreshFromDisk）
 * - 按钮位置从工具栏中部移到最右侧（#btnSettings 之后）
 * - 删除 refreshVisual / refreshEditor 函数和对应 i18n 键
 *
 * 按需分层测试模型：
 * - Tier 1: 存在性/不存在性断言（5 个）
 * - Tier 3: 任务特定断言（5 个）
 * - Tier 2: 不适用（交互行为通过 Tier 3 对函数体的源码断言完整覆盖）
 */
suite('Refresh Simplified Tests', () => {

    const projectRoot = path.resolve(__dirname, '../../..');

    // ===== Tier 1: 存在性 / 不存在性断言 =====

    test('BT-refreshSimplified.T1.1 #btnRefresh 按钮应存在且包含 SVG 图标', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(content.includes('id="btnRefresh"'), 'index.html 应包含 id="btnRefresh"');
        const btnIdx = content.indexOf('id="btnRefresh"');
        const nearby = content.substring(Math.max(0, btnIdx - 200), btnIdx + 300);
        assert.ok(nearby.includes('<svg'), 'btnRefresh 附近应包含 SVG 图标');
    });

    test('BT-refreshSimplified.T1.2 #btnRefresh 应具有 data-i18n-title="toolbar.refresh_title"', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(
            content.includes('data-i18n-title="toolbar.refresh_title"'),
            'btnRefresh 应具有 data-i18n-title="toolbar.refresh_title"'
        );
    });

    test('BT-refreshSimplified.T1.3 index.html 不应再包含 refresh-popover 和 data-strategy', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        assert.ok(!content.includes('refresh-popover'), 'index.html 不应包含 refresh-popover');
        assert.ok(!content.includes('data-strategy="visual"'), 'index.html 不应包含 data-strategy="visual"');
        assert.ok(!content.includes('data-strategy="disk"'), 'index.html 不应包含 data-strategy="disk"');
        assert.ok(!content.includes('data-strategy="editor"'), 'index.html 不应包含 data-strategy="editor"');
    });

    test('BT-refreshSimplified.T1.4 i18n.js 不应包含 toolbar.refresh_visual / toolbar.refresh_editor 键', () => {
        const i18nPath = path.join(projectRoot, 'webview', 'js', 'i18n.js');
        const content = fs.readFileSync(i18nPath, 'utf-8');
        assert.ok(!content.includes("'toolbar.refresh_visual'"), "i18n.js 不应包含 'toolbar.refresh_visual'");
        assert.ok(!content.includes("'toolbar.refresh_editor'"), "i18n.js 不应包含 'toolbar.refresh_editor'");
    });

    test('BT-refreshSimplified.T1.5 i18n.js 应包含 disk 通知键（zh + en 各 1 次）', () => {
        const i18nPath = path.join(projectRoot, 'webview', 'js', 'i18n.js');
        const content = fs.readFileSync(i18nPath, 'utf-8');
        const requiredKeys = [
            'toolbar.refresh_disk_updated',
            'toolbar.refresh_disk_unchanged',
            'toolbar.refresh_disk_error',
        ];
        for (const key of requiredKeys) {
            const matches = content.match(new RegExp(`'${key.replace(/\./g, '\\.')}'`, 'g'));
            assert.ok(matches && matches.length >= 2, `i18n.js 应包含键 '${key}'（zh + en 各 1 次）`);
        }
    });

    // ===== Tier 3: 任务特定断言 =====

    test('BT-refreshSimplified.1 app.js 应包含 setupRefreshButton 和 refreshFromDisk，不应定义 refreshVisual / refreshEditor 函数', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        assert.ok(content.includes('function setupRefreshButton'), 'app.js 应包含 setupRefreshButton');
        assert.ok(content.includes('function refreshFromDisk') || content.includes('async function refreshFromDisk'),
            'app.js 应包含 refreshFromDisk');
        assert.ok(!content.includes('function refreshVisual'), 'app.js 不应定义 refreshVisual 函数');
        assert.ok(!content.includes('function refreshEditor') && !content.includes('async function refreshEditor'),
            'app.js 不应定义 refreshEditor 函数');
    });

    test('BT-refreshSimplified.2 setupRefreshButton 函数体应直接调用 refreshFromDisk，不含 popover / data-strategy / closeAllPopovers', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.indexOf('function setupRefreshButton');
        assert.ok(fnStart > -1, 'setupRefreshButton 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('refreshFromDisk'), 'setupRefreshButton 应调用 refreshFromDisk');
        assert.ok(!fnBody.includes('.popover'), 'setupRefreshButton 不应引用 .popover');
        assert.ok(!fnBody.includes('data-strategy'), 'setupRefreshButton 不应引用 data-strategy');
        assert.ok(!fnBody.includes('closeAllPopovers'), 'setupRefreshButton 不应调用 closeAllPopovers');
    });

    test('BT-refreshSimplified.3 refreshFromDisk 应保留脏状态查询 + 内容差异 + 新版本创建逻辑', () => {
        const appPath = path.join(projectRoot, 'webview', 'js', 'app.js');
        const content = fs.readFileSync(appPath, 'utf-8');
        const fnStart = content.search(/(async\s+)?function\s+refreshFromDisk/);
        assert.ok(fnStart > -1, 'refreshFromDisk 函数应存在');
        const fnBody = extractFunctionBody(content, fnStart);
        assert.ok(fnBody.includes('getDocumentDirtyState'), 'refreshFromDisk 应查询脏状态');
        assert.ok(fnBody.includes('showDirtyConfirm'), 'refreshFromDisk 脏状态时应弹出确认框');
        assert.ok(fnBody.includes('.trim()'), 'refreshFromDisk 应做 trim 差异比较');
        assert.ok(fnBody.includes('contentChanged'), 'refreshFromDisk 应使用 contentChanged 作为 isNew 触发新版本');
    });

    test('BT-refreshSimplified.4 工具栏右侧 btnRefreshWrapper 应位于 btnSettings 之后（最右侧）', () => {
        const htmlPath = path.join(projectRoot, 'webview', 'index.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');
        const settingsIdx = content.indexOf('id="btnSettings"');
        const refreshIdx = content.indexOf('id="btnRefreshWrapper"');
        assert.ok(settingsIdx > -1, 'index.html 应包含 btnSettings');
        assert.ok(refreshIdx > -1, 'index.html 应包含 btnRefreshWrapper');
        assert.ok(refreshIdx > settingsIdx,
            `btnRefreshWrapper 应位于 btnSettings 之后（settingsIdx=${settingsIdx}, refreshIdx=${refreshIdx}）`);
    });

    test('BT-refreshSimplified.5 webviewHelper.ts 应保留 getDocumentDirtyState 和 refresh.showDirtyConfirm 消息处理器', () => {
        const helperPath = path.join(projectRoot, 'src', 'webviewHelper.ts');
        const content = fs.readFileSync(helperPath, 'utf-8');
        assert.ok(content.includes("'getDocumentDirtyState'"),
            'webviewHelper 应处理 getDocumentDirtyState 消息');
        assert.ok(content.includes("'refresh.showDirtyConfirm'"),
            'webviewHelper 应处理 refresh.showDirtyConfirm 消息');
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
    return source.substring(bodyStart === -1 ? startIdx : bodyStart);
}
