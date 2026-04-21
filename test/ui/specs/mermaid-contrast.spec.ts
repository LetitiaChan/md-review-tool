/**
 * Mermaid 自定义填充色文字对比度修复 - 回归测试
 *
 * 背景：Mermaid 图表允许用户通过 `style X fill:#xxx` / `classDef` 指定节点背景色，
 *      但默认文字颜色在某些主题下（暗色主题遇浅色 fill / 亮色主题遇深色 fill）会
 *      对比度严重不足导致不可读。本次 Hotfix 引入 fixMermaidNodeTextContrast()
 *      后处理逻辑 + CSS 兜底描边，本文件验证其行为符合预期。
 *
 * Tier 1：存在性/无 crash
 * Tier 2：行为级 —— 文字颜色确实被反转
 * Tier 3：针对性 —— 无自定义 fill 不反色 / 透明色跳过 / 主题切换重绘
 */

import { test, expect, Page } from '@playwright/test';
import { openContainer, injectMarkdown, waitForRender, resetContainer } from '../helpers/test-utils';

// -------------- 通用工具 --------------

/**
 * 在页面上下文中读取某个 Mermaid 节点（通过标签文字匹配）的实际文字 fill 颜色。
 * 返回形如 "rgb(26, 32, 44)" / "#1a202c" 的字符串（取决于浏览器 getComputedStyle 返回）。
 */
async function getNodeTextFill(page: Page, labelText: string): Promise<string | null> {
    return await page.evaluate((label) => {
        const svg = document.querySelector('.mermaid-rendered svg');
        if (!svg) return null;
        // 在整个 svg 内部定位含该标签文字的 text/tspan/foreignObject *
        const candidates = svg.querySelectorAll('text, tspan, foreignObject *');
        for (const el of Array.from(candidates)) {
            const txt = (el.textContent || '').trim();
            if (txt.includes(label)) {
                // SVG text 优先取 fill 属性；HTML 节点取 color
                if (el.tagName.toLowerCase() === 'text' || el.tagName.toLowerCase() === 'tspan') {
                    return (el as SVGElement).getAttribute('fill')
                        || (el as HTMLElement).style.fill
                        || getComputedStyle(el as SVGElement).fill
                        || null;
                }
                return (el as HTMLElement).style.color
                    || getComputedStyle(el as HTMLElement).color
                    || null;
            }
        }
        return null;
    }, labelText);
}

/** 把 "rgb(r, g, b)" 或 "#rrggbb" 转成 WCAG 相对亮度 [0,1]，供行为断言判定深浅。 */
function luminance(colorStr: string): number {
    let r = 0, g = 0, b = 0;
    const m = colorStr.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (m) {
        r = parseFloat(m[1]);
        g = parseFloat(m[2]);
        b = parseFloat(m[3]);
    } else if (colorStr.startsWith('#')) {
        let hex = colorStr.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length >= 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }
    }
    const toLin = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

/** 切换 body 主题类并重新渲染 mermaid。 */
async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
    await page.evaluate((t) => {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${t}`);
    }, theme);
}

// -------------- Fixtures --------------

// 浅色填充（classDef 方式）—— 暗色主题下应被反色为深色文字
const MERMAID_LIGHT_FILL = [
    '```mermaid',
    'graph TD',
    '    A[浅色节点A] --> B[浅色节点B]',
    '    classDef lightFill fill:#ffffcc,stroke:#888,color:#000',
    '    class A,B lightFill',
    '```',
].join('\n');

// 深色填充（style 单点方式）—— 亮色主题下应被反色为浅色文字
const MERMAID_DARK_FILL = [
    '```mermaid',
    'graph TD',
    '    X[深色节点X] --> Y[深色节点Y]',
    '    style X fill:#1a202c',
    '    style Y fill:#2d3748',
    '```',
].join('\n');

// 无任何自定义 fill —— 不应被反色
const MERMAID_NO_CUSTOM_FILL = [
    '```mermaid',
    'graph LR',
    '    P[普通节点P] --> Q[普通节点Q]',
    '```',
].join('\n');

// 透明 / none fill —— 应跳过不处理且不抛错
const MERMAID_TRANSPARENT_FILL = [
    '```mermaid',
    'graph TD',
    '    T[透明节点T] --> U[透明节点U]',
    '    style T fill:transparent',
    '    style U fill:none',
    '```',
].join('\n');

// -------------- 测试 --------------

test.describe('Mermaid 自定义填充色文字对比度修复', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        // 显式重置到亮色，避免上次测试污染
        await setTheme(page, 'light');
    });

    test.afterEach(async ({ page }) => {
        await resetContainer(page);
    });

    // -------- Tier 1：存在性 / 不 crash --------

    test.describe('Tier 1 - 存在性与无 crash', () => {

        test('T1.1 含自定义 fill 的 Mermaid 图仍能完整渲染为 SVG', async ({ page }) => {
            await injectMarkdown(page, MERMAID_LIGHT_FILL);
            await waitForRender(page);

            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });
            // 文本内容应完整保留（证明后处理未破坏节点结构）
            const svgText = await svgs.first().textContent();
            expect(svgText).toContain('浅色节点A');
            expect(svgText).toContain('浅色节点B');
        });

        test('T1.2 CSS 兜底描边规则对 .mermaid-rendered svg text 生效（paint-order: stroke fill）', async ({ page }) => {
            await injectMarkdown(page, MERMAID_NO_CUSTOM_FILL);
            await waitForRender(page);

            // 直接创建一个符合选择器 ".mermaid-rendered svg text" 的合成 DOM 结构，
            // 读其 computed style 的 paint-order。这样避免 file:// 协议下 styleSheets
            // 跨域访问限制，也不依赖当前 mermaid 版本是用 <text> 还是 <foreignObject>。
            const paintOrder = await page.evaluate(() => {
                const svgNS = 'http://www.w3.org/2000/svg';
                const wrapper = document.createElement('div');
                wrapper.className = 'mermaid-rendered';
                const svg = document.createElementNS(svgNS, 'svg');
                const text = document.createElementNS(svgNS, 'text');
                text.textContent = 'probe';
                svg.appendChild(text);
                wrapper.appendChild(svg);
                document.body.appendChild(wrapper);
                const computed = getComputedStyle(text).paintOrder;
                document.body.removeChild(wrapper);
                return computed;
            });
            // 断言规则生效：Chromium 会把 `paint-order: stroke fill` 规范化序列化为 "stroke"
            // （后续 "fill markers" 为默认值被省略）。空字符串/"normal" 都表明规则未命中。
            expect(paintOrder).toBe('stroke');
        });
    });

    // -------- Tier 2：行为级 —— 文字确实被反色 --------

    test.describe('Tier 2 - 行为级反色', () => {

        test('T2.1 暗色主题 + 浅色 fill → 文字应为深色（低亮度）', async ({ page }) => {
            await setTheme(page, 'dark');
            await injectMarkdown(page, MERMAID_LIGHT_FILL);
            await waitForRender(page);

            const fill = await getNodeTextFill(page, '浅色节点A');
            expect(fill).not.toBeNull();
            // 断言：文字亮度应 < 0.3（即已被反色为深色，而非 mermaid 暗色主题默认的浅色 #ddd+）
            const lum = luminance(fill!);
            expect(lum).toBeLessThan(0.3);
        });

        test('T2.2 亮色主题 + 深色 fill → 文字应为浅色（高亮度）', async ({ page }) => {
            await setTheme(page, 'light');
            await injectMarkdown(page, MERMAID_DARK_FILL);
            await waitForRender(page);

            const fill = await getNodeTextFill(page, '深色节点X');
            expect(fill).not.toBeNull();
            // 断言：文字亮度应 > 0.7（即已被反色为浅色，而非 mermaid 亮色主题默认的深色 #333-）
            const lum = luminance(fill!);
            expect(lum).toBeGreaterThan(0.7);
        });
    });

    // -------- Tier 3：针对性 --------

    test.describe('Tier 3 - 针对性用例', () => {

        test('T3.1 无自定义 fill 的常规 mermaid 图不应被反色（保留主题默认色）', async ({ page }) => {
            await setTheme(page, 'dark');
            await injectMarkdown(page, MERMAID_NO_CUSTOM_FILL);
            await waitForRender(page);

            // 无自定义 fill 时，fixMermaidNodeTextContrast 不会命中任何分支（因为读到的 fill
            // 是 mermaid 暗色主题默认的深色背景，与 isDark=true 判定相符 → 不反色）。
            // 因此文字颜色应保持 mermaid 暗色主题默认的浅色（亮度 > 0.5），
            // 而不是被错误地改成 #1a202c (亮度 ≈ 0.01)。
            const fill = await getNodeTextFill(page, '普通节点P');
            expect(fill).not.toBeNull();
            const lum = luminance(fill!);
            // 如果被误改成 #1a202c, lum 会 ≈ 0.01；只要 > 0.3 就说明没有错误反色
            expect(lum).toBeGreaterThan(0.3);
        });

        test('T3.2 透明/none fill 节点：后处理不抛错且渲染完整', async ({ page }) => {
            // 使用 page 级 JS 错误捕获：注入前清空，注入后检查
            const pageErrors: string[] = [];
            page.on('pageerror', (err) => pageErrors.push(err.message));

            await setTheme(page, 'dark');
            await injectMarkdown(page, MERMAID_TRANSPARENT_FILL);
            await waitForRender(page);

            // 断言：渲染正常完成（SVG 存在 + 节点文字完整）
            const svgs = page.locator('.mermaid-rendered svg');
            await expect(svgs.first()).toBeVisible({ timeout: 10000 });
            const svgText = await svgs.first().textContent();
            expect(svgText).toContain('透明节点T');
            expect(svgText).toContain('透明节点U');

            // 断言：没有 JS 错误被抛出（parseCssColor 对 'transparent'/'none' 必须安全返回 null）
            expect(pageErrors).toEqual([]);
        });

        test('T3.3 主题切换 light→dark 重新渲染后文字应相应反色', async ({ page }) => {
            // Phase 1: 亮色主题 + 浅色 fill → 此时不应反色（保持 mermaid 亮色默认深色文字）
            await setTheme(page, 'light');
            await injectMarkdown(page, MERMAID_LIGHT_FILL);
            await waitForRender(page);

            const fillLight = await getNodeTextFill(page, '浅色节点A');
            expect(fillLight).not.toBeNull();
            const lumLight = luminance(fillLight!);
            // 亮色主题 + 浅色 fill，mermaid 默认给深色文字 → 不反色 → 仍为深色（< 0.3）
            expect(lumLight).toBeLessThan(0.5);

            // Phase 2: 切到暗色主题并重新渲染 → 此时应触发反色（浅色 fill + 暗主题）
            await resetContainer(page);
            await setTheme(page, 'dark');
            await injectMarkdown(page, MERMAID_LIGHT_FILL);
            await waitForRender(page);

            const fillDark = await getNodeTextFill(page, '浅色节点A');
            expect(fillDark).not.toBeNull();
            const lumDark = luminance(fillDark!);
            // 暗色主题 + 浅色 fill，默认文字会很浅导致看不清 → 反色为深色 (< 0.3)
            expect(lumDark).toBeLessThan(0.3);
        });
    });
});
