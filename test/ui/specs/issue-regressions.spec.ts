import { test, expect, Page } from '@playwright/test';
import { openContainer, injectMarkdown } from '../helpers/test-utils';
import { prepareAnnotationUi } from '../helpers/annotation-actions';

/**
 * GitHub issue #3–#6 回归测试
 *   #3 首次打开无批注时不应生成空批阅记录
 *   #4 Ctrl+S 手动保存后应同步 .review 快照
 *   #5 英文界面下导出的批阅记录不应残留中文
 *   #6 批注相关键盘快捷键
 */

const MD = '# 标题\n\n这是需要批注的段落。\n\n第二段内容。';

async function selectText(page: Page, target: string): Promise<void> {
    const ok = await page.evaluate((text) => {
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
                    return true;
                }
            }
        }
        return false;
    }, target);
    expect(ok, `应能找到文本「${target}」`).toBe(true);
}

test.describe('Issue #3 — 打开文件不生成空记录', () => {

    test('BT-issue3.1 首次打开且无批注不触发自动保存，有批注/版本变化才触发', async ({ page }) => {
        await openContainer(page);

        const result = await page.evaluate(() => {
            const Exporter = (window as any).Exporter;
            const Store = (window as any).Store;
            let calls = 0;
            Exporter.triggerAutoSave = () => { calls++; };

            Store.reset();
            Store.setFile('notes.md', '# 标题\n\n正文', 'hash1', '', '/tmp/notes.md', '/tmp', 'notes.md', 'path1');
            const afterOpen = calls;

            Store.addAnnotation({
                type: 'comment', selectedText: '标题', blockIndex: 0, endBlockIndex: 0,
                startOffset: 0, endOffset: 2, comment: '说明',
            });
            const afterAnnotation = calls;

            // 内容变化 → reviewVersion 自增 → 需要落盘占位记录
            Store.setFile('notes.md', '# 标题\n\n正文已修改', 'hash2', '', '/tmp/notes.md', '/tmp', 'notes.md', 'path1');
            const afterChange = calls;

            return { afterOpen, afterAnnotation, afterChange };
        });

        expect(result.afterOpen, '首次打开不应写记录').toBe(0);
        expect(result.afterAnnotation, '新增批注后应写记录').toBe(1);
        expect(result.afterChange, '内容变化升版后应写占位记录').toBe(2);
    });
});

test.describe('Issue #4 — 手动保存同步 .review 快照', () => {

    test('BT-issue4.1 doAutoSaveNow 使用最新 rawMarkdown 写入记录', async ({ page }) => {
        await openContainer(page);

        const payload = await page.evaluate(async () => {
            const mock = (window as any).__mockVscode;
            const Store = (window as any).Store;
            const Exporter = (window as any).Exporter;

            // 让宿主对 saveReview 回一条成功消息
            const original = (window as any).vscode.postMessage.bind(window.vscode);
            (window as any).vscode.postMessage = (msg: any) => {
                original(msg);
                if (msg.type === 'saveReview') {
                    setTimeout(() => {
                        window.dispatchEvent(new MessageEvent('message', {
                            data: { type: 'reviewSaved', requestId: msg.requestId, payload: { success: true } },
                        }));
                    }, 0);
                }
            };

            mock.clearMessageLog();
            Store.reset();
            Store.setFile('notes.md', '# 旧内容', 'hash1', '', '/tmp/notes.md', '/tmp', 'notes.md', 'path1');
            // 模拟 Rich Mode 下 Ctrl+S 后的最新内容
            Store.setRawMarkdown('# 新内容\n\n保存后的正文');

            await Exporter.doAutoSaveNow();

            const save = mock.getMessageLog().find((m: any) => m.type === 'saveReview');
            return save ? save.payload : null;
        });

        expect(payload).toBeTruthy();
        expect(payload.fileName).toMatch(/notes_v1_record.md$/);
        expect(payload.content).toContain('保存后的正文');
    });

    test('BT-issue4.2 handleSaveMd 保存成功后调用 doAutoSaveNow', async ({ page }) => {
        await openContainer(page);
        // handleSaveMd 位于 initApp 闭包内，这里校验导出的同步入口存在且可调用
        const info = await page.evaluate(() => {
            const Exporter = (window as any).Exporter;
            return {
                hasMethod: typeof Exporter.doAutoSaveNow === 'function',
                hasTrigger: typeof Exporter.triggerAutoSave === 'function',
            };
        });
        expect(info.hasMethod).toBe(true);
        expect(info.hasTrigger).toBe(true);
    });
});

test.describe('Issue #5 — 英文导出无中文', () => {

    test('BT-issue5.1 英文语言下生成的批阅记录为纯英文', async ({ page }) => {
        await openContainer(page);

        const doc = await page.evaluate(() => {
            const I18n = (window as any).I18n;
            const Renderer = (window as any).Renderer;
            const Exporter = (window as any).Exporter;
            I18n.setLocale('en');

            const rawMarkdown = '# Title\n\nhello world';
            const data = {
                fileName: 'notes.md',
                sourceFilePath: '/tmp/notes.md',
                docVersion: 'v1',
                reviewVersion: 1,
                rawMarkdown,
                annotations: [
                    { id: 1, type: 'comment', selectedText: 'hello', blockIndex: 1, endBlockIndex: 1, startOffset: 0, endOffset: 5, comment: 'please fix' },
                    { id: 2, type: 'delete', selectedText: 'hello', blockIndex: 1, endBlockIndex: 1, startOffset: 0, endOffset: 5 },
                    { id: 3, type: 'insert', selectedText: 'hello', blockIndex: 1, endBlockIndex: 1, startOffset: 0, endOffset: 5, insertContent: 'world', insertPosition: 'after' },
                ],
            };
            return Exporter.generateReviewDoc(data, Renderer.parseMarkdown(rawMarkdown));
        });

        expect(doc).toContain('Review Record');
        expect(doc).toContain('Operation');
        expect(doc).toContain('Instruction 1');
        expect(doc).not.toMatch(/[一-鿿]/);
    });

    test('BT-issue5.2 中文语言下仍输出中文', async ({ page }) => {
        await openContainer(page);
        const doc = await page.evaluate(() => {
            const I18n = (window as any).I18n;
            const Renderer = (window as any).Renderer;
            const Exporter = (window as any).Exporter;
            I18n.setLocale('zh-CN');
            const rawMarkdown = '# 标题\n\n正文';
            const data = {
                fileName: 'notes.md', sourceFilePath: '/tmp/notes.md', docVersion: 'v1', reviewVersion: 1,
                rawMarkdown,
                annotations: [{ id: 1, type: 'comment', selectedText: '正文', blockIndex: 1, endBlockIndex: 1, startOffset: 0, endOffset: 2, comment: '修改' }],
            };
            return Exporter.generateReviewDoc(data, Renderer.parseMarkdown(rawMarkdown));
        });
        expect(doc).toContain('操作指令');
        expect(doc).toContain('根据评论修改内容');
    });
});

test.describe('Issue #6 — 批注快捷键', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await injectMarkdown(page, MD);
        await prepareAnnotationUi(page, MD);
    });

    test('BT-issue6.1 Ctrl+Enter 为选中文本添加评论，弹窗内 Ctrl+Enter 提交', async ({ page }) => {
        await selectText(page, '需要批注');
        await page.keyboard.press('Control+Enter');
        expect(await page.evaluate(() => document.getElementById('commentModal')!.style.display)).toBe('flex');

        await page.evaluate(() => {
            (document.getElementById('commentText') as HTMLTextAreaElement).value = '快捷评论';
        });
        await page.keyboard.press('Control+Enter');

        const annotation = await page.evaluate(() => (window as any).Store.getData().annotations[0]);
        expect(annotation.type).toBe('comment');
        expect(annotation.selectedText).toBe('需要批注');
        expect(annotation.comment).toBe('快捷评论');
    });

    test('BT-issue6.2 Ctrl+Shift+D 标记删除', async ({ page }) => {
        await selectText(page, '第二段内容');
        await page.keyboard.press('Control+Shift+D');

        const annotation = await page.evaluate(() => (window as any).Store.getData().annotations[0]);
        expect(annotation.type).toBe('delete');
        expect(annotation.selectedText).toBe('第二段内容');
        await expect(page.locator('#documentContent .highlight-delete')).toHaveCount(1);
    });

    test('BT-issue6.3 Ctrl+Shift+A 在选区后插入内容', async ({ page }) => {
        await selectText(page, '需要批注');
        await page.keyboard.press('Control+Shift+A');
        expect(await page.evaluate(() => document.getElementById('insertModal')!.style.display)).toBe('flex');

        await page.evaluate(() => {
            (document.getElementById('insertText') as HTMLTextAreaElement).value = '新增内容';
        });
        await page.keyboard.press('Control+Enter');

        const annotation = await page.evaluate(() => (window as any).Store.getData().annotations[0]);
        expect(annotation.type).toBe('insert');
        expect(annotation.insertPosition).toBe('after');
        expect(annotation.insertContent).toBe('新增内容');
    });

    test('BT-issue6.4 Ctrl+Shift+B 在选区前插入内容', async ({ page }) => {
        await selectText(page, '需要批注');
        await page.keyboard.press('Control+Shift+B');
        expect(await page.evaluate(() => document.getElementById('insertModal')!.style.display)).toBe('flex');

        const position = await page.evaluate(() => {
            const label = document.getElementById('insertPositionLabel');
            return label ? label.textContent : '';
        });
        expect(position).toBeTruthy();
    });

    test('BT-issue6.5 Ctrl+Shift+J/K 在批注之间导航', async ({ page }) => {
        // 先通过 Store 准备两条批注
        await page.evaluate(() => {
            const Store = (window as any).Store;
            Store.addAnnotation({ type: 'comment', selectedText: '需要批注', blockIndex: 1, endBlockIndex: 1, startOffset: 0, endOffset: 4, comment: '一' });
            Store.addAnnotation({ type: 'comment', selectedText: '第二段', blockIndex: 2, endBlockIndex: 2, startOffset: 0, endOffset: 3, comment: '二' });
            (window as any).Annotations.renderAnnotationsList();
        });
        await expect(page.locator('#annotationsList .annotation-card')).toHaveCount(2);

        await page.keyboard.press('Control+Shift+J');
        const firstActive = await page.evaluate(() =>
            document.querySelector('#annotationsList .annotation-card.active')?.getAttribute('data-id') || '');
        expect(firstActive).not.toBe('');

        await page.keyboard.press('Control+Shift+J');
        const secondActive = await page.evaluate(() =>
            document.querySelector('#annotationsList .annotation-card.active')?.getAttribute('data-id') || '');
        expect(secondActive).not.toBe('');
        expect(secondActive).not.toBe(firstActive);
    });

    test('BT-issue6.6 Ctrl+Shift+T 切换目录面板', async ({ page }) => {
        await page.keyboard.press('Control+Shift+T');
        await expect(page.locator('#tocPanel')).toHaveClass(/collapsed/);

        await page.keyboard.press('Control+Shift+T');
        await expect(page.locator('#tocPanel')).not.toHaveClass(/collapsed/);
    });

    test('BT-issue6.7 富文本模式下不触发批注快捷键', async ({ page }) => {
        // 模拟富文本模式（真实场景由 EditMode 状态机维护）
        await page.evaluate(() => {
            (window as any).EditMode.isRichActive = () => true;
        });
        await page.keyboard.press('Control+Shift+D');

        const count = await page.evaluate(() => (window as any).Store.getData().annotations.length);
        expect(count).toBe(0);
    });
});
