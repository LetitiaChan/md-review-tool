import { test, expect } from '@playwright/test';
import { openContainer, injectMarkdown } from '../helpers/test-utils';

/**
 * 批注锚点回归
 *
 * 记录批注时会同时保存所在块的原始 Markdown（blockText），
 * 宿主生成 AI 指令时直接使用它，避免宿主/Webview 两套分块器规则漂移。
 */

test.describe('批注块文本锚点', () => {

    test('BT-anchor.1 新建批注时记录所在块的原始 Markdown', async ({ page }) => {
        await openContainer(page);

        const markdown = '# 标题\n\n这是需要批注的段落。\n\n第二段';
        await injectMarkdown(page, markdown);

        await page.evaluate(async (md) => {
            const Renderer = (window as any).Renderer;
            const Annotations = (window as any).Annotations;
            const blocks = Renderer.parseMarkdown(md);
            Annotations.init(blocks);

            // 测试容器里 commentText 是占位 div，替换为 textarea 以模拟真实弹窗
            const old = document.getElementById('commentText')!;
            const textarea = document.createElement('textarea');
            textarea.id = 'commentText';
            old.replaceWith(textarea);

            // 选中第二个块（段落）中的一段文字
            const block = document.querySelector('.md-block[data-block-index="1"]')!;
            const p = block.querySelector('p')!;
            const textNode = p.firstChild!;
            const range = document.createRange();
            range.setStart(textNode, 0);
            range.setEnd(textNode, 4); // "这是需要"
            const selection = window.getSelection()!;
            selection.removeAllRanges();
            selection.addRange(range);

            block.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 100, clientY: 100 }));
            await new Promise((resolve) => setTimeout(resolve, 50));
        }, markdown);

        await expect(page.locator('.selection-tooltip')).toBeVisible();
        await page.locator('.selection-tooltip [data-action="comment"]').click();

        await page.evaluate(() => {
            (document.getElementById('commentText') as HTMLTextAreaElement).value = '测试批注';
            // 测试容器的提交按钮是零尺寸占位 div，直接触发 click
            document.getElementById('btnSubmitComment')!.click();
        });

        const annotation = await page.evaluate(() => (window as any).Store.getData().annotations[0]);
        expect(annotation).toBeTruthy();
        expect(annotation.selectedText).toBe('这是需要');
        expect(annotation.blockIndex).toBe(1);
        // 批注应带上创建时所在块的原始 Markdown
        expect(annotation.blockText).toBe('这是需要批注的段落。');
    });
});
