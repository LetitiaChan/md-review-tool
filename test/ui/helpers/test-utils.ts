import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试容器 HTML 文件的绝对路径
 */
const TEST_CONTAINER_PATH = path.resolve(__dirname, '..', 'test-container.html');

/**
 * Fixture 文件目录
 */
const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');

/**
 * 获取测试容器的 file:// URL
 */
export function getContainerUrl(): string {
    return `file:///${TEST_CONTAINER_PATH.replace(/\\/g, '/')}`;
}

/**
 * 打开测试容器页面并等待初始化完成
 */
export async function openContainer(page: Page): Promise<void> {
    await page.goto(getContainerUrl());
    // 等待关键全局对象可用（通过 window 属性访问，因为测试容器已挂载）
    await page.waitForFunction(() => {
        return typeof (window as any).Renderer !== 'undefined'
            && typeof (window as any).marked !== 'undefined';
    }, { timeout: 15000 });

    // 初始化 Renderer 的 marked 配置（自定义渲染器、扩展等）
    await page.evaluate(() => {
        const Renderer = (window as any).Renderer;
        // configureHighlight 会配置 marked.js 的自定义渲染器和扩展
        if (typeof Renderer.configureHighlight === 'function') {
            Renderer.configureHighlight();
        }
    });
}

/**
 * 读取 fixture 文件内容
 */
export function readFixture(filename: string): string {
    const filePath = path.join(FIXTURES_DIR, filename);
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 加载 fixture 文件并注入到测试容器中渲染
 */
export async function loadFixture(page: Page, filename: string): Promise<void> {
    const markdown = readFixture(filename);
    await injectMarkdown(page, markdown);
}

/**
 * 编程式注入 Markdown 内容并触发渲染
 * 使用生产代码的 Renderer.parseMarkdown + Renderer.renderBlocks 完整渲染管线
 */
export async function injectMarkdown(page: Page, markdown: string): Promise<void> {
    await page.evaluate((md) => {
        const Renderer = (window as any).Renderer;
        if (!Renderer) throw new Error('Renderer not available');

        // 使用生产代码的完整渲染管线：
        // 1. parseMarkdown 将 Markdown 分割为块（字符串数组）
        const blocks = Renderer.parseMarkdown(md);

        // 2. renderBlocks 将块渲染为 HTML 并插入到 #documentContent
        //    第二个参数是 annotations 数组，测试中传空数组
        Renderer.renderBlocks(blocks, []);

        // 3. 触发 Mermaid 渲染（生产代码中由 app.js 的 renderMathAndMermaid 调用）
        if (typeof Renderer.renderMermaid === 'function') {
            try { Renderer.renderMermaid(); } catch (e) {
                console.warn('[test-utils] mermaid render error:', e);
            }
        }

        // 4. 触发 KaTeX 数学公式渲染
        if (typeof Renderer.renderMath === 'function') {
            try { Renderer.renderMath(); } catch (e) {
                console.warn('[test-utils] math render error:', e);
            }
        }

        // 5. 触发 Graphviz 渲染
        if (typeof Renderer.renderGraphviz === 'function') {
            try { Renderer.renderGraphviz(); } catch (e) {
                console.warn('[test-utils] graphviz render error:', e);
            }
        }

        // 6. 触发 PlantUML 渲染
        if (typeof Renderer.renderPlantUML === 'function') {
            try { Renderer.renderPlantUML(); } catch (e) {
                console.warn('[test-utils] plantuml render error:', e);
            }
        }
    }, markdown);
}

/**
 * 等待异步渲染完成（Mermaid、KaTeX、Graphviz）
 * @param timeout 最大等待时间（毫秒）
 */
export async function waitForRender(page: Page, timeout: number = 5000): Promise<void> {
    // 等待 Mermaid SVG 渲染完成（mermaid.run 是异步的）
    await page.waitForFunction(() => {
        const mermaidDivs = document.querySelectorAll('.mermaid');
        if (mermaidDivs.length === 0) return true;
        // 检查是否所有 mermaid div 都已渲染（包含 SVG 或错误信息）
        return Array.from(mermaidDivs).every(div =>
            div.querySelector('svg') !== null
            || div.getAttribute('data-processed') === 'true'
            || div.querySelector('.error') !== null
            || div.textContent!.includes('error')
        );
    }, { timeout });

    // 短暂等待确保所有异步操作完成（Graphviz 也是异步的）
    await page.waitForTimeout(1000);
}

/**
 * 触发 app.js 的后渲染绑定（lightbox、代码复制等）
 * 在 injectMarkdown + waitForRender 之后调用
 */
export async function triggerAppBindings(page: Page): Promise<void> {
    await page.evaluate(() => {
        const bindings = (window as any).__testBindings;
        if (bindings && typeof bindings.afterRender === 'function') {
            bindings.afterRender();
        }
    });
}

/**
 * 注入 Markdown 并完成完整渲染流程（包括异步渲染和事件绑定）
 * 这是 injectMarkdown + waitForRender + triggerAppBindings 的便捷组合
 */
export async function loadAndRender(page: Page, markdown: string): Promise<void> {
    await injectMarkdown(page, markdown);
    await waitForRender(page);
    await triggerAppBindings(page);
}

/**
 * 加载 fixture 文件并完成完整渲染流程
 */
export async function loadFixtureAndRender(page: Page, filename: string): Promise<void> {
    const markdown = readFixture(filename);
    await loadAndRender(page, markdown);
}

/**
 * 模拟 Store 中有数据（用于编辑模式等需要 Store.getData() 的场景）
 */
export async function setStoreData(page: Page, data: {
    fileName?: string;
    rawMarkdown?: string;
    sourceFilePath?: string;
    annotations?: any[];
}): Promise<void> {
    await page.evaluate((d) => {
        const Store = (window as any).Store;
        if (!Store) return;
        const current = Store.getData() || {};
        if (d.fileName) current.fileName = d.fileName;
        if (d.rawMarkdown) current.rawMarkdown = d.rawMarkdown;
        if (d.sourceFilePath) current.sourceFilePath = d.sourceFilePath;
        if (d.annotations) current.annotations = d.annotations;
        Store.setData(current);
    }, data);
}

/**
 * 重置测试容器状态
 */
export async function resetContainer(page: Page): Promise<void> {
    await page.evaluate(() => {
        const container = document.getElementById('documentContent');
        if (container) {
            container.innerHTML = '';
            container.contentEditable = 'false';
            container.classList.remove('wysiwyg-editing');
        }
        const tocList = document.getElementById('tocList');
        if (tocList) tocList.innerHTML = '';
        const annotationsList = document.getElementById('annotationsList');
        if (annotationsList) annotationsList.innerHTML = '';

        // 重置搜索栏状态
        const searchBar = document.getElementById('searchBar');
        if (searchBar) searchBar.style.display = 'none';
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        if (searchInput) searchInput.value = '';

        // 重置禅模式
        document.body.classList.remove('zen-mode');

        // 重置主题
        document.body.classList.remove('theme-dark');

        // 重置 lightbox 绑定标记
        document.querySelectorAll('[data-lightbox-bound]').forEach(el => {
            delete (el as HTMLElement).dataset.lightboxBound;
        });

        // 重置 Mock 状态
        if ((window as any).__mockVscode) {
            (window as any).__mockVscode.reset();
        }
    });
}
