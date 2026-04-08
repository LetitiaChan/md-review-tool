import { test, expect } from '@playwright/test';
import { openContainer, injectMarkdown, waitForRender, triggerAppBindings } from '../helpers/test-utils';

test.describe('Lightbox 交互测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
    });

    test('BT-lightbox.1 点击 Mermaid 图表弹出 Lightbox 遮罩层', async ({ page }) => {
        await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
        await waitForRender(page);
        // 触发 app.js 的 lightbox 绑定（通过 test-container.html 暴露的 __testBindings）
        await triggerAppBindings(page);

        // 点击图表
        const chart = page.locator('.mermaid-rendered').first();
        await expect(chart).toBeVisible({ timeout: 10000 });
        await chart.click();

        // 验证 Lightbox 遮罩层出现（由 __testBindings.bindMermaidLightbox 绑定的真实逻辑创建）
        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });
    });

    test('BT-lightbox.2 Lightbox 中包含克隆的 SVG', async ({ page }) => {
        await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
        await waitForRender(page);
        await triggerAppBindings(page);

        const chart = page.locator('.mermaid-rendered').first();
        await expect(chart).toBeVisible({ timeout: 10000 });
        await chart.click();

        // 验证 Lightbox 中的 SVG 可见
        const lightboxSvg = page.locator('.mermaid-lightbox-content svg');
        await expect(lightboxSvg).toBeVisible({ timeout: 5000 });
    });

    test('BT-lightbox.3 点击遮罩层关闭 Lightbox', async ({ page }) => {
        await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
        await waitForRender(page);
        await triggerAppBindings(page);

        const chart = page.locator('.mermaid-rendered').first();
        await expect(chart).toBeVisible({ timeout: 10000 });
        await chart.click();

        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });

        // 点击遮罩层（非内容区域）关闭
        await overlay.click({ position: { x: 5, y: 5 } });

        // 验证 Lightbox 已关闭
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('BT-lightbox.4 按 Escape 键关闭 Lightbox', async ({ page }) => {
        await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
        await waitForRender(page);
        await triggerAppBindings(page);

        const chart = page.locator('.mermaid-rendered').first();
        await expect(chart).toBeVisible({ timeout: 10000 });
        await chart.click();

        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });

        // 按 Escape 键
        await page.keyboard.press('Escape');

        // 验证 Lightbox 已关闭
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('BT-lightbox.5 点击关闭按钮关闭 Lightbox', async ({ page }) => {
        await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
        await waitForRender(page);
        await triggerAppBindings(page);

        const chart = page.locator('.mermaid-rendered').first();
        await expect(chart).toBeVisible({ timeout: 10000 });
        await chart.click();

        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });

        // 点击关闭按钮
        const closeBtn = page.locator('.mermaid-lightbox-close');
        await closeBtn.click();

        // 验证 Lightbox 已关闭
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });
});
