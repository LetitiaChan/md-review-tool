import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('Markdown 基础渲染测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'basic-rendering.md');
        await waitForRender(page);
    });

    test('BT-render.1 标题渲染（h1~h3）', async ({ page }) => {
        const content = page.locator('#documentContent');

        // 检查 h1 标题
        const h1 = content.locator('h1');
        await expect(h1.first()).toBeVisible();

        // 检查 h2 标题
        const h2 = content.locator('h2');
        const h2Count = await h2.count();
        expect(h2Count).toBeGreaterThanOrEqual(1);

        // 检查 h3 标题
        const h3 = content.locator('h3');
        const h3Count = await h3.count();
        expect(h3Count).toBeGreaterThanOrEqual(1);
    });

    test('BT-render.2 有序/无序列表渲染', async ({ page }) => {
        const content = page.locator('#documentContent');

        // 检查无序列表
        const ul = content.locator('ul');
        const ulCount = await ul.count();
        expect(ulCount).toBeGreaterThanOrEqual(1);

        // 检查有序列表
        const ol = content.locator('ol');
        const olCount = await ol.count();
        expect(olCount).toBeGreaterThanOrEqual(1);

        // 检查列表项数量
        const liItems = content.locator('li');
        const liCount = await liItems.count();
        expect(liCount).toBeGreaterThanOrEqual(5);
    });

    test('BT-render.3 代码块渲染与语法高亮', async ({ page }) => {
        const content = page.locator('#documentContent');

        // 检查 pre > code 元素
        const codeBlocks = content.locator('pre code');
        const codeCount = await codeBlocks.count();
        expect(codeCount).toBeGreaterThanOrEqual(1);

        // 检查语法高亮（hljs 处理后会添加 span 元素）
        const highlightSpans = content.locator('pre code span.hljs-keyword, pre code span.hljs-function, pre code span.hljs-title');
        const spanCount = await highlightSpans.count();
        expect(spanCount).toBeGreaterThanOrEqual(1);
    });

    test('BT-render.4 表格渲染', async ({ page }) => {
        const content = page.locator('#documentContent');

        // 检查 table 元素
        const table = content.locator('table');
        await expect(table.first()).toBeVisible();

        // 检查 thead 和 tbody
        const thead = content.locator('table thead');
        await expect(thead.first()).toBeVisible();

        const tbody = content.locator('table tbody');
        await expect(tbody.first()).toBeVisible();

        // 检查行数（3 行数据 + 1 行表头）
        const rows = content.locator('table tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThanOrEqual(4);

        // 检查列数（3 列）
        const headerCells = content.locator('table thead th');
        const colCount = await headerCells.count();
        expect(colCount).toBe(3);
    });

    test('BT-render.5 KaTeX 数学公式渲染', async ({ page }) => {
        const content = page.locator('#documentContent');

        // 检查 KaTeX 渲染的元素
        const katexElements = content.locator('.katex');
        const katexCount = await katexElements.count();
        expect(katexCount).toBeGreaterThanOrEqual(1);

        // 验证公式内容非空
        const firstKatex = katexElements.first();
        await expect(firstKatex).toBeVisible();
        const text = await firstKatex.textContent();
        expect(text!.length).toBeGreaterThan(0);
    });

    test('BT-render.6 GitHub 风格告警块渲染', async ({ page }) => {
        const content = page.locator('#documentContent');

        // 检查告警块元素（可能使用 .alert-note, .alert-warning 等类名）
        const alerts = content.locator('.alert-note, .alert-warning, .alert-tip, .github-alert, [class*="alert"]');
        const alertCount = await alerts.count();
        expect(alertCount).toBeGreaterThanOrEqual(1);
    });
});
