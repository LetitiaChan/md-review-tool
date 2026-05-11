import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..', '..');

suite('Hotfix — Zen Mode VS Code Sidebar Toggle', () => {

    // ===== Tier 1: 存在性断言 =====

    test('BT-ZenMode.1 Tier1 — webviewHelper 应包含 zenModeChanged 消息处理分支', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'webviewHelper.ts'), 'utf-8');
        assert.ok(content.includes("case 'zenModeChanged'"), 'webviewHelper 应处理 zenModeChanged 消息');
    });

    test('BT-ZenMode.2 Tier1 — webview app.js 应发送 zenModeChanged 消息', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'webview', 'js', 'app.js'), 'utf-8');
        assert.ok(content.includes("type: 'zenModeChanged'"), 'app.js 应发送 zenModeChanged 消息');
    });

    // ===== Tier 3: 任务特定断言 =====

    test('BT-ZenMode.3 Tier3 — zenModeChanged handler 应在进入禅模式时关闭侧边栏', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'webviewHelper.ts'), 'utf-8');
        // Extract the zenModeChanged case block
        const caseStart = content.indexOf("case 'zenModeChanged'");
        assert.ok(caseStart > -1, 'should find zenModeChanged case');
        const block = content.substring(caseStart, caseStart + 800);
        assert.ok(block.includes('workbench.action.closeSidebar'), 'should close left sidebar');
        assert.ok(block.includes('workbench.action.closePanel'), 'should close bottom panel');
        assert.ok(block.includes('workbench.action.closeAuxiliaryBar'), 'should close right sidebar (auxiliary bar)');
    });

    test('BT-ZenMode.4 Tier3 — zenModeChanged handler 应在退出禅模式时恢复侧边栏', () => {
        const content = fs.readFileSync(path.join(projectRoot, 'src', 'webviewHelper.ts'), 'utf-8');
        const caseStart = content.indexOf("case 'zenModeChanged'");
        assert.ok(caseStart > -1, 'should find zenModeChanged case');
        const block = content.substring(caseStart, caseStart + 800);
        assert.ok(block.includes('workbench.action.toggleSidebarVisibility'), 'should restore left sidebar');
        assert.ok(block.includes('workbench.action.toggleAuxiliaryBar'), 'should restore right sidebar');
    });
});
