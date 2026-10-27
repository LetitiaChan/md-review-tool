import { test, expect } from '@playwright/test';
import { pmContainerUrl, roundTrip } from '../helpers/pm-test-utils';

/**
 * Rich Mode 往返保真回归测试
 *
 * 背景：进入富文本模式再退出（即使不编辑）会把 PM 文档重新序列化并写回。
 * 任何解析/序列化不对称都会造成静默数据损坏。本套件锁定已知的三类问题：
 *   - 表格单元格内的行内格式与链接
 *   - 脚注引用与定义
 *   - ~下标~ 语法
 */

test.describe('Rich Mode 往返保真', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(pmContainerUrl());
        await page.waitForFunction(
            () => typeof (window as any).PM?.createRichEditor === 'function',
            { timeout: 15000 }
        );
    });

    test('BT-roundtrip.1 表格单元格应保留链接、加粗与行内代码', async ({ page }) => {
        const input = '| a | b |\n| --- | --- |\n| [x](https://e.com) **b** `c` | y |';
        const output = await roundTrip(page, input);

        expect(output).toContain('[x](https://e.com)');
        expect(output).toContain('**b**');
        expect(output).toContain('`c`');
        // 不应退化成纯文本
        expect(output).not.toMatch(/\|\s*x b c\s*\|/);
    });

    test('BT-roundtrip.2 表格单元格内的竖线应被转义', async ({ page }) => {
        const input = '| a \\| b | y |\n| --- | --- |\n| c | d |';
        const output = await roundTrip(page, input);

        // 单元格内容里的竖线必须转义，否则表格会多出一列
        expect(output).toContain('a \\| b');
        const firstRowCells = output.split('\n')[0].split(/(?<!\\)\|/).length - 2;
        expect(firstRowCells).toBe(2);
    });

    test('BT-roundtrip.3 脚注引用与定义应保持原语法', async ({ page }) => {
        const input = '正文引用[^1]\n\n[^1]: 脚注内容';
        const output = await roundTrip(page, input);

        expect(output).toContain('正文引用[^1]');
        expect(output).toContain('[^1]: 脚注内容');
        // 不应把脚注定义变成链接 URL
        expect(output).not.toContain('[^1](');
        expect(output).not.toMatch(/%E8%84%9A/);
    });

    test('BT-roundtrip.4 ~下标~ 不应被转义', async ({ page }) => {
        const input = '这是 ~下标~ 结尾';
        const output = await roundTrip(page, input);

        expect(output).toContain('~下标~');
        expect(output).not.toContain('\\~');
    });

    test('BT-roundtrip.5 既有语法保持不变（高亮/上标/粗斜体/引用/列表）', async ({ page }) => {
        const input = [
            '这是 ==高亮== 与 ^上标^ 和 **粗体** *斜体*。',
            '',
            '> 引用内容',
            '',
            '- 项目一',
            '- 项目二',
        ].join('\n');
        const output = await roundTrip(page, input);

        expect(output).toContain('==高亮==');
        expect(output).toContain('^上标^');
        expect(output).toContain('**粗体**');
        expect(output).toContain('*斜体*');
        expect(output).toContain('> 引用内容');
        expect(output).toContain('- 项目一');
    });

    test('BT-roundtrip.6 分块序列化器与基类输出逐字节一致', async ({ page }) => {
        const corpus = [
            '# 标题\n\n段落 **粗体** *斜体* `代码` [链接](https://e.com)',
            '- a\n- b\n- c\n\n1. x\n2. y',
            '> 引用\n> 第二行',
            '| a | b |\n| --- | --- |\n| [x](https://e.com) **b** | y |',
            '```js\nconst a = 1;\nif (a) { console.log(a); }\n```',
            '公式 $x^2$ 结尾',
            '脚注[^1]\n\n[^1]: 内容',
            '这是 ==高亮== 和 ~下标~ 与 ^上标^',
            '> [!NOTE]\n> 告警块',
            '- [x] 完成\n- [ ] 未完成',
        ];

        for (const md of corpus) {
            const result = await page.evaluate((input) => {
                const PM = (window as any).PM;
                return {
                    chunked: PM.serializeMarkdown(input, false),
                    base: PM.serializeMarkdown(input, true),
                };
            }, md);
            expect(result.chunked, `输入: ${md}`).toBe(result.base);
        }
    });

    test('BT-roundtrip.7 大文档序列化应保持线性', async ({ page }) => {
        const result = await page.evaluate(() => {
            const parts: string[] = [];
            for (let i = 0; i < 4000; i++) {
                parts.push('## 标题 ' + i + '\n\n这是第 ' + i + ' 段正文，包含 **加粗** 和 [链接](https://example.com) 以及 `代码`。');
            }
            const md = parts.join('\n\n');
            const PM = (window as any).PM;

            const chunkedOut = PM.serializeMarkdown(md, false);
            const baseOut = PM.serializeMarkdown(md, true);

            const t0 = performance.now();
            PM.serializeMarkdown(md, false);
            const chunkedMs = performance.now() - t0;

            return {
                bytes: md.length,
                chunkedMs: Math.round(chunkedMs),
                equal: chunkedOut === baseOut,
            };
        });

        expect(result.bytes).toBeGreaterThan(200000);
        expect(result.equal).toBe(true);
        // 修复前约 1~3 秒；分块实现目标 < 100ms（阈值留余量）
        expect(result.chunkedMs).toBeLessThan(150);
    });
});
