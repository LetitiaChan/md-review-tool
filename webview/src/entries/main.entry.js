/**
 * webview/src/entries/main.entry.js
 *
 * Webview 主应用的 bundler 入口。
 * 职责：
 *   1. 显式 import 所有 7 个业务模块（从 webview/js/*.js）
 *   2. 把 I18n/t/Store/Renderer/Annotations/Exporter/Settings 挂载到 globalThis
 *      以兼容 app.js IIFE 内部的隐式全局引用（历史遗留，不修改 IIFE 体）
 *   3. 调用 initApp() 启动应用
 *      （注：initApp 内部已有 DOMContentLoaded 检测，此处无需再做）
 *
 * 产物：webview/dist/app.bundle.js（format: iife）
 * 触发：npm run build:webview
 *
 * Design: openspec/changes/archive/.../design.md D2（策略 A1）
 */

// 按历史加载顺序 import（i18n 先行，因为其他模块可能在顶层使用 t()）
import { I18n, t } from '../../js/i18n.js';
import { Store } from '../../js/store.js';
import { Renderer } from '../../js/renderer.js';
import { Annotations } from '../../js/annotations.js';
import { Exporter } from '../../js/export.js';
import { Settings } from '../../js/settings.js';
import { EditMode } from '../../js/edit-mode.js';
import { initApp } from '../../js/app.js';

// ===== 向后兼容：把模块挂到全局 =====
// 原因：app.js 的 IIFE 函数体中有大量隐式全局引用（Store.xxx / Renderer.xxx /
// Settings.xxx / t(...) 等），ESM 化后这些符号不再自动可见。
// 通过 globalThis 赋值保持 IIFE 内部代码字节不变即可运行。
// （index.html 内联 <script nonce> 经侦查不依赖这些符号，但本挂载不会造成冲突。）
globalThis.I18n = I18n;
globalThis.t = t;
globalThis.Store = Store;
globalThis.Renderer = Renderer;
globalThis.Annotations = Annotations;
globalThis.Exporter = Exporter;
globalThis.Settings = Settings;
globalThis.EditMode = EditMode;

// ===== 启动应用 =====
// initApp() 内部已有 DOM ready 检测（见 app.js 最后若干行），这里直接调用即可。
initApp();
