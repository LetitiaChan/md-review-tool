import { Page } from '@playwright/test';
import * as path from 'path';

/**
 * ProseMirror 测试容器辅助函数
 *
 * pm-container.html 只加载 webview/dist/pm.bundle.js，暴露 window.PM.createRichEditor。
 */

const PM_CONTAINER_PATH = path.resolve(__dirname, '..', 'pm-container.html');

export function pmContainerUrl(): string {
    return `file:///${PM_CONTAINER_PATH.replace(/\\/g, '/')}`;
}

/**
 * 打开 PM 容器并创建编辑器；返回的 editor 句柄保存在 window.__editor
 */
export async function createRichEditor(
    page: Page,
    markdown: string,
    annotations: any[] = []
): Promise<void> {
    await page.goto(pmContainerUrl());
    await page.waitForFunction(
        () => typeof (window as any).PM?.createRichEditor === 'function',
        { timeout: 15000 }
    );
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

/**
 * 在当前编辑器里做一次「解析 → 序列化」往返，返回结果
 */
export async function roundTrip(page: Page, markdown: string): Promise<string> {
    return page.evaluate((md) => {
        const parent = document.getElementById('pmParent')!;
        parent.innerHTML = '';
        const editor = (window as any).PM.createRichEditor({ parent, markdown: md });
        const out = editor.getMarkdown();
        editor.destroy();
        return out;
    }, markdown);
}
