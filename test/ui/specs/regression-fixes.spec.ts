import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { openContainer, injectMarkdown } from '../helpers/test-utils';

/**
 * 回归测试 — 2026-10 全库代码评审修复项
 *
 * 覆盖范围：
 *   - 预览侧：链接内行内 Markdown、图片链接文字、标题 slug 去重、
 *     软换行批注高亮、图片加载失败占位、YAML frontmatter 展开状态与滚动
 *   - 富文本侧：列表之后的批注定位、斜杠命令过滤与执行
 */

const PM_CONTAINER_PATH = path.resolve(__dirname, '..', 'pm-container.html');

function pmContainerUrl(): string {
    return `file:///${PM_CONTAINER_PATH.replace(/\\/g, '/')}`;
}

/**
 * 在 ProseMirror 测试容器中创建编辑器
 */
async function createRichEditor(
    page: Page,
    markdown: string,
    annotations: any[] = []
): Promise<void> {
    await page.goto(pmContainerUrl());
    await page.waitForFunction(() => typeof (window as any).PM?.createRichEditor === 'function', { timeout: 15000 });
    await page.evaluate(({ md, anns }) => {
        const parent = document.getElementById('pmParent')!;
        (window as any).__editor = (window as any).PM.createRichEditor({
            parent,
            markdown: md,
            annotations: anns,
        });
    }, { md: markdown, anns: annotations });
    await page.waitForSelector('.ProseMirror');
}

// ===== 预览渲染回归 =====

test.describe('回归：预览渲染', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
    });

    test('BT-regression.preview.1 链接内的行内 Markdown 应被解析', async ({ page }) => {
        await injectMarkdown(page, '[**重要**](https://example.com)');

        const link = page.locator('#documentContent a').first();
        await expect(link).toHaveAttribute('href', 'https://example.com');
        await expect(link.locator('strong')).toHaveText('重要');
        // 不应残留原始 Markdown 记号
        await expect(page.locator('#documentContent')).not.toContainText('**重要**');
    });

    test('BT-regression.preview.2 图片链接应同时保留图片与后续文字', async ({ page }) => {
        await injectMarkdown(page, '[![替代文字](missing.png) 图注文字](https://example.com)');

        const link = page.locator('#documentContent a').first();
        await expect(link.locator('img')).toHaveCount(1);
        await expect(link).toContainText('图注文字');
    });

    test('BT-regression.preview.3 同名标题应生成唯一 id', async ({ page }) => {
        await injectMarkdown(page, '## 示例\n\n第一段\n\n## 示例\n\n第二段');

        const ids = await page.locator('#documentContent h2').evaluateAll(
            (els) => els.map((el) => el.id)
        );
        expect(ids).toEqual(['示例', '示例-1']);

        // 第二个锚点必须指向第二个标题
        const secondId = await page.locator('#documentContent h2').nth(1).getAttribute('id');
        expect(secondId).toBe('示例-1');
        expect(await page.locator(`#documentContent #${secondId}`).count()).toBe(1);
    });

    test('BT-regression.preview.4 跨软换行的批注应高亮而不是退化为 fallback', async ({ page }) => {
        const markdown = 'line1\nline2';
        const selectedText = 'line1\nline2';
        await page.evaluate(({ md, text }) => {
            const Renderer = (window as any).Renderer;
            const blocks = Renderer.parseMarkdown(md);
            Renderer.renderBlocks(blocks, [{
                id: 1,
                type: 'comment',
                blockIndex: 0,
                endBlockIndex: 0,
                startOffset: 0,
                endOffset: text.length,
                selectedText: text,
            }]);
        }, { md: markdown, text: selectedText });

        // 软换行渲染为 <br>，跨行选区应被拆成两段高亮
        const highlights = page.locator('#documentContent .highlight-comment');
        await expect(highlights).toHaveCount(2);

        const texts = await highlights.evaluateAll((els) => els.map((el) => {
            // 高亮 span 内还包含批注序号徽标（annotation-indicator），比较时排除
            const clone = el.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('.annotation-indicator').forEach((n) => n.remove());
            return clone.textContent || '';
        }));
        expect(texts.join('')).toBe('line1line2');

        // 不应退化为不可见的 fallback 标记
        await expect(page.locator('#documentContent .annotation-fallback-marker')).toHaveCount(0);
    });

    test('BT-regression.preview.5 图片加载失败应显示占位提示（CSP 下同样生效）', async ({ page }) => {
        await injectMarkdown(page, '![缺失图片](__definitely_missing__.png)');

        // 内联 onerror 被 CSP 拦截时，这里的占位永远不会出现
        const placeholder = page.locator('#documentContent .img-placeholder');
        await expect(placeholder).toHaveCount(1, { timeout: 5000 });
        await expect(placeholder).toContainText('__definitely_missing__.png');

        const img = page.locator('#documentContent img.md-image').first();
        await expect(img).toBeHidden();
    });

    test('BT-regression.preview.6 重新渲染后 YAML 卡片保持展开状态', async ({ page }) => {
        const markdown = '---\ntitle: 测试文档\nauthor: tester\n---\n\n# 正文';
        await page.evaluate((md) => {
            const Renderer = (window as any).Renderer;
            Renderer.renderBlocks(Renderer.parseMarkdown(md), []);
        }, markdown);

        const card = page.locator('#documentContent .frontmatter-card').first();
        await expect(card).toHaveClass(/fm-collapsed/);

        await card.locator('.fm-header').click();
        await expect(card).not.toHaveClass(/fm-collapsed/);

        // 模拟批注刷新等场景触发的整篇重渲染
        await page.evaluate((md) => {
            const Renderer = (window as any).Renderer;
            Renderer.renderBlocks(Renderer.parseMarkdown(md), []);
        }, markdown);

        await expect(page.locator('#documentContent .frontmatter-card').first())
            .not.toHaveClass(/fm-collapsed/);
    });

    test('BT-regression.preview.7 超长 frontmatter 展开后应可滚动查看', async ({ page }) => {
        const props = Array.from({ length: 40 }, (_, i) => `key${i}: value${i}`).join('\n');
        const markdown = `---\n${props}\n---\n\n# 正文`;

        await page.evaluate((md) => {
            const Renderer = (window as any).Renderer;
            Renderer.renderBlocks(Renderer.parseMarkdown(md), []);
        }, markdown);
        await page.locator('#documentContent .fm-header').click();

        const fmBody = page.locator('#documentContent .fm-body').first();
        const metrics = await fmBody.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
                overflowY: style.overflowY,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
            };
        });

        expect(metrics.overflowY).toBe('auto');
        // 内容高度超出容器时必须可滚动，否则尾部属性永远不可见
        expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    });
});

// ===== ProseMirror 富文本回归 =====

test.describe('回归：ProseMirror 批注与斜杠命令', () => {

    test('BT-regression.pm.1 列表之后的批注应定位到正确块', async ({ page }) => {
        await createRichEditor(
            page,
            '# 标题\n\n- a\n- b\n\npara',
            [{
                id: 1,
                type: 'comment',
                blockIndex: 2,          // 预览侧第 3 个顶层块 = 段落 para
                endBlockIndex: 2,
                startOffset: 0,
                endOffset: 4,
                selectedText: 'para',
            }]
        );

        const highlights = page.locator('.ProseMirror .annotation-highlight');
        await expect(highlights).toHaveCount(1);
        await expect(highlights.first()).toHaveText('para');
    });

    test('BT-regression.pm.2 斜杠命令应按输入过滤并执行选中项', async ({ page }) => {
        await createRichEditor(page, '');
        await page.locator('.ProseMirror').click();

        await page.keyboard.type('/');
        const menu = page.locator('.slash-command-menu');
        await expect(menu).toBeVisible();

        // 未过滤时应展示全部命令
        const totalCount = await menu.locator('.slash-command-item').count();
        expect(totalCount).toBeGreaterThan(1);

        // 输入过滤词后应只剩匹配项
        await page.keyboard.type('h2');
        await expect(menu.locator('.slash-command-item')).toHaveCount(1);
        await expect(menu.locator('.slash-command-item').first()).toContainText('heading2');

        await page.keyboard.press('Enter');

        // 必须执行过滤后的 h2，而不是命令列表第一项（h1）
        await expect(page.locator('.ProseMirror h2')).toHaveCount(1);
        await expect(page.locator('.ProseMirror h1')).toHaveCount(0);
        await expect(menu).toBeHidden();
    });

    test('BT-regression.pm.3 斜杠命令 /table 应插入 3×3 表格', async ({ page }) => {
        await createRichEditor(page, '');
        await page.locator('.ProseMirror').click();

        await page.keyboard.type('/');
        const menu = page.locator('.slash-command-menu');
        await expect(menu).toBeVisible();

        await page.keyboard.type('table');
        await expect(menu.locator('.slash-command-item')).toHaveCount(1);

        await page.keyboard.press('Enter');

        // 命令 id 曾与 commandMap 的 insertTable 不一致，导致选中后什么都不发生
        await expect(page.locator('.ProseMirror table')).toHaveCount(1);
        await expect(page.locator('.ProseMirror table tr')).toHaveCount(3);
        await expect(page.locator('.ProseMirror table th')).toHaveCount(3);
        await expect(menu).toBeHidden();
    });
});
