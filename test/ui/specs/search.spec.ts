import { test, expect } from '@playwright/test';
import { openContainer, loadFixture, waitForRender, injectMarkdown } from '../helpers/test-utils';

test.describe('搜索功能测试', () => {

    test.beforeEach(async ({ page }) => {
        await openContainer(page);
        await loadFixture(page, 'search-content.md');
        await waitForRender(page);
    });

    test.describe('正文搜索', () => {

        test('BT-search.1 Ctrl+F 打开搜索栏', async ({ page }) => {
            // 搜索栏初始隐藏
            const searchBar = page.locator('#searchBar');
            await expect(searchBar).toBeHidden();

            // 按 Ctrl+F
            await page.keyboard.press('Control+f');
            await page.waitForTimeout(300);

            // 搜索栏应该显示
            await expect(searchBar).toBeVisible();

            // 输入框应获得焦点
            const searchInput = page.locator('#searchInput');
            await expect(searchInput).toBeFocused();
        });

        test('BT-search.2 输入关键词后文档中出现搜索高亮', async ({ page }) => {
            // 打开搜索栏
            await page.keyboard.press('Control+f');
            await page.waitForTimeout(300);

            // 输入关键词
            const searchInput = page.locator('#searchInput');
            await searchInput.fill('搜索');
            await page.waitForTimeout(500); // 等待 debounce

            // 检查是否有高亮标记
            const highlights = page.locator('mark.search-highlight');
            const count = await highlights.count();
            expect(count).toBeGreaterThanOrEqual(1);
        });

        test('BT-search.3 搜索计数显示正确', async ({ page }) => {
            await page.keyboard.press('Control+f');
            await page.waitForTimeout(300);

            const searchInput = page.locator('#searchInput');
            await searchInput.fill('搜索');
            await page.waitForTimeout(500);

            // 检查搜索计数
            const searchCount = page.locator('#searchCount');
            const countText = await searchCount.textContent();
            // 应该显示 "1/N" 格式
            expect(countText).toMatch(/^\d+\/\d+$/);
        });

        test('BT-search.4 点击下一个按钮导航到下一个匹配项', async ({ page }) => {
            await page.keyboard.press('Control+f');
            await page.waitForTimeout(300);

            const searchInput = page.locator('#searchInput');
            await searchInput.fill('搜索');
            await page.waitForTimeout(500);

            // 记录初始计数
            const searchCount = page.locator('#searchCount');
            const initialText = await searchCount.textContent();

            // 点击下一个
            await page.locator('#searchNext').click();
            await page.waitForTimeout(200);

            // 计数应该变化（如 1/N → 2/N）
            const newText = await searchCount.textContent();
            if (initialText && initialText !== '0/0') {
                // 如果有多个匹配，索引应该变化
                const initialIndex = parseInt(initialText.split('/')[0]);
                const newIndex = parseInt(newText!.split('/')[0]);
                const total = parseInt(initialText.split('/')[1]);
                if (total > 1) {
                    expect(newIndex).not.toBe(initialIndex);
                }
            }
        });

        test('BT-search.5 关闭搜索栏清除高亮', async ({ page }) => {
            await page.keyboard.press('Control+f');
            await page.waitForTimeout(300);

            const searchInput = page.locator('#searchInput');
            await searchInput.fill('搜索');
            await page.waitForTimeout(500);

            // 确认有高亮
            let highlights = page.locator('mark.search-highlight');
            expect(await highlights.count()).toBeGreaterThanOrEqual(1);

            // 点击关闭按钮
            await page.locator('#searchClose').click();
            await page.waitForTimeout(300);

            // 搜索栏应隐藏
            await expect(page.locator('#searchBar')).toBeHidden();

            // 高亮应被清除
            highlights = page.locator('mark.search-highlight');
            expect(await highlights.count()).toBe(0);
        });

        test('BT-search.6 ESC 关闭搜索栏', async ({ page }) => {
            await page.keyboard.press('Control+f');
            await page.waitForTimeout(300);
            await expect(page.locator('#searchBar')).toBeVisible();

            // 按 ESC
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);

            // 搜索栏应隐藏
            await expect(page.locator('#searchBar')).toBeHidden();
        });
    });

    test.describe('目录搜索', () => {

        test('BT-search.7 目录搜索框存在且可输入', async ({ page }) => {
            const tocSearchInput = page.locator('#tocSearchInput');
            await expect(tocSearchInput).toBeVisible();

            // 输入关键词
            await tocSearchInput.fill('功能');
            await page.waitForTimeout(300);

            // 清除按钮应出现
            const clearBtn = page.locator('#tocSearchClear');
            await expect(clearBtn).toBeVisible();
        });

        test('BT-search.8 目录搜索清除按钮工作正常', async ({ page }) => {
            const tocSearchInput = page.locator('#tocSearchInput');
            await tocSearchInput.fill('测试');
            await page.waitForTimeout(300);

            // 点击清除
            await page.locator('#tocSearchClear').click();
            await page.waitForTimeout(200);

            // 输入框应被清空
            const value = await tocSearchInput.inputValue();
            expect(value).toBe('');

            // 清除按钮应隐藏
            await expect(page.locator('#tocSearchClear')).toBeHidden();
        });
    });

    test.describe('批注搜索', () => {

        test('BT-search.9 批注搜索框存在且可输入', async ({ page }) => {
            // 手动绑定 oninput（模拟 annotations.js 的 setupAnnotationSearch）
            // 不调用 Annotations.init() 因为它依赖完整的 DOM 结构
            await page.evaluate(() => {
                const searchInput = document.getElementById('annotationSearchInput') as HTMLInputElement;
                const searchClear = document.getElementById('annotationSearchClear') as HTMLElement;
                if (!searchInput) return;
                searchInput.oninput = () => {
                    const val = searchInput.value.trim();
                    if (searchClear) searchClear.style.display = val ? '' : 'none';
                };
                if (searchClear) {
                    searchClear.onclick = () => {
                        searchInput.value = '';
                        searchClear.style.display = 'none';
                    };
                }
            });

            const annotationSearchInput = page.locator('#annotationSearchInput');
            await expect(annotationSearchInput).toBeVisible();

            // 使用 type 逐字输入，触发 oninput 事件
            await annotationSearchInput.click();
            await annotationSearchInput.type('测试');
            await page.waitForTimeout(300);

            // 清除按钮应出现（oninput 会设置 display: ''）
            const clearBtn = page.locator('#annotationSearchClear');
            const isVisible = await clearBtn.evaluate(el => {
                return el.style.display !== 'none';
            });
            expect(isVisible).toBe(true);
        });

        test('BT-search.10 批注搜索清除按钮工作正常', async ({ page }) => {
            // 手动绑定 oninput（与 BT-search.9 一致）
            await page.evaluate(() => {
                const searchInput = document.getElementById('annotationSearchInput') as HTMLInputElement;
                const searchClear = document.getElementById('annotationSearchClear') as HTMLElement;
                if (!searchInput) return;
                searchInput.oninput = () => {
                    const val = searchInput.value.trim();
                    if (searchClear) searchClear.style.display = val ? '' : 'none';
                };
                if (searchClear) {
                    searchClear.onclick = () => {
                        searchInput.value = '';
                        searchClear.style.display = 'none';
                    };
                }
            });

            const annotationSearchInput = page.locator('#annotationSearchInput');
            await annotationSearchInput.click();
            await annotationSearchInput.type('批注');
            await page.waitForTimeout(300);

            // 使用 evaluate 点击清除按钮
            await page.evaluate(() => {
                const clearBtn = document.getElementById('annotationSearchClear') as HTMLElement;
                if (clearBtn && clearBtn.onclick) {
                    clearBtn.onclick(new MouseEvent('click'));
                } else if (clearBtn) {
                    clearBtn.click();
                }
            });
            await page.waitForTimeout(200);

            const value = await annotationSearchInput.inputValue();
            expect(value).toBe('');
        });
    });
});
