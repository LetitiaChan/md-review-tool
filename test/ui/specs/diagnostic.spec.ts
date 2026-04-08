import { test, expect } from '@playwright/test';
import { openContainer, injectMarkdown, loadFixture, waitForRender, getContainerUrl } from '../helpers/test-utils';

test.skip('诊断：Mermaid 渲染检查（调试用，非正式测试）', async ({ page }) => {
    await openContainer(page);
    await injectMarkdown(page, '```mermaid\ngraph TD\n    A[开始] --> B[结束]\n```');
    await page.waitForTimeout(5000);

    const html = await page.evaluate(() => {
        return document.getElementById('documentContent')!.innerHTML;
    });
    console.log('Mermaid HTML:', html.substring(0, 2000));

    const mermaidCount = await page.locator('.mermaid').count();
    console.log('Mermaid divs:', mermaidCount);

    const svgCount = await page.locator('.mermaid svg').count();
    console.log('Mermaid SVGs:', svgCount);

    const mermaidRenderedCount = await page.locator('.mermaid-rendered').count();
    console.log('Mermaid rendered:', mermaidRenderedCount);
});

test.skip('诊断：Checkbox 渲染检查（调试用，非正式测试）', async ({ page }) => {
    await openContainer(page);
    await loadFixture(page, 'checkbox.md');
    await waitForRender(page);

    const html = await page.evaluate(() => {
        return document.getElementById('documentContent')!.innerHTML;
    });
    console.log('Checkbox HTML:', html.substring(0, 3000));

    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    console.log('Checkbox inputs:', checkboxCount);

    const customCheckboxCount = await page.locator('.task-checkbox, .checkbox, [data-checkbox]').count();
    console.log('Custom checkboxes:', customCheckboxCount);
});
