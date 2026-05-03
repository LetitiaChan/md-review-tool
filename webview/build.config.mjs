/**
 * webview/build.config.mjs
 *
 * esbuild 构建配置，用于把 webview 子项目的 JavaScript 模块打包为 IIFE 产物。
 *
 * 产出（webview/dist/）：
 *   - app.bundle.js  : 主应用 bundle（i18n + store + renderer + annotations + export + settings + app）
 *   - pm.bundle.js   : ProseMirror Rich Mode 编辑器引擎
 *
 * 用法：
 *   node webview/build.config.mjs            一次性构建
 *   node webview/build.config.mjs --watch    watch 模式
 *
 * 通过 package.json 的 npm scripts 触发：
 *   npm run build:webview        一次性构建
 *   npm run build:webview:watch  watch 模式
 *   npm run compile              tsc 编译 + build:webview（链式）
 *
 * 设计约束来源：openspec/changes/add-webview-bundler-and-esm-modules/design.md D4
 */

import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * esbuild 构建选项（单一真源）
 */
const buildOptions = {
  entryPoints: {
    'app.bundle': path.join(__dirname, 'src/entries/main.entry.js'),
    'pm.bundle':  path.join(__dirname, 'src/entries/pm.entry.js'),
  },
  bundle: true,
  format: 'iife',        // webview <script> 无 type=module，IIFE 是唯一选择
  target: ['es2020'],    // VS Code 内置 Electron 22+ 支持 ES2020
  platform: 'browser',
  outdir: path.join(__dirname, 'dist'),
  entryNames: '[name]',  // 产物文件名使用 entry 的 key
  sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
  minify: process.env.NODE_ENV === 'production',
  logLevel: 'info',
  // 禁用 eval / 动态 Function 触发的 CSP unsafe-eval；esbuild 默认不会生成，此处显式声明约束
  supported: {
    'arbitrary-module-namespace-names': true,
  },
  // 对绝对路径的 importPath 使用相对于 projectRoot 的路径（便于产物调试）
  absWorkingDir: projectRoot,
};

/**
 * 主入口：区分一次性构建 vs watch 模式
 */
async function main() {
  const isWatch = process.argv.includes('--watch');
  try {
    if (isWatch) {
      const ctx = await context(buildOptions);
      await ctx.watch();
      console.log('[webview-build] watching for changes...');
      // watch 模式常驻，进程不退出
    } else {
      const result = await build(buildOptions);
      if (result.errors && result.errors.length > 0) {
        console.error('[webview-build] build failed with errors:', result.errors);
        process.exit(1);
      }
      console.log('[webview-build] done.');
    }
  } catch (err) {
    console.error('[webview-build] fatal error:', err);
    process.exit(1);
  }
}

// 仅当本文件作为主入口时才执行 main()（支持被其他脚本 import 复用 buildOptions）
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
  process.argv[1] === __filename;

if (isMain) {
  main();
}

export { buildOptions, main };
