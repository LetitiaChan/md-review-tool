import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('工具栏交互测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'basic-rendering.md');
        await waitForRender(page);
    });

    test('BT-toolbar.1 工具栏存在且可见', async ({ page }) => {
        const toolbar = page.locator('.toolbar');
        await expect(toolbar).toBeVisible();
    });

    test('BT-toolbar.2 禅模式按钮存在且可点击', async ({ page }) => {
        const zenBtn = page.locator('#btnZenMode');
        await expect(zenBtn).toBeVisible();
    });

    test('BT-toolbar.3 点击禅模式按钮添加 zen-mode 类', async ({ page }) => {
        const body = page.locator('body');

        // 初始不应有 zen-mode 类
        const initialZen = await body.evaluate(el => el.classList.contains('zen-mode'));
        expect(initialZen).toBe(false);

        // 点击禅模式按钮
        await page.locator('#btnZenMode').click();
        await page.waitForTimeout(300);

        // 应添加 zen-mode 类
        const afterZen = await body.evaluate(el => el.classList.contains('zen-mode'));
        expect(afterZen).toBe(true);
    });

    test('BT-toolbar.4 再次点击禅模式按钮退出禅模式', async ({ page }) => {
        // 进入禅模式
        await page.locator('#btnZenMode').click();
        await page.waitForTimeout(300);

        // 退出禅模式
        await page.locator('#btnZenMode').click();
        await page.waitForTimeout(300);

        const body = page.locator('body');
        const hasZen = await body.evaluate(el => el.classList.contains('zen-mode'));
        expect(hasZen).toBe(false);
    });

    test('BT-toolbar.5 主题切换按钮存在且可点击', async ({ page }) => {
        const themeBtn = page.locator('#btnToggleTheme');
        await expect(themeBtn).toBeVisible();
    });

    test('BT-toolbar.6 点击主题按钮切换 theme-dark 类', async ({ page }) => {
        const body = page.locator('body');
        const initialDark = await body.evaluate(el => el.classList.contains('theme-dark'));

        await page.locator('#btnToggleTheme').click();
        await page.waitForTimeout(300);

        const afterDark = await body.evaluate(el => el.classList.contains('theme-dark'));
        expect(afterDark).not.toBe(initialDark);
    });

    test('BT-toolbar.8 批注切换按钮存在', async ({ page }) => {
        const annotationsBtn = page.locator('#btnToggleAnnotations');
        await expect(annotationsBtn).toBeVisible();
    });

    test('BT-toolbar.9 目录切换按钮存在', async ({ page }) => {
        const tocBtn = page.locator('#btnToggleToc');
        await expect(tocBtn).toBeVisible();
    });
});
