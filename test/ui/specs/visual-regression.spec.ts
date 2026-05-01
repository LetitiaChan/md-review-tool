/**
 * 视觉回归测试（Visual Regression Testing）
 *
 * 使用 Playwright 的 toHaveScreenshot() API 进行像素级截图对比。
 * 首次运行会生成基准截图（golden files），后续运行自动对比差异。
 *
 * 更新基准截图：npm run test:ui:update-snapshots
 *
 * 注意事项：
 * - 截图对比对环境敏感（字体渲染、抗锯齿等），已通过 maxDiffPixelRatio 容忍微小差异
 * - 如果 CI 环境与本地环境截图不一致，可能需要为 CI 单独维护一套基准截图
 * - 基准截图存储在 test/ui/specs/__screenshots__/ 目录下，需纳入 Git 版本控制
 */

import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, injectMarkdown, waitForRender } from '../helpers/test-utils';

test.describe('视觉回归测试 (Visual Regression)', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
    });

    test.describe('基础渲染截图', () => {

        test('VR-render.1 标题 + 段落 + 列表的整体渲染', async ({ page }) => {
            await loadFixture(page, 'basic-rendering.md');
            await waitForRender(page);

            // 对文档内容区域截图
            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('basic-rendering-full.png');
        });

        test('VR-render.2 表格渲染样式', async ({ page }) => {
            await injectMarkdown(page, [
                '## 数据表格',
                '',
                '| 姓名 | 年龄 | 城市 |',
                '|------|------|------|',
                '| 张三 | 28 | 北京 |',
                '| 李四 | 32 | 上海 |',
                '| 王五 | 25 | 广州 |',
            ].join('\n'));
            await waitForRender(page);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('table-rendering.png');
        });

        test('VR-render.3 代码块语法高亮', async ({ page }) => {
            await injectMarkdown(page, [
                '```typescript',
                'interface User {',
                '  name: string;',
                '  age: number;',
                '  email?: string;',
                '}',
                '',
                'function greet(user: User): string {',
                '  return `Hello, ${user.name}!`;',
                '}',
                '```',
            ].join('\n'));
            await waitForRender(page);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('code-block-highlight.png');
        });

        test('VR-render.4 GitHub 风格告警块', async ({ page }) => {
            await injectMarkdown(page, [
                '> [!NOTE]',
                '> 这是一条提示信息。',
                '',
                '> [!WARNING]',
                '> 这是一条警告信息，请注意。',
                '',
                '> [!TIP]',
                '> 这是一条建议信息。',
            ].join('\n'));
            await waitForRender(page);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('alert-blocks.png');
        });
    });

    test.describe('图表渲染截图', () => {

        test('VR-chart.1 Mermaid 流程图', async ({ page }) => {
            await injectMarkdown(page, [
                '```mermaid',
                'graph TD',
                '    A[开始] --> B{条件判断}',
                '    B -->|是| C[执行操作]',
                '    B -->|否| D[跳过]',
                '    C --> E[结束]',
                '    D --> E',
                '```',
            ].join('\n'));
            await waitForRender(page);
            // Mermaid 渲染是异步的，额外等待确保 SVG 完全生成
            await page.waitForTimeout(2000);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('mermaid-flowchart.png');
        });

        test('VR-chart.2 Mermaid 时序图', async ({ page }) => {
            await injectMarkdown(page, [
                '```mermaid',
                'sequenceDiagram',
                '    participant A as 客户端',
                '    participant B as 服务器',
                '    A->>B: 请求数据',
                '    B-->>A: 返回结果',
                '    A->>B: 确认收到',
                '```',
            ].join('\n'));
            await waitForRender(page);
            await page.waitForTimeout(2000);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('mermaid-sequence.png');
        });
    });

    test.describe('数学公式截图', () => {

        test('VR-math.1 行内公式与块级公式', async ({ page }) => {
            await injectMarkdown(page, [
                '## 数学公式示例',
                '',
                '行内公式：$E = mc^2$ 是质能方程。',
                '',
                '块级公式：',
                '',
                '$$',
                '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}',
                '$$',
                '',
                '矩阵：',
                '',
                '$$',
                '\\begin{pmatrix}',
                'a & b \\\\',
                'c & d',
                '\\end{pmatrix}',
                '$$',
            ].join('\n'));
            await waitForRender(page);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('math-formulas.png');
        });
    });

    test.describe('主题切换截图', () => {

        test('VR-theme.1 暗色主题整体渲染', async ({ page }) => {
            await injectMarkdown(page, [
                '# 暗色主题测试',
                '',
                '这是一段普通文本，用于验证暗色主题下的文字颜色和背景对比度。',
                '',
                '## 代码块',
                '',
                '```javascript',
                'const theme = "dark";',
                'console.log(`Current theme: ${theme}`);',
                '```',
                '',
                '## 表格',
                '',
                '| 项目 | 状态 |',
                '|------|------|',
                '| 功能A | ✅ 完成 |',
                '| 功能B | ⏳ 进行中 |',
            ].join('\n'));
            await waitForRender(page);

            // 切换到暗色主题
            await page.evaluate(() => {
                document.body.classList.add('theme-dark');
            });
            // 等待主题样式应用
            await page.waitForTimeout(500);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('dark-theme-rendering.png');
        });

        test('VR-theme.2 亮色主题整体渲染', async ({ page }) => {
            await injectMarkdown(page, [
                '# 亮色主题测试',
                '',
                '这是一段普通文本，用于验证亮色主题下的文字颜色和背景对比度。',
                '',
                '## 代码块',
                '',
                '```python',
                'def hello(name: str) -> str:',
                '    return f"Hello, {name}!"',
                '```',
                '',
                '> [!NOTE]',
                '> 这是亮色主题下的提示块。',
            ].join('\n'));
            await waitForRender(page);

            const content = page.locator('#documentContent');
            await expect(content).toHaveScreenshot('light-theme-rendering.png');
        });
    });

    test.describe('工具栏截图', () => {

        test('VR-toolbar.1 工具栏默认状态', async ({ page }) => {
            await loadFixture(page, 'basic-rendering.md');
            await waitForRender(page);

            const toolbar = page.locator('header.toolbar');
            await expect(toolbar).toHaveScreenshot('toolbar-default.png');
        });
    });
});
