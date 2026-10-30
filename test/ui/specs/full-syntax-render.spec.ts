import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender, readFixture } from '../helpers/test-utils';
import { addComment, insertAfter, markDelete, prepareAnnotationUi } from '../helpers/annotation-actions';

/**
 * 完整语法文档（test/ui/fixtures/full-syntax.md）
 *
 * 覆盖预览渲染与批注交互：YAML Front Matter、表格、代码块、告警块、任务列表、
 * 脚注、定义列表、折叠内容、数学公式、Mermaid / PlantUML / Graphviz。
 */

const FIXTURE = 'full-syntax.md';

test.describe('完整语法文档 — 预览渲染', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, FIXTURE);
        await waitForRender(page);
    });

    test('BT-fullsyntax.0 YAML Front Matter 渲染为卡片且不干扰 GFM 正文', async ({ page }) => {
        // 首个块是 frontmatter 卡片，默认折叠
        const firstBlock = page.locator('#documentContent .md-block').first();
        const card = firstBlock.locator('.frontmatter-card');
        await expect(card).toHaveCount(1);
        await expect(card).toHaveClass(/fm-collapsed/);
        await expect(card.locator('.fm-title')).toHaveText('YAML Front Matter');

        // 展开后展示 YAML 键值（含嵌套字段）
        await card.locator('.fm-header').click();
        await expect(card).not.toHaveClass(/fm-collapsed/);
        for (const key of ['title', 'description', 'author', 'version', 'tags', 'settings', 'theme', 'enableMath']) {
            await expect(card.locator('.fm-key').filter({ hasText: new RegExp(`^${key}$`) })).toHaveCount(1);
        }
        await expect(card).toContainText('完整语法与图表渲染测试文档');
        await expect(card).toContainText('enableMath: true');

        // frontmatter 之后的 GFM 正文仍正常渲染
        await expect(page.locator('#documentContent h1').first()).toHaveText('📋 完整语法与图表渲染测试文档');
        await expect(page.locator('#documentContent strong').first()).toBeVisible();
        await expect(page.locator('#documentContent table').first()).toBeVisible();
    });

    test('BT-fullsyntax.1 标题 H1-H6 全部渲染', async ({ page }) => {
        for (const level of [1, 2, 3, 4, 5, 6]) {
            await expect(page.locator(`#documentContent h${level}`).first()).toBeVisible();
        }
    });

    test('BT-fullsyntax.2 行内格式', async ({ page }) => {
        const content = page.locator('#documentContent');
        await expect(content.locator('strong').first()).toBeVisible();
        await expect(content.locator('em').first()).toBeVisible();
        await expect(content.locator('del').first()).toHaveText('删除线文本');
        await expect(content.locator('mark').first()).toHaveText('高亮2文本');
        await expect(content.locator('sup').filter({ hasText: '上标文本' }).first()).toBeVisible();
        await expect(content.locator('sub').first()).toHaveText('下标文本');
        await expect(content.locator('ins').first()).toHaveText('下划线文本');
        await expect(content.locator('span[style*="color"]').first()).toBeVisible();
    });

    test('BT-fullsyntax.3 链接与图片', async ({ page }) => {
        expect(await page.locator('#documentContent a[target="_blank"]').count()).toBeGreaterThan(5);
        await expect(page.locator('#documentContent a[href="https://github.com"]')).toHaveCount(1);
        // 引用式链接应解析成真实 href
        await expect(page.locator('#documentContent a[href="https://github.com/Fission-AI/OpenSpec"]')).toHaveCount(1);
        await expect(page.locator('#documentContent img.md-image')).toHaveCount(1);
    });

    test('BT-fullsyntax.4 列表与任务列表', async ({ page }) => {
        await expect(page.locator('#documentContent ul').first()).toBeVisible();
        await expect(page.locator('#documentContent ol').first()).toBeVisible();
        await expect(page.locator('#documentContent .task-list-item')).toHaveCount(7);
        await expect(page.locator('#documentContent .task-list-item input[type="checkbox"]')).toHaveCount(7);
    });

    test('BT-fullsyntax.5 引用与 5 种告警块', async ({ page }) => {
        expect(await page.locator('#documentContent blockquote').count()).toBeGreaterThanOrEqual(9);
        for (const type of ['note', 'tip', 'important', 'warning', 'caution']) {
            expect(await page.locator(`#documentContent .alert-${type}`).count()).toBeGreaterThanOrEqual(1);
        }
    });

    test('BT-fullsyntax.6 代码块高亮与复制按钮', async ({ page }) => {
        await expect(page.locator('#documentContent .code-block')).toHaveCount(11);
        await expect(page.locator('#documentContent .code-block[data-lang="python"]').first()).toBeVisible();
        await expect(page.locator('#documentContent .code-copy-btn')).toHaveCount(11);
    });

    test('BT-fullsyntax.7 表格', async ({ page }) => {
        await expect(page.locator('#documentContent table')).toHaveCount(4);
        expect(await page.locator('#documentContent th').count()).toBeGreaterThanOrEqual(13);
        expect(await page.locator('#documentContent td').count()).toBeGreaterThanOrEqual(49);
    });

    test('BT-fullsyntax.8 数学公式与图表', async ({ page }) => {
        expect(await page.locator('#documentContent .katex').count()).toBeGreaterThanOrEqual(12);
        expect(await page.locator('#documentContent .mermaid-rendered svg').count()).toBeGreaterThanOrEqual(3);
        expect(await page.locator('#documentContent .plantuml-container').count()).toBeGreaterThanOrEqual(1);
        expect(await page.locator('#documentContent .graphviz-container').count()).toBeGreaterThanOrEqual(1);
    });

    test('BT-fullsyntax.9 脚注与定义列表', async ({ page }) => {
        await expect(page.locator('#documentContent .footnotes')).toHaveCount(1);
        await expect(page.locator('#documentContent sup a[data-fn-ref]')).toHaveCount(2);
        await expect(page.locator('#documentContent dl')).toHaveCount(2);
        await expect(page.locator('#documentContent dt')).toHaveCount(2);
        await expect(page.locator('#documentContent dd')).toHaveCount(2);
    });

    test('BT-fullsyntax.10 折叠内容 / 分隔线 / Emoji', async ({ page }) => {
        await expect(page.locator('#documentContent details')).toHaveCount(1);
        await expect(page.locator('#documentContent summary')).toHaveCount(1);
        expect(await page.locator('#documentContent hr').count()).toBeGreaterThanOrEqual(20);
        await expect(page.locator('#documentContent')).toContainText('🚀');
    });
});

test.describe('完整语法文档 — 批注', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, FIXTURE);
        await waitForRender(page);
        await prepareAnnotationUi(page, readFixture(FIXTURE));
    });

    test('BT-fullsyntax.ann.1 在加粗文本上添加评论', async ({ page }) => {
        await addComment(page, '粗体文本', '这里需要补充说明');

        const annotation = await page.evaluate(() => (window as any).Store.getData().annotations[0]);
        expect(annotation.type).toBe('comment');
        expect(annotation.selectedText).toBe('粗体文本');
        expect(annotation.blockText).toContain('**粗体文本**');

        // 高亮落在 strong 内，原有格式未丢失（span 内还包含批注序号徽标）
        await expect(page.locator('#documentContent strong .highlight-comment').first()).toContainText('粗体文本');
        await expect(page.locator('#documentContent strong').first()).toContainText('粗体文本');
    });

    test('BT-fullsyntax.ann.2 在表格单元格内添加评论', async ({ page }) => {
        await addComment(page, 'Mermaid 渲染', '核对渲染结果');

        await expect(page.locator('#documentContent td .highlight-comment')).toHaveCount(1);
        const blockText = await page.evaluate(() => (window as any).Store.getData().annotations[0].blockText);
        expect(blockText).toContain('| 功能 | 状态 | 说明 |');
    });

    test('BT-fullsyntax.ann.3 标记删除任务列表文本', async ({ page }) => {
        await markDelete(page, '单元测试编写');

        await expect(page.locator('#documentContent .highlight-delete')).toHaveCount(1);
        // 删除标记不影响同块其他任务项与复选框
        await expect(page.locator('#documentContent .task-list-item input[type="checkbox"]')).toHaveCount(7);
        expect(await page.evaluate(() => (window as any).Store.getData().annotations[0].type)).toBe('delete');
    });

    test('BT-fullsyntax.ann.4 在有序列表项后插入内容', async ({ page }) => {
        await insertAfter(page, '第一步：需求分析', '补充：确认验收标准');

        await expect(page.locator('#documentContent .insert-marker')).toHaveCount(1);
        const annotation = await page.evaluate(() => (window as any).Store.getData().annotations[0]);
        expect(annotation.type).toBe('insert');
        expect(annotation.insertContent).toBe('补充：确认验收标准');
    });

    test('BT-fullsyntax.ann.5 多条批注共存且不破坏格式', async ({ page }) => {
        await addComment(page, '粗体文本', '评论一');
        await addComment(page, '斜体文本', '评论二');
        await markDelete(page, '单元测试编写');

        const annotations = await page.evaluate(() => (window as any).Store.getData().annotations);
        expect(annotations).toHaveLength(3);

        await expect(page.locator('#documentContent .highlight-comment')).toHaveCount(2);
        await expect(page.locator('#documentContent .highlight-delete')).toHaveCount(1);
        await expect(page.locator('#documentContent strong').first()).toBeVisible();
        await expect(page.locator('#documentContent em').first()).toBeVisible();
    });
});
