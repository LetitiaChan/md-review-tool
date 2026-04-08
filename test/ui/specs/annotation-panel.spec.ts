import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('批注面板测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'annotations.md');
        await waitForRender(page);
    });

    test('BT-annpanel.1 批注面板存在且可见', async ({ page }) => {
        const annotationsPanel = page.locator('#annotationsPanel');
        await expect(annotationsPanel).toBeVisible();
    });

    test('BT-annpanel.2 批注列表容器存在', async ({ page }) => {
        const annotationsList = page.locator('#annotationsList');
        await expect(annotationsList).toBeVisible();
    });

    test('BT-annpanel.3 排序选择器存在且有选项', async ({ page }) => {
        const sortSelect = page.locator('#sortSelect');
        await expect(sortSelect).toBeVisible();

        // 检查选项数量
        const options = page.locator('#sortSelect option');
        const count = await options.count();
        expect(count).toBeGreaterThanOrEqual(2); // 至少有按位置和按时间
    });

    test('BT-annpanel.4 排序选择器可以切换排序方式', async ({ page }) => {
        const sortSelect = page.locator('#sortSelect');

        // 切换到按时间排序
        await sortSelect.selectOption('time');
        await page.waitForTimeout(200);

        const value = await sortSelect.inputValue();
        expect(value).toBe('time');

        // 切换到按类型排序
        await sortSelect.selectOption('type');
        await page.waitForTimeout(200);

        const value2 = await sortSelect.inputValue();
        expect(value2).toBe('type');
    });

    test('BT-annpanel.5 隐藏批注面板按钮工作正常', async ({ page }) => {
        const annotationsPanel = page.locator('#annotationsPanel');
        await expect(annotationsPanel).toBeVisible();

        // 点击隐藏按钮
        await page.locator('#btnHideAnnotations').click();
        await page.waitForTimeout(300);

        // 批注面板应添加 collapsed 类
        const isCollapsed = await annotationsPanel.evaluate(el => el.classList.contains('collapsed'));
        expect(isCollapsed).toBe(true);
    });

    test('BT-annpanel.6 手动添加批注卡片后列表显示', async ({ page }) => {
        // 手动创建一个批注卡片
        await page.evaluate(() => {
            const list = document.getElementById('annotationsList');
            if (!list) return;
            const card = document.createElement('div');
            card.className = 'annotation-card';
            card.setAttribute('data-annotation-id', 'test-1');
            card.innerHTML = `
                <div class="annotation-type-badge">💬</div>
                <div class="annotation-content">测试批注内容</div>
                <div class="annotation-meta">测试文本</div>
            `;
            list.appendChild(card);
        });

        // 验证批注卡片存在
        const cards = page.locator('.annotation-card');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('BT-annpanel.7 批注搜索框存在', async ({ page }) => {
        const searchInput = page.locator('#annotationSearchInput');
        await expect(searchInput).toBeVisible();
    });
});
