import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createRichEditor } from '../helpers/pm-test-utils';

/**
 * 富文本模式 — 完整语法与编辑
 *
 * 使用 test/ui/fixtures 下格式丰富的文档验证 ProseMirror 解析、往返保真与编辑行为。
 */

const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

function readFixture(name: string): string {
    // 统一换行符：.gitattributes 强制 CRLF，Linux CI 检出后会多出 \r
    return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8').replace(/\r\n/g, '\n');
}

async function getMarkdown(page: import('@playwright/test').Page): Promise<string> {
    return page.evaluate(() => (window as any).__editor.getMarkdown());
}

test.describe('富文本模式 — 完整语法', () => {

    test('BT-richfull.1 各类块级语法都能进入编辑器', async ({ page }) => {
        await createRichEditor(page, readFixture('full-syntax.md'));

        for (const level of [1, 2, 3, 4, 5, 6]) {
            await expect(page.locator(`.ProseMirror h${level}`).first()).toBeVisible();
        }
        await expect(page.locator('.ProseMirror ul').first()).toBeVisible();
        await expect(page.locator('.ProseMirror ol').first()).toBeVisible();
        await expect(page.locator('.ProseMirror .task-list-item').first()).toBeVisible();
        await expect(page.locator('.ProseMirror table').first()).toBeVisible();
        await expect(page.locator('.ProseMirror th').first()).toBeVisible();
        await expect(page.locator('.ProseMirror pre').first()).toBeVisible();
        await expect(page.locator('.ProseMirror .gh-alert').first()).toBeVisible();
        await expect(page.locator('.ProseMirror .diagram-nodeview').first()).toBeVisible();
        await expect(page.locator('.ProseMirror .math-inline, .ProseMirror .math-display').first()).toBeVisible();
        await expect(page.locator('.ProseMirror .pm-footnote-ref').first()).toBeVisible();
    });

    test('BT-richfull.2 往返保留关键语法与内容量', async ({ page }) => {
        const markdown = readFixture('full-syntax.md');
        await createRichEditor(page, markdown);
        const output = await getMarkdown(page);

        for (const marker of [
            '**粗体文本**',
            '*斜体文本*',
            '~~删除线文本~~',
            '~下标文本~',
            '{color:red}',
            '- [x] 项目初始化',
            '| 功能 | 状态 | 说明 |',
            '```mermaid',
            '[^1]: 这是第一个脚注的内容',
            '> [!WARNING]',
            '###### 六级标题',
            '<kbd>Ctrl</kbd>',
        ]) {
            expect(output, `往返结果应保留 ${marker}`).toContain(marker);
        }

        // HTML 容器标签（<details>）会被规范化，允许少量长度损耗
        expect(output.length).toBeGreaterThan(markdown.length * 0.9);
    });

    test('BT-richfull.3 二次往返幂等', async ({ page }) => {
        const markdown = readFixture('full-syntax.md');
        await createRichEditor(page, markdown);

        const once = await getMarkdown(page);
        const twice = await page.evaluate((md) => (window as any).PM.serializeMarkdown(md, false), once);
        expect(twice).toBe(once);
    });

    test('BT-richfull.4 富文本内的批注高亮', async ({ page }) => {
        await createRichEditor(
            page,
            '# 标题\n\n这是 **粗体** 段落。',
            [{
                id: 1,
                type: 'comment',
                blockIndex: 1,
                endBlockIndex: 1,
                startOffset: 0,
                endOffset: 2,
                selectedText: '这是',
            }]
        );

        const highlight = page.locator('.ProseMirror .annotation-highlight');
        await expect(highlight).toHaveCount(1);
        await expect(highlight.first()).toContainText('这是');
    });

    test('BT-richfull.5 编辑单块不影响其他块', async ({ page }) => {
        const markdown = '# 标题\n\n第一段内容。\n\n第二段内容。';
        await createRichEditor(page, markdown);
        const before = await getMarkdown(page);

        await page.evaluate(() => {
            const editor = (window as any).__editor;
            editor.setCursorPosition({ blockIndex: 2, offset: 6 });
            editor.focus();
        });
        await page.keyboard.type('新增');

        const after = await getMarkdown(page);
        expect(after).toBe(before.replace('第二段内容。', '第二段内容。新增'));
    });

    test('BT-richfull.6 带 frontmatter 的 mdc 往返保留前置信息', async ({ page }) => {
        const markdown = readFixture('frontmatter-nested.mdc');
        await createRichEditor(page, markdown);

        await expect(page.locator('.ProseMirror .frontmatter-nodeview')).toHaveCount(1);

        const output = await getMarkdown(page);
        expect(output).toContain('alwaysApply: true');
        expect(output).toContain('```markdown');
        expect(output).toContain('- [x] abc');
    });

    test('BT-richfull.7 长文档（comprehensive.md）可加载并保持内容', async ({ page }) => {
        const markdown = readFixture('comprehensive.md');
        await createRichEditor(page, markdown);

        await expect(page.locator('.ProseMirror h1').first()).toBeVisible();
        const output = await getMarkdown(page);
        expect(output.length).toBeGreaterThan(markdown.length * 0.95);

        // 二次往返仍幂等，避免每次进入富文本都持续改写文档
        const twice = await page.evaluate((md) => (window as any).PM.serializeMarkdown(md, false), output);
        expect(twice).toBe(output);
    });
});
