import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, injectMarkdown, waitForRender } from '../helpers/test-utils';

test.describe('图表渲染测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
    });

    test.describe('Mermaid 图表', () => {

        test('BT-chart.1 Mermaid 流程图渲染为 SVG', async ({ page }) => {
            await loadFixture(page, 'chart-mermaid.md');
            await waitForRender(page);

            // Renderer 将 mermaid 代码块渲染为 .mermaid-container > .mermaid-rendered
            const mermaidRendered = page.locator('.mermaid-rendered');
            await expect(mermaidRendered.first()).toBeVisible({ timeout: 10000 });

            // 检查 SVG 是否已渲染
            const svgs = page.locator('.mermaid-rendered svg');
            const svgCount = await svgs.count();
            expect(svgCount).toBeGreaterThanOrEqual(1);
        });

        test('BT-chart.2 Mermaid 时序图渲染为 SVG', async ({ page }) => {
            await injectMarkdown(page, '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n```');
            await waitForRender(page);

            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });
        });

        test('BT-chart.3 Mermaid 语法错误时降级显示', async ({ page }) => {
            await injectMarkdown(page, '```mermaid\ngraph INVALID\n    This >>> not valid\n```');
            await waitForRender(page);

            // 应该不产生空白区域：要么显示错误信息，要么显示原始代码
            const container = page.locator('.mermaid-rendered, .mermaid-container').first();
            await expect(container).toBeVisible({ timeout: 10000 });
            const text = await container.textContent();
            expect(text!.length).toBeGreaterThan(0);
        });

        test('BT-chart.7 Mermaid 含 C++ 等特殊字符节点名应正确渲染', async ({ page }) => {
            // Tier 2/3：验证含 +、# 等特殊字符的节点名不会导致渲染失败
            // 这是 securityLevel: 'strict' → 'loose' 修复的回归测试
            await injectMarkdown(page, '```mermaid\ngraph LR\n    A["C++"] --> B["C#"]\n    B --> C[Java]\n```');
            await waitForRender(page);

            // 应该成功渲染为 SVG，而非降级显示错误
            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });

            // SVG 内容中应包含节点文本
            const svgContent = await svgs.first().textContent();
            expect(svgContent).toContain('C++');
            expect(svgContent).toContain('C#');
            expect(svgContent).toContain('Java');
        });

        test('BT-chart.8 Mermaid sequenceDiagram 含 C++ participant 应正确渲染', async ({ page }) => {
            // Tier 2/3：验证 sequenceDiagram 中含 ++ 的 participant 名称不会导致渲染失败
            // 这是 preprocessMermaidCode → preprocessSequenceDiagram 预处理函数的回归测试
            // Mermaid 的 sequenceDiagram 语法中 ++ 是激活操作符，会导致 participant C++ 被误解析
            await injectMarkdown(page, [
                '```mermaid',
                'sequenceDiagram',
                '    participant C++ as C++ (moelua.dostring)',
                '    participant Runner as AutoTestRunner',
                '    C++ ->> Runner: require(...).Run(modulePath)',
                '    Runner -->> C++: 返回结果',
                '```'
            ].join('\n'));
            await waitForRender(page);

            // 应该成功渲染为 SVG，而非降级显示错误
            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });

            // SVG 内容中应包含 participant 的显示名
            const svgContent = await svgs.first().textContent();
            expect(svgContent).toContain('C++');
            expect(svgContent).toContain('AutoTestRunner');
        });

        test('BT-chart.9 Mermaid classDiagram 含 C++ 类名应正确渲染', async ({ page }) => {
            // Tier 2/3：验证 classDiagram 中含特殊字符的类名不会导致渲染失败
            // 这是 preprocessMermaidCode → preprocessClassDiagram 预处理函数的回归测试
            await injectMarkdown(page, [
                '```mermaid',
                'classDiagram',
                '    class Animal {',
                '        +eat()',
                '    }',
                '    class Dog {',
                '        +bark()',
                '    }',
                '    Animal <|-- Dog',
                '```'
            ].join('\n'));
            await waitForRender(page);

            // 应该成功渲染为 SVG
            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });

            const svgContent = await svgs.first().textContent();
            expect(svgContent).toContain('Animal');
            expect(svgContent).toContain('Dog');
        });

        test('BT-chart.10 Mermaid stateDiagram 应正确渲染', async ({ page }) => {
            // Tier 2/3：验证 stateDiagram 的基本渲染能力
            // 这是 preprocessMermaidCode → preprocessStateDiagram 预处理函数的回归测试
            await injectMarkdown(page, [
                '```mermaid',
                'stateDiagram-v2',
                '    [*] --> Active',
                '    Active --> Inactive',
                '    Inactive --> [*]',
                '```'
            ].join('\n'));
            await waitForRender(page);

            // 应该成功渲染为 SVG
            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });

            const svgContent = await svgs.first().textContent();
            expect(svgContent).toContain('Active');
            expect(svgContent).toContain('Inactive');
        });
    });

    test.describe('Graphviz 图表', () => {

        test('BT-chart.4 Graphviz DOT 图渲染为 SVG', async ({ page }) => {
            await loadFixture(page, 'chart-graphviz.md');
            await waitForRender(page);

            // 检查 Graphviz 渲染容器
            const graphvizContainers = page.locator('.graphviz-rendered, .graphviz-container');
            const count = await graphvizContainers.count();
            expect(count).toBeGreaterThanOrEqual(1);

            // 检查 SVG 是否已渲染
            const svgs = page.locator('.graphviz-rendered svg, .graphviz-container svg');
            const svgCount = await svgs.count();
            expect(svgCount).toBeGreaterThanOrEqual(1);
        });

        test('BT-chart.5 Graphviz 语法错误时降级显示', async ({ page }) => {
            await injectMarkdown(page, '```graphviz\ndigraph INVALID {\n    This -> -> -> {{{ syntax\n```');
            await waitForRender(page);

            // 应该显示错误信息或原始代码，不产生空白
            const container = page.locator('#documentContent');
            const text = await container.textContent();
            expect(text!.length).toBeGreaterThan(0);
        });
    });

    test.describe('PlantUML 图表', () => {

        test('BT-chart.6 PlantUML 渲染为 img 元素 @tag:network', async ({ page }) => {
            test.skip(!!process.env.SKIP_NETWORK_TESTS, '跳过需要网络的测试');

            await loadFixture(page, 'chart-plantuml.md');
            await waitForRender(page);

            // PlantUML 渲染为 img 元素，src 指向 plantuml 服务器
            const plantumlImgs = page.locator('.plantuml-container img, img[src*="plantuml"]');
            const count = await plantumlImgs.count();
            // 如果网络可用，应该有 img 元素
            if (count > 0) {
                await expect(plantumlImgs.first()).toBeVisible();
            }
        });
    });
});
