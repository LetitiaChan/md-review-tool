import { test, expect } from '@playwright/test';
import { openContainer, injectMarkdown, waitForRender } from '../helpers/test-utils';
import { prepareAnnotationUi, selectTextInContent } from '../helpers/annotation-actions';

/**
 * 脚注评论 UI 流程：
 * 勾选「写入源 Markdown 脚注」→ submitComment 调用 addFootnoteComment →
 * 用宿主返回的 footnoteId / 新内容更新内存中的批注与 rawMarkdown。
 */

const MARKDOWN = '这是需要评论的句子。';

async function setupFootnoteContainer(page: any, markdown: string): Promise<void> {
    await openContainer(page);
    await injectMarkdown(page, markdown);
    await waitForRender(page);
    await prepareAnnotationUi(page, markdown);

    await page.evaluate((md: string) => {
        // 测试容器用 div 占位，这里替换为真实 checkbox
        const old = document.getElementById('commentAsFootnote');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'commentAsFootnote';
        if (old) {
            old.replaceWith(checkbox);
        } else {
            document.body.appendChild(checkbox);
        }

        const Store = (window as any).Store;
        Store.reset();
        Store.setFile('footnote.md', md);

        (window as any).__mockVscode.clearResponses();
        (window as any).__mockVscode.clearMessageLog();
    }, markdown);
}

async function openCommentModalFor(page: any, target: string): Promise<void> {
    await selectTextInContent(page, target);
    await page.locator('.selection-tooltip [data-action="comment"]').click();
    // 测试容器里的 #commentModal 是空占位 div，没有尺寸，不能用 toBeVisible 判断
    await page.waitForFunction(
        () => (document.getElementById('commentModal') as HTMLElement | null)?.style.display === 'flex'
    );
}

async function submitWithFootnote(page: any, comment: string): Promise<void> {
    await page.evaluate((value: string) => {
        (document.getElementById('commentText') as HTMLTextAreaElement).value = value;
        (document.getElementById('commentAsFootnote') as HTMLInputElement).checked = true;
        document.getElementById('btnSubmitComment')!.click();
    }, comment);
}

test.describe('脚注评论', () => {

    test('BT-footnote.1 新评论弹窗应提供可用的脚注勾选框', async ({ page }) => {
        await setupFootnoteContainer(page, MARKDOWN);
        await openCommentModalFor(page, '需要评论的句子');

        const checkbox = page.locator('#commentAsFootnote');
        await expect(checkbox).toBeVisible();
        await expect(checkbox).toBeEnabled();
        await expect(checkbox).not.toBeChecked();
    });

    test('BT-footnote.2 勾选后提交应调用宿主并记录 footnoteId', async ({ page }) => {
        await setupFootnoteContainer(page, MARKDOWN);

        await page.evaluate((md: string) => {
            (window as any).__mockVscode.setResponse('addFootnoteComment', (message: any) => ({
                success: true,
                footnoteId: 'mdhr-1',
                content: md.replace('句子。', '句子[^mdhr-1]。')
                    + '\n\n[^mdhr-1]: MDHR-COMMENT: ' + message.payload.annotation.comment + '\n',
            }));
        }, MARKDOWN);

        await openCommentModalFor(page, '需要评论的句子');
        await submitWithFootnote(page, '补充背景');

        await page.waitForFunction(() => (window as any).Store.getAnnotations().length === 1);

        const state = await page.evaluate(() => {
            const Store = (window as any).Store;
            return {
                annotation: Store.getAnnotations()[0],
                rawMarkdown: Store.getData().rawMarkdown,
                messages: (window as any).__mockVscode.getMessageLog(),
            };
        });

        expect(state.annotation.footnoteId).toBe('mdhr-1');
        expect(state.annotation.source).toBe('footnote');
        expect(state.annotation.comment).toBe('补充背景');
        expect(state.rawMarkdown).toContain('句子[^mdhr-1]');
        expect(state.rawMarkdown).toContain('[^mdhr-1]: MDHR-COMMENT: 补充背景');

        const request = state.messages.find((m: any) => m.type === 'addFootnoteComment');
        expect(request).toBeTruthy();
        expect(request.payload.sourceFile).toBe('footnote.md');
        expect(request.payload.annotation.selectedText).toBe('需要评论的句子');
        expect(request.payload.annotation.comment).toBe('补充背景');

        await expect(page.locator('.annotation-card').first()).toContainText('补充背景');
    });

    test('BT-footnote.3 宿主写入失败时不应新增批注或改动内容', async ({ page }) => {
        await setupFootnoteContainer(page, MARKDOWN);

        await page.evaluate(() => {
            (window as any).__mockVscode.setResponse('addFootnoteComment', {
                success: false,
                error: '无法在源文件中定位选中文本',
            });
        });

        await openCommentModalFor(page, '需要评论的句子');
        await submitWithFootnote(page, '补充背景');

        await page.waitForFunction(() => {
            const log = (window as any).__mockVscode.getMessageLog();
            return log.some((m: any) => m.type === 'addFootnoteComment');
        });
        // 等待异步回调把拒绝结果处理完
        await page.waitForTimeout(100);

        const state = await page.evaluate(() => ({
            count: (window as any).Store.getAnnotations().length,
            rawMarkdown: (window as any).Store.getData().rawMarkdown,
        }));

        expect(state.count).toBe(0);
        expect(state.rawMarkdown).toBe(MARKDOWN);
    });

    test('BT-footnote.4 编辑已有批注时应禁用脚注勾选框', async ({ page }) => {
        await setupFootnoteContainer(page, MARKDOWN);

        await page.evaluate(() => {
            const Store = (window as any).Store;
            Store.addAnnotation({
                type: 'comment',
                selectedText: '需要评论的句子',
                blockIndex: 0,
                endBlockIndex: 0,
                startOffset: 3,
                endOffset: 10,
                comment: '已有评论',
                images: [],
            });
            (window as any).Annotations.refreshView();
        });

        await page.locator('#annotationsList [data-edit]').first().click();

        const checkbox = page.locator('#commentAsFootnote');
        await expect(checkbox).toBeVisible();
        await expect(checkbox).toBeDisabled();
        await expect(checkbox).not.toBeChecked();
    });
});
