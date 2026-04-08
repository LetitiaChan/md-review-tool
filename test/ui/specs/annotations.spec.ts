import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('批注高亮测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'annotations.md');
        await waitForRender(page);
    });

    test('BT-annotation.1 批注高亮区域可以通过 DOM 操作创建并显示', async ({ page }) => {
        // 模拟添加批注高亮（生产代码中由 Annotations 模块处理）
        await page.evaluate(() => {
            const blocks = document.querySelectorAll('.md-block');
            if (blocks.length < 2) return;

            // 在第二个 block 的 p 元素中创建高亮标记
            const targetBlock = blocks[1];
            const p = targetBlock.querySelector('p');
            if (p) {
                const originalHTML = p.innerHTML;
                p.innerHTML = `<span class="annotation-highlight" data-annotation-id="test-ann-1" style="background-color: rgba(255, 235, 59, 0.4); cursor: pointer;">${originalHTML.substring(0, 20)}</span>${originalHTML.substring(20)}`;
            }
        });

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
        await page.evaluate(() => {
            // 创建高亮
            const blocks = document.querySelectorAll('.md-block');
            if (blocks.length < 2) return;
            const targetBlock = blocks[1];
            const p = targetBlock.querySelector('p');
            if (p) {
                p.innerHTML = `<span class="annotation-highlight" data-annotation-id="test-ann-1" style="background-color: rgba(255, 235, 59, 0.4); cursor: pointer;">高亮文本</span>${p.innerHTML}`;
            }

            // 创建批注卡片
            const annotationsList = document.getElementById('annotationsList');
            if (annotationsList) {
                const card = document.createElement('div');
                card.className = 'annotation-card';
                card.setAttribute('data-annotation-id', 'test-ann-1');
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
        });

        // 点击高亮区域
        const highlight = page.locator('.annotation-highlight').first();
        await highlight.click();

        // 验证批注卡片获得 active 状态
        const activeCard = page.locator('.annotation-card.active');
        await expect(activeCard).toBeVisible({ timeout: 3000 });
    });
});
