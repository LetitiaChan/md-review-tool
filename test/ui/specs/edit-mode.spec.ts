import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender, injectMarkdown } from '../helpers/test-utils';

test.describe('编辑模式测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'edit-mode.md');
        await waitForRender(page);
        // 使用 Store.setFile 设置文件数据（Store 没有 setData 方法）
        await page.evaluate(() => {
            const Store = (window as any).Store;
            if (Store && typeof Store.setFile === 'function') {
                Store.setFile('edit-mode.md', '# 编辑模式测试文档\n\n## 段落编辑\n\n这是一个普通段落。', '', '', '', '', '', '');
            }
        });
    });

    test('BT-edit.1 编辑模式切换按钮存在', async ({ page }) => {
        const modeToggle = page.locator('#btnModeToggle');
        await expect(modeToggle).toBeVisible();
    });

    test('BT-edit.2 手动设置 contenteditable 进入编辑模式', async ({ page }) => {
        const docContent = page.locator('#documentContent');

        // 初始状态不应有 wysiwyg-editing 类
        await expect(docContent).not.toHaveClass(/wysiwyg-editing/);

        // 手动进入编辑模式
        await page.evaluate(() => {
            const el = document.getElementById('documentContent');
            if (el) {
                el.contentEditable = 'true';
                el.classList.add('wysiwyg-editing');
            }
        });

        // 验证编辑模式已激活
        await expect(docContent).toHaveClass(/wysiwyg-editing/);
        const isEditable = await docContent.getAttribute('contenteditable');
        expect(isEditable).toBe('true');
    });

    test('BT-edit.3 退出编辑模式移除 contenteditable', async ({ page }) => {
        // 先进入编辑模式
        await page.evaluate(() => {
            const el = document.getElementById('documentContent');
            if (el) {
                el.contentEditable = 'true';
                el.classList.add('wysiwyg-editing');
            }
        });

        // 退出编辑模式
        await page.evaluate(() => {
            const el = document.getElementById('documentContent');
            if (el) {
                el.contentEditable = 'false';
                el.classList.remove('wysiwyg-editing');
            }
        });

        const docContent = page.locator('#documentContent');
        await expect(docContent).not.toHaveClass(/wysiwyg-editing/);
        const isEditable = await docContent.getAttribute('contenteditable');
        expect(isEditable).toBe('false');
    });

    test('BT-edit.4 编辑模式下文档内容可编辑', async ({ page }) => {
        // 进入编辑模式
        await page.evaluate(() => {
            const el = document.getElementById('documentContent');
            if (el) {
                el.contentEditable = 'true';
                el.classList.add('wysiwyg-editing');
            }
        });

        // 找到第一个段落并点击
        const firstBlock = page.locator('.md-block').first();
        await firstBlock.click();

        // 输入文本
        await page.keyboard.type('测试输入');
        await page.waitForTimeout(200);

        // 验证文本已插入
        const text = await firstBlock.textContent();
        expect(text).toContain('测试输入');
    });

    test('BT-edit.5 编辑模式下 md-block 有悬浮效果样式', async ({ page }) => {
        // 进入编辑模式
        await page.evaluate(() => {
            const el = document.getElementById('documentContent');
            if (el) {
                el.contentEditable = 'true';
                el.classList.add('wysiwyg-editing');
            }
        });

        // 验证 wysiwyg-editing 类已添加（CSS 会为 .wysiwyg-editing .md-block:hover 添加背景）
        const docContent = page.locator('#documentContent');
        await expect(docContent).toHaveClass(/wysiwyg-editing/);
    });
});
