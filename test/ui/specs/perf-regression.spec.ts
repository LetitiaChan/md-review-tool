import { test, expect } from '@playwright/test';
import { openContainer, injectMarkdown, waitForRender } from '../helpers/test-utils';
import { createRichEditor } from '../helpers/pm-test-utils';

/**
 * 渲染正确性与性能回归
 *
 * 正确性部分验证「批注刷新后公式/图表/按钮仍然可用」；
 * 性能基准部分放在本文件末尾，阈值放宽以避免机器抖动误报。
 */

test.describe('批注刷新后的渲染完整性', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
    });

    test('BT-perf.1 添加批注后 KaTeX 公式不应退化为占位符', async ({ page }) => {
        await injectMarkdown(page, '公式 $x^2$ 结尾');
        await expect(page.locator('#documentContent .katex')).toHaveCount(1);

        // 模拟 annotations.refreshView 的行为：整篇重渲染 + 新批注
        await page.evaluate(() => {
            const Renderer = (window as any).Renderer;
            const blocks = Renderer.parseMarkdown('公式 $x^2$ 结尾');
            Renderer.renderBlocks(blocks, [{
                id: 1, type: 'comment', blockIndex: 0, endBlockIndex: 0,
                startOffset: 0, endOffset: 2, selectedText: '公式',
            }]);
        });

        await expect(page.locator('#documentContent .katex')).toHaveCount(1);
        await expect(page.locator('#documentContent')).not.toContainText('%%MATH_EXPR');
    });

    test('BT-perf.2 添加批注后代码复制按钮应重新绑定', async ({ page }) => {
        await injectMarkdown(page, '```js\nconst a = 1;\n```');
        await expect(page.locator('.code-copy-btn')).toHaveCount(1);

        await page.evaluate(() => {
            const Renderer = (window as any).Renderer;
            const blocks = Renderer.parseMarkdown('```js\nconst a = 1;\n```');
            Renderer.renderBlocks(blocks, [{
                id: 1, type: 'comment', blockIndex: 0, endBlockIndex: 0,
                startOffset: 0, endOffset: 3, selectedText: 'const',
            }]);
        });

        const bound = await page.locator('.code-copy-btn').evaluateAll(
            (els) => els.every((el) => (el as HTMLElement).dataset.copyBound === 'true')
        );
        expect(bound).toBe(true);
    });

    test('BT-perf.3 重复调用 Annotations.init 不应重复绑定监听器', async ({ page }) => {
        const counts = await page.evaluate(() => {
            const Annotations = (window as any).Annotations;
            const blocks = (window as any).Renderer.parseMarkdown('# 标题\n\n正文');

            const original = EventTarget.prototype.addEventListener;
            let count = 0;
            // @ts-ignore
            EventTarget.prototype.addEventListener = function (...args: any[]) {
                count++;
                // @ts-ignore
                return original.apply(this, args);
            };

            Annotations.init(blocks);
            const first = count; count = 0;
            Annotations.init(blocks);
            const second = count; count = 0;
            Annotations.init(blocks);
            const third = count;

            // @ts-ignore
            EventTarget.prototype.addEventListener = original;
            return { first, second, third };
        });

        // 第一次建立绑定是正常的；后续重复 init 不应再绑定成套监听器
        expect(counts.first).toBeGreaterThan(0);
        expect(counts.second).toBeLessThan(5);
        expect(counts.third).toBeLessThan(5);
    });

    test('BT-perf.5 富文本光标位置按块索引记录与恢复', async ({ page }) => {
        const markdown = '# 标题\n\n- a\n- b\n\n第三段内容';
        await createRichEditor(page, markdown);

        // 点击最后一个段落（顶层块索引 2：heading / list / paragraph）
        await page.locator('.ProseMirror p').last().click();
        const saved = await page.evaluate(() => (window as any).__editor.getCursorPosition());
        expect(saved.blockIndex).toBe(2);
        expect(saved.offset).toBeGreaterThanOrEqual(0);

        // 用记录的位置重新创建编辑器，光标应落在同一块
        const restored = await page.evaluate((pos) => {
            const parent = document.getElementById('pmParent')!;
            parent.innerHTML = '';
            const editor = (window as any).PM.createRichEditor({
                parent,
                markdown: '# 标题\n\n- a\n- b\n\n第三段内容',
                initialCursorPosition: pos,
            });
            (window as any).__editor2 = editor;
            return editor.getCursorPosition();
        }, saved);

        expect(restored.blockIndex).toBe(2);
        expect(restored.offset).toBe(saved.offset);
    });

    test('BT-perf.6 新增单条批注只重建受影响的块', async ({ page }) => {
        const result = await page.evaluate(() => {
            const Renderer = (window as any).Renderer;
            Renderer.configureHighlight();
            const N = 1000;
            const parts: string[] = [];
            for (let i = 0; i < N; i++) {
                parts.push('## 章节 ' + i + '\n\n这是第 ' + i + ' 段正文内容，包含 **加粗** 与普通文字。');
            }
            const blocks = Renderer.parseMarkdown(parts.join('\n\n'));
            const anns: any[] = [];
            for (let i = 0; i < 100; i++) {
                anns.push({
                    id: i + 1, type: 'comment', blockIndex: i * 2 + 1, endBlockIndex: i * 2 + 1,
                    startOffset: 0, endOffset: 3, selectedText: '这是第', comment: 'x',
                });
            }
            Renderer.renderBlocks(blocks, anns);

            const before = document.querySelectorAll('.highlight-comment').length;
            const wrappers = document.querySelectorAll('#documentContent > .md-block');
            (wrappers[5] as HTMLElement).dataset.untouched = '1';

            const next = anns.concat([{
                id: 999, type: 'comment', blockIndex: 9, endBlockIndex: 9,
                startOffset: 0, endOffset: 3, selectedText: '这是第', comment: '',
            }]);

            const t0 = performance.now();
            const updated = Renderer.updateAnnotations(next);
            const ms = performance.now() - t0;

            const sameNode = (document.querySelectorAll('#documentContent > .md-block')[5] as HTMLElement).dataset.untouched === '1';
            return {
                updated, ms,
                before,
                after: document.querySelectorAll('.highlight-comment').length,
                sameNode,
            };
        });

        expect(result.updated).toBe(true);
        expect(result.after).toBe(result.before + 1);
        // 未受影响的块必须保持同一个 DOM 节点（没有被整篇重建）
        expect(result.sameNode).toBe(true);
        expect(result.ms).toBeLessThan(50);
    });
});

test.describe('渲染性能基准', () => {

    test('BT-perf.4 marked.parse 在 4000 块文档上应保持线性', async ({ page }) => {
        await openContainer(page);

        const times = await page.evaluate(() => {
            const Renderer = (window as any).Renderer;
            Renderer.configureHighlight();
            const make = (n: number) => {
                const parts: string[] = [];
                for (let i = 0; i < n; i++) {
                    parts.push('段落 ' + i + ' 这是用于基准测试的正文内容，重复一些中英文 mixed text。');
                }
                return parts.join('\n\n');
            };
            const result: Record<number, number> = {};
            for (const n of [1000, 2000, 4000]) {
                const md = make(n);
                const t0 = performance.now();
                (window as any).marked.parse(md);
                result[n] = performance.now() - t0;
            }
            return result;
        });

        // 修复前 4000 块约 2300ms；修复后应 < 300ms（阈值留 4 倍余量）
        expect(times[4000]).toBeLessThan(300);
        // 规模翻倍不应让耗时翻四倍
        expect(times[4000] / Math.max(times[1000], 1)).toBeLessThan(8);
    });
});
