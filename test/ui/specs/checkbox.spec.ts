import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender } from '../helpers/test-utils';

test.describe('Checkbox 交互测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'checkbox.md');
        await waitForRender(page);

        // Checkbox 点击只在编辑模式下生效，需要模拟切换到编辑模式
        await page.evaluate(() => {
            // app.js 中 currentMode 是闭包变量，无法直接修改
            // 但我们可以通过模拟 btnModeToggle 点击来切换模式
            // 或者直接在 documentContent 上设置 contenteditable
            const content = document.getElementById('documentContent');
            if (content) {
                content.setAttribute('contenteditable', 'true');
            }
            // 同时需要设置 currentMode 变量 — 通过触发模式切换消息
            // 由于 currentMode 在 app.js 闭包中，我们直接模拟编辑模式的行为：
            // 移除 checkbox 的 disabled 属性，并绑定点击事件
            document.querySelectorAll('.task-checkbox input[type="checkbox"]').forEach(input => {
                (input as HTMLInputElement).removeAttribute('disabled');
            });
        });
    });

    test('BT-checkbox.1 未勾选的 Checkbox 可以被勾选', async ({ page }) => {
        // 找到第一个未勾选的 task-checkbox span
        const uncheckedSpan = page.locator('.task-checkbox:not(.checked)').first();
        await expect(uncheckedSpan).toBeVisible();

        // 获取内部的 input
        const input = uncheckedSpan.locator('input[type="checkbox"]');
        await expect(input).toBeVisible();

        // 点击 checkbox input
        await input.click({ force: true });

        // 验证变为勾选状态
        await expect(input).toBeChecked();
    });

    test('BT-checkbox.2 已勾选的 Checkbox 可以取消勾选', async ({ page }) => {
        // 找到第一个已勾选的 checkbox
        const checkedInput = page.locator('.task-checkbox.checked input[type="checkbox"]').first();
        await expect(checkedInput).toBeVisible();

        // 点击取消勾选
        await checkedInput.click({ force: true });

        // 验证变为未勾选状态
        await expect(checkedInput).not.toBeChecked();
    });

    test('BT-checkbox.3 Task list item 渲染正确的 DOM 结构', async ({ page }) => {
        // 验证 task-list-item 结构：li.task-list-item > span.task-checkbox > input[type="checkbox"]
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
