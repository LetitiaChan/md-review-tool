import * as fs from 'fs';
import * as path from 'path';

/**
 * 模块源码读取辅助
 *
 * 部分测试通过读取源码字符串做断言。模块拆分后，实现可能分散在目录下多个文件里，
 * 这里提供「读取入口文件 + 目录下所有模块并拼接」的能力，保持断言内容不变。
 */

function collectFiles(dir: string, out: string[]): void {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
            collectFiles(full, out);
        } else if (name.endsWith('.js')) {
            out.push(full);
        }
    }
}

function readCombined(extPath: string, entrySegments: string[], dirSegments: string[]): string {
    const files: string[] = [];
    const entryPath = path.join(extPath, ...entrySegments);
    if (fs.existsSync(entryPath)) files.push(entryPath);
    collectFiles(path.join(extPath, ...dirSegments), files);
    return files.map((f) => fs.readFileSync(f, 'utf-8')).join('\n');
}

/** webview/src/entries/pm.entry.js + webview/src/pm/** */
export function readPmSource(extPath: string): string {
    return readCombined(extPath, ['webview', 'src', 'entries', 'pm.entry.js'], ['webview', 'src', 'pm']);
}

/** webview/js/app.js + webview/js/app/** */
export function readAppSource(extPath: string): string {
    return readCombined(extPath, ['webview', 'js', 'app.js'], ['webview', 'js', 'app']);
}

/** webview/js/renderer.js + webview/js/renderer/** */
export function readRendererSource(extPath: string): string {
    return readCombined(extPath, ['webview', 'js', 'renderer.js'], ['webview', 'js', 'renderer']);
}
