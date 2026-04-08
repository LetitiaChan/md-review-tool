import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('设置面板测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'basic-rendering.md');
        await waitForRender(page);
        // Settings.js 的 show()/hide() 操作 #settingsOverlay 的 visible 类
        // 测试容器中需要确保该元素存在
        await page.evaluate(() => {
            if (!document.getElementById('settingsOverlay')) {
                const overlay = document.createElement('div');
                overlay.id = 'settingsOverlay';
                overlay.className = 'settings-overlay';
                document.body.appendChild(overlay);
            }
        });
    });

    test('BT-settings.1 设置按钮存在且可点击', async ({ page }) => {
        const settingsBtn = page.locator('#btnSettings');
        await expect(settingsBtn).toBeVisible();
    });

    test('BT-settings.2 点击设置按钮触发设置面板显示', async ({ page }) => {
        // Settings.js 的 show() 会给 #settingsOverlay 添加 'visible' 类
        await page.locator('#btnSettings').click();
        await page.waitForTimeout(300);

        const overlay = page.locator('#settingsOverlay');
        const hasVisible = await overlay.evaluate(el => el.classList.contains('visible'));
        expect(hasVisible).toBe(true);
    });

    test('BT-settings.3 点击关闭按钮隐藏设置面板', async ({ page }) => {
        // 先打开设置面板
        await page.locator('#btnSettings').click();
        await page.waitForTimeout(300);

        // 确认已打开
        const overlay = page.locator('#settingsOverlay');
        const isOpen = await overlay.evaluate(el => el.classList.contains('visible'));
        expect(isOpen).toBe(true);

        // Settings.hide() 通过 btnCloseSettings 的 click 事件触发
        await page.evaluate(() => {
            const closeBtn = document.getElementById('btnCloseSettings');
            if (closeBtn) closeBtn.click();
        });
        await page.waitForTimeout(300);

        // Settings.hide() 会移除 'visible' 类
        const hasVisible = await overlay.evaluate(el => el.classList.contains('visible'));
        expect(hasVisible).toBe(false);
    });

    test('BT-settings.4 主题切换按钮切换暗色主题', async ({ page }) => {
        const body = page.locator('body');
        const initialIsDark = await body.evaluate(el => el.classList.contains('theme-dark'));

        await page.locator('#btnToggleTheme').click();
        await page.waitForTimeout(300);

        const afterDark = await body.evaluate(el => el.classList.contains('theme-dark'));
        expect(afterDark).not.toBe(initialIsDark);
    });

    test('BT-settings.5 再次点击主题按钮切换回亮色主题', async ({ page }) => {
        await page.locator('#btnToggleTheme').click();
        await page.waitForTimeout(300);
        await page.locator('#btnToggleTheme').click();
        await page.waitForTimeout(300);

        const body = page.locator('body');
        const hasDark = await body.evaluate(el => el.classList.contains('theme-dark'));
        expect(hasDark).toBe(false);
    });
});
