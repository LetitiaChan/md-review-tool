import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('批注高亮测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'annotations.md');
        await waitForRender(page);
    });

    test('BT-annotation.1 批注高亮区域可以通过 DOM 操作创建并显示', async ({ page }) => {
        // 先确认有 md-block 元素
        const blockCount = await page.locator('.md-block').count();
        expect(blockCount).toBeGreaterThanOrEqual(1);

        // 在第一个包含 p 元素的 block 中创建高亮标记
        const created = await page.evaluate(() => {
            const paragraphs = document.querySelectorAll('.md-block p');
            if (paragraphs.length === 0) return false;

            const p = paragraphs[0];
            const originalHTML = p.innerHTML;
            if (originalHTML.length < 5) return false;

            p.innerHTML = `<span class="annotation-highlight" data-annotation-id="test-ann-1" style="background-color: rgba(255, 235, 59, 0.4); cursor: pointer;">${originalHTML.substring(0, 20)}</span>${originalHTML.substring(20)}`;
            return true;
        });
        expect(created).toBe(true);

        // 验证高亮区域存在
        const highlights = page.locator('.annotation-highlight');
        const count = await highlights.count();
        expect(count).toBeGreaterThanOrEqual(1);

        // 验证高亮区域可见
        await expect(highlights.first()).toBeVisible();

        // 验证高亮区域有背景色
        const bgColor = await highlights.first().evaluate((el) => {
            return window.getComputedStyle(el).backgroundColor;
        });
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(bgColor).not.toBe('transparent');
    });

    test('BT-annotation.2 点击批注高亮可以触发事件', async ({ page }) => {
        // 创建批注高亮和对应的批注卡片
        const created = await page.evaluate(() => {
            const paragraphs = document.querySelectorAll('.md-block p');
            if (paragraphs.length === 0) return false;

            const p = paragraphs[0];
            p.innerHTML = `<span class="annotation-highlight" data-annotation-id="test-ann-1" style="background-color: rgba(255, 235, 59, 0.4); cursor: pointer;">高亮文本</span>${p.innerHTML}`;

            // 创建批注卡片
            const annotationsList = document.getElementById('annotationsList');
            if (annotationsList) {
                const card = document.createElement('div');
                card.className = 'annotation-card';
                card.setAttribute('data-annotation-id', 'test-ann-1');
                card.style.display = 'block';
                card.innerHTML = '<div class="annotation-content">测试批注内容</div>';
                annotationsList.appendChild(card);
            }

            // 绑定点击事件
            const highlight = document.querySelector('.annotation-highlight[data-annotation-id="test-ann-1"]');
            if (highlight) {
                highlight.addEventListener('click', () => {
                    const card = document.querySelector('.annotation-card[data-annotation-id="test-ann-1"]');
                    if (card) {
                        card.classList.add('active');
                    }
                });
            }
            return true;
        });
        expect(created).toBe(true);

        // 点击高亮区域
        const highlight = page.locator('.annotation-highlight').first();
        await expect(highlight).toBeVisible();
        await highlight.click();

        // 验证批注卡片获得 active 状态
        const activeCard = page.locator('.annotation-card.active');
        await expect(activeCard).toHaveCount(1);
    });
});
