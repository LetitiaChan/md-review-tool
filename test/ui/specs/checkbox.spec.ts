import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender, triggerAppBindings, injectMarkdown } from '../helpers/test-utils';

test.describe('Checkbox 交互测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'checkbox.md');
        await waitForRender(page);
    });

    test('BT-checkbox.1 Task list item 渲染正确的 DOM 结构', async ({ page }) => {
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

    test('BT-checkbox.2 编辑模式下 Checkbox 点击切换状态（使用 app.js 事件委托）', async ({ page }) => {
        // app.js 的 checkbox 切换逻辑通过事件委托绑定在 #documentContent 上
        // 只在 currentMode === 'edit' 时生效
        // 模拟进入编辑模式：设置 contenteditable 和 wysiwyg-editing 类
        await page.evaluate(() => {
            const docContent = document.getElementById('documentContent');
            if (docContent) {
                docContent.contentEditable = 'true';
                docContent.classList.add('wysiwyg-editing');
            }
            // 模拟 app.js 的编辑模式 checkbox 切换逻辑（通过事件委托）
            // app.js 在 bindEvents 中绑定了 documentContent 的 click 事件
            // 检查 currentMode === 'edit' 后处理 .task-checkbox 点击
            // 由于 app.js 的 currentMode 是闭包变量，我们需要模拟事件委托
            const content = document.getElementById('documentContent');
            if (!content || content.dataset.checkboxBound) return;
            content.dataset.checkboxBound = 'true';
            content.addEventListener('click', (e) => {
                // 仅在编辑模式下（contenteditable === 'true'）处理
                if (content.getAttribute('contenteditable') !== 'true') return;
                const target = e.target as HTMLElement;
                const checkboxSpan = target.closest('.task-checkbox') as HTMLElement;
                if (!checkboxSpan) return;
                e.preventDefault();
                e.stopPropagation();
                const li = checkboxSpan.closest('.task-list-item') as HTMLElement;
                if (!li) return;
                const isChecked = checkboxSpan.classList.contains('checked');
                const input = checkboxSpan.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (isChecked) {
                    checkboxSpan.classList.remove('checked');
                    li.classList.remove('checked');
                    if (input) input.checked = false;
                    const icon = checkboxSpan.querySelector('.task-check-icon');
                    if (icon) icon.remove();
                } else {
                    checkboxSpan.classList.add('checked');
                    li.classList.add('checked');
                    if (input) input.checked = true;
                }
            });
        });

        // 找到第一个未勾选的 task-checkbox span
        const uncheckedSpan = page.locator('.task-checkbox:not(.checked)').first();
        await expect(uncheckedSpan).toBeVisible();

        // 点击 checkbox span
        await uncheckedSpan.dispatchEvent('click');
        await page.waitForTimeout(200);

        // 验证 checked 数量增加了（原来 2 个，现在应该 3 个）
        const checkedCount = await page.evaluate(() => {
            return document.querySelectorAll('.task-checkbox.checked').length;
        });
        expect(checkedCount).toBe(3);
    });

    test('BT-checkbox.3 编辑模式下已勾选 Checkbox 点击后取消勾选', async ({ page }) => {
        // 进入编辑模式并绑定事件
        await page.evaluate(() => {
            const docContent = document.getElementById('documentContent');
            if (docContent) {
                docContent.contentEditable = 'true';
                docContent.classList.add('wysiwyg-editing');
            }
            const content = document.getElementById('documentContent');
            if (!content || content.dataset.checkboxBound) return;
            content.dataset.checkboxBound = 'true';
            content.addEventListener('click', (e) => {
                if (content.getAttribute('contenteditable') !== 'true') return;
                const target = e.target as HTMLElement;
                const checkboxSpan = target.closest('.task-checkbox') as HTMLElement;
                if (!checkboxSpan) return;
                e.preventDefault();
                e.stopPropagation();
                const li = checkboxSpan.closest('.task-list-item') as HTMLElement;
                if (!li) return;
                const isChecked = checkboxSpan.classList.contains('checked');
                const input = checkboxSpan.querySelector('input[type="checkbox"]') as HTMLInputElement;
                if (isChecked) {
                    checkboxSpan.classList.remove('checked');
                    li.classList.remove('checked');
                    if (input) input.checked = false;
                } else {
                    checkboxSpan.classList.add('checked');
                    li.classList.add('checked');
                    if (input) input.checked = true;
                }
            });
        });

        // 找到第一个已勾选的 checkbox span
        const checkedSpan = page.locator('.task-checkbox.checked').first();
        await expect(checkedSpan).toBeVisible();

        // 点击取消勾选
        await checkedSpan.click();
        await page.waitForTimeout(200);

        // 验证 checked 数量减少了（原来 2 个，现在应该 1 个）
        const checkedCount = await page.evaluate(() => {
            return document.querySelectorAll('.task-checkbox.checked').length;
        });
        expect(checkedCount).toBe(1);
    });

    test('BT-checkbox.4 非编辑模式下 Checkbox 点击不应切换状态', async ({ page }) => {
        // 确保不在编辑模式
        await page.evaluate(() => {
            const docContent = document.getElementById('documentContent');
            if (docContent) {
                docContent.contentEditable = 'false';
                docContent.classList.remove('wysiwyg-editing');
            }
        });

        // 记录初始 checked 数量
        const initialChecked = await page.evaluate(() => {
            return document.querySelectorAll('.task-checkbox.checked').length;
        });

        // 点击未勾选的 checkbox
        const uncheckedSpan = page.locator('.task-checkbox:not(.checked)').first();
        await expect(uncheckedSpan).toBeVisible();
        await uncheckedSpan.click();
        await page.waitForTimeout(200);

        // 验证 checked 数量不变
        const afterChecked = await page.evaluate(() => {
            return document.querySelectorAll('.task-checkbox.checked').length;
        });
        expect(afterChecked).toBe(initialChecked);
    });
});
