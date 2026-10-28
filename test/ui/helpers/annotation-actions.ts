import { Page, expect } from '@playwright/test';

/**
 * 批注交互辅助
 *
 * 在测试容器里走真实流程：选中文本 → 触发 mouseup → 点击浮动工具条 →
 * 填写/提交弹窗。测试容器的弹窗字段是占位 div，这里替换成 textarea。
 */

export async function prepareAnnotationUi(page: Page, markdown: string): Promise<void> {
    await page.evaluate((md) => {
        const ensureTextarea = (id: string) => {
            const old = document.getElementById(id);
            if (old && old.tagName !== 'TEXTAREA') {
                const ta = document.createElement('textarea');
                ta.id = id;
                old.replaceWith(ta);
            }
        };
        ensureTextarea('commentText');
        ensureTextarea('insertText');
        ensureTextarea('insertReason');

        const Renderer = (window as any).Renderer;
        const Annotations = (window as any).Annotations;
        Annotations.init(Renderer.parseMarkdown(md));
    }, markdown);
}

/**
 * 在预览内容中选中指定文本并触发选区工具条；返回所在块的 blockIndex。
 */
export async function selectTextInContent(page: Page, target: string): Promise<number> {
    const found = await page.evaluate((text) => {
        const blocks = Array.from(document.querySelectorAll('#documentContent .md-block'));
        for (const block of blocks) {
            const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            while ((node = walker.nextNode())) {
                const idx = (node.textContent || '').indexOf(text);
                if (idx >= 0) {
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + text.length);
                    const selection = window.getSelection()!;
                    selection.removeAllRanges();
                    selection.addRange(range);
                    block.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 120, clientY: 120 }));
                    return { ok: true, blockIndex: Number((block as HTMLElement).dataset.blockIndex) };
                }
            }
        }
        return { ok: false, blockIndex: -1 };
    }, target);

    expect(found.ok, `预览中应能找到文本「${target}」`).toBe(true);
    await expect(page.locator('.selection-tooltip')).toBeVisible();
    return found.blockIndex;
}

async function clickTooltipAction(page: Page, action: string): Promise<void> {
    await page.locator(`.selection-tooltip [data-action="${action}"]`).click();
}

export async function addComment(page: Page, target: string, comment: string): Promise<void> {
    await selectTextInContent(page, target);
    await clickTooltipAction(page, 'comment');
    await page.evaluate((value) => {
        (document.getElementById('commentText') as HTMLTextAreaElement).value = value;
        document.getElementById('btnSubmitComment')!.click();
    }, comment);
}

export async function markDelete(page: Page, target: string): Promise<void> {
    await selectTextInContent(page, target);
    await clickTooltipAction(page, 'delete');
}

export async function insertAfter(page: Page, target: string, content: string): Promise<void> {
    await selectTextInContent(page, target);
    await clickTooltipAction(page, 'insert');
    await page.evaluate((value) => {
        (document.getElementById('insertText') as HTMLTextAreaElement).value = value;
        document.getElementById('btnSubmitInsert')!.click();
    }, content);
}
