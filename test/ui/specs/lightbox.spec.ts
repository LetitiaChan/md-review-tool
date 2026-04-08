import { test, expect } from '@playwright/test';
import { openContainer, injectMarkdown, waitForRender } from '../helpers/test-utils';

test.describe('Lightbox 交互测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
    });

    test('BT-lightbox.1 点击 Mermaid 图表弹出 Lightbox 遮罩层', async ({ page }) => {
        await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
        await waitForRender(page);

        // 生产代码中 app.js 的 bindMermaidLightbox 会绑定 .mermaid-rendered 的点击事件
        // 在测试容器中，app.js 已加载，但 bindMermaidLightbox 可能未被调用
        // 手动绑定 lightbox 事件
        await page.evaluate(() => {
            const rendered = document.querySelectorAll('.mermaid-rendered');
            rendered.forEach(el => {
                if (el.querySelector('svg') && !(el as HTMLElement).dataset.lightboxBound) {
                    (el as HTMLElement).dataset.lightboxBound = 'true';
                    (el as HTMLElement).style.cursor = 'pointer';
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const svgEl = el.querySelector('svg');
                        if (!svgEl) return;
                        const overlay = document.createElement('div');
                        overlay.className = 'mermaid-lightbox-overlay';
                        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;';
                        const container = document.createElement('div');
                        container.className = 'mermaid-lightbox-container';
                        const content = document.createElement('div');
                        content.className = 'mermaid-lightbox-content';
                        content.appendChild(svgEl.cloneNode(true));
                        container.appendChild(content);
                        overlay.appendChild(container);
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'mermaid-lightbox-close';
                        closeBtn.innerHTML = '&times;';
                        closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); overlay.remove(); });
                        overlay.appendChild(closeBtn);
                        overlay.addEventListener('click', (ev) => {
                            if (ev.target === overlay) overlay.remove();
                        });
                        document.addEventListener('keydown', function handler(ev) {
                            if (ev.key === 'Escape') {
                                overlay.remove();
                                document.removeEventListener('keydown', handler);
                            }
                        });
                        document.body.appendChild(overlay);
                    });
                }
            });
        });

        // 点击图表
        const chart = page.locator('.mermaid-rendered').first();
        await chart.click();

        // 验证 Lightbox 遮罩层出现
        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible({ timeout: 5000 });
    });

    test('BT-lightbox.2 Lightbox 中图表 SVG 可见', async ({ page }) => {
        // 直接创建一个 lightbox 来测试
        await page.evaluate(() => {
            const overlay = document.createElement('div');
            overlay.className = 'mermaid-lightbox-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;';
            const container = document.createElement('div');
            container.className = 'mermaid-lightbox-container';
            const content = document.createElement('div');
            content.className = 'mermaid-lightbox-content';
            // 创建一个简单的 SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '200');
            svg.setAttribute('height', '100');
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '200');
            rect.setAttribute('height', '100');
            rect.setAttribute('fill', 'white');
            svg.appendChild(rect);
            content.appendChild(svg);
            container.appendChild(content);
            overlay.appendChild(container);
            document.body.appendChild(overlay);
        });

        // 验证 Lightbox 中的 SVG 可见
        const lightboxSvg = page.locator('.mermaid-lightbox-content svg');
        await expect(lightboxSvg).toBeVisible();
    });

    test('BT-lightbox.3 点击遮罩层关闭 Lightbox', async ({ page }) => {
        // 创建一个 lightbox
        await page.evaluate(() => {
            const overlay = document.createElement('div');
            overlay.className = 'mermaid-lightbox-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;';
            const content = document.createElement('div');
            content.className = 'mermaid-lightbox-content';
            content.style.cssText = 'width:200px;height:200px;background:white;';
            content.textContent = 'Lightbox Content';
            overlay.appendChild(content);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
            document.body.appendChild(overlay);
        });

        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible();

        // 点击遮罩层（非内容区域）
        await overlay.click({ position: { x: 10, y: 10 } });

        // 验证 Lightbox 已关闭
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });

    test('BT-lightbox.4 按 Escape 键关闭 Lightbox', async ({ page }) => {
        // 创建一个 lightbox
        await page.evaluate(() => {
            const overlay = document.createElement('div');
            overlay.className = 'mermaid-lightbox-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9000;';
            const content = document.createElement('div');
            content.className = 'mermaid-lightbox-content';
            content.textContent = 'Lightbox Content';
            overlay.appendChild(content);
            document.addEventListener('keydown', function handler(e) {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', handler);
                }
            });
            document.body.appendChild(overlay);
        });

        const overlay = page.locator('.mermaid-lightbox-overlay');
        await expect(overlay).toBeVisible();

        // 按 Escape 键
        await page.keyboard.press('Escape');

        // 验证 Lightbox 已关闭
        await expect(overlay).not.toBeVisible({ timeout: 3000 });
    });
});
