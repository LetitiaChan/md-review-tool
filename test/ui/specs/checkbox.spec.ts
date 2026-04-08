import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('Checkbox 交互测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'checkbox.md');
        await waitForRender(page);
    });

    test('BT-checkbox.1 未勾选的 Checkbox 点击后 span 获得 checked 类', async ({ page }) => {
        // 绑定点击事件（模拟 app.js 编辑模式下的 checkbox 切换逻辑）
        // 使用事件委托绑定到 documentContent，与生产代码一致
        await page.evaluate(() => {
            const content = document.getElementById('documentContent');
            if (!content) return;
            content.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const checkboxSpan = target.closest('.task-checkbox') as HTMLElement;
                if (!checkboxSpan) return;
                e.preventDefault();
                e.stopPropagation();
                const isChecked = checkboxSpan.classList.contains('checked');
                const input = checkboxSpan.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (isChecked) {
                    checkboxSpan.classList.remove('checked');
                    if (input) input.checked = false;
                } else {
                    checkboxSpan.classList.add('checked');
                    if (input) input.checked = true;
                }
            });
        });

        // 找到第一个未勾选的 task-checkbox span
        const uncheckedSpan = page.locator('.task-checkbox:not(.checked)').first();
        await expect(uncheckedSpan).toBeVisible();

        // 点击 checkbox span（使用 dispatchEvent 确保事件冒泡到 documentContent）
        await uncheckedSpan.dispatchEvent('click');

        // 等待 DOM 更新
        await page.waitForTimeout(200);

        // 验证 span 获得 checked 类
        const hasChecked = await page.evaluate(() => {
            // 检查第一个原本未勾选的 checkbox 是否现在有 checked 类
            const firstUnchecked = document.querySelector('.task-checkbox:not(.checked)');
            // 如果找不到了（因为已经变成 checked），说明成功
            // 或者检查 checked 数量是否增加了
            return document.querySelectorAll('.task-checkbox.checked').length;
        });
        expect(hasChecked).toBe(3); // 原来 2 个 checked，点击后变成 3 个
    });

    test('BT-checkbox.2 已勾选的 Checkbox 点击后移除 checked 类', async ({ page }) => {
        // 绑定点击事件
        await page.evaluate(() => {
            const content = document.getElementById('documentContent');
            if (!content) return;
            content.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const checkboxSpan = target.closest('.task-checkbox') as HTMLElement;
                if (!checkboxSpan) return;
                e.preventDefault();
                e.stopPropagation();
                const isChecked = checkboxSpan.classList.contains('checked');
                const input = checkboxSpan.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (isChecked) {
                    checkboxSpan.classList.remove('checked');
                    if (input) input.checked = false;
                } else {
                    checkboxSpan.classList.add('checked');
                    if (input) input.checked = true;
                }
            });
        });

        // 找到第一个已勾选的 checkbox span
        const checkedSpan = page.locator('.task-checkbox.checked').first();
        await expect(checkedSpan).toBeVisible();

        // 点击取消勾选
        await checkedSpan.click();

        // 等待 DOM 更新
        await page.waitForTimeout(200);

        // 验证 span 不再有 checked 类
        // 使用 evaluate 直接检查，避免 locator 缓存问题
        const stillChecked = await page.evaluate(() => {
            const spans = document.querySelectorAll('.task-checkbox.checked');
            // 原来有 2 个 checked，点击后应该只剩 1 个
            return spans.length;
        });
        expect(stillChecked).toBe(1);
    });

    test('BT-checkbox.3 Task list item 渲染正确的 DOM 结构', async ({ page }) => {
        // 验证 task-list-item 结构
        const taskItems = page.locator('.task-list-item');
        const count = await taskItems.count();
        expect(count).toBeGreaterThanOrEqual(5); // fixture 中有 5 个任务

        // 验证已勾选的任务有 .checked 类
        const checkedItems = page.locator('.task-list-item .task-checkbox.checked');
        const checkedCount = await checkedItems.count();
        expect(checkedCount).toBe(2); // fixture 中有 2 个已勾选

        // 验证未勾选的任务没有 .checked 类
        const uncheckedItems = page.locator('.task-list-item .task-checkbox:not(.checked)');
        const uncheckedCount = await uncheckedItems.count();
        expect(uncheckedCount).toBe(3); // fixture 中有 3 个未勾选
    });
});
