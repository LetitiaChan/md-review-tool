/**
 * edit-mode.js — 编辑器状态机
 *
 * 管理二态模式：inactive / rich
 * 与 app.js 的 currentMode ∈ {preview, rich} 配合。
 *
 * Change: remove-source-mode（从三态精简为二态，移除 Source Mode）
 *
 * 依赖：
 * - globalThis.PM.createRichEditor（由 pm.entry.js 提供，Rich Mode）
 * - globalThis.Store（Store.getData, Store.setRawMarkdown，由 store.js 提供）
 * - globalThis.handleSaveMd（由 app.js 暴露，Ctrl+S 保存路径）
 * - globalThis.triggerAutoSave（由 app.js 暴露，onChange 节流保存路径，可选）
 */

// ===== 模式枚举 =====
const MODE = { INACTIVE: 'inactive', RICH: 'rich' };

let _mode = MODE.INACTIVE;
let _editor = null;       // PM 实例句柄

const RICH_CONTAINER_ID = 'richModeContainer';
const RICH_BODY_CLASS = 'rich-mode-active';

// ===== Rich Mode 容器管理 =====

function ensureRichContainer() {
    let el = document.getElementById(RICH_CONTAINER_ID);
    if (!el) {
        el = document.createElement('div');
        el.id = RICH_CONTAINER_ID;
        const docContent = document.getElementById('documentContent');
        if (docContent && docContent.parentNode) {
            docContent.parentNode.insertBefore(el, docContent.nextSibling);
        } else {
            document.body.appendChild(el);
        }
    }
    return el;
}

// ===== Rich Mode =====

function enterRich() {
    if (_mode !== MODE.INACTIVE) return;
    if (!globalThis.PM || typeof globalThis.PM.createRichEditor !== 'function') {
        console.warn('[edit-mode] PM not loaded, cannot enter rich mode');
        return;
    }
    const store = globalThis.Store;
    if (!store || typeof store.getData !== 'function') {
        console.warn('[edit-mode] Store not loaded');
        return;
    }

    const markdown = (store.getData().rawMarkdown) || '';
    const annotations = store.getAnnotations ? store.getAnnotations() : [];
    const container = ensureRichContainer();

    _editor = globalThis.PM.createRichEditor({
        parent: container,
        markdown,
        annotations,
        onChange: (newMarkdown) => {
            if (typeof store.setRawMarkdown === 'function') {
                store.setRawMarkdown(newMarkdown);
            }
            if (typeof globalThis.triggerAutoSave === 'function') {
                globalThis.triggerAutoSave();
            }
        },
        onSave: () => {
            if (_editor && typeof store.setRawMarkdown === 'function') {
                store.setRawMarkdown(_editor.getMarkdown());
            }
            if (typeof globalThis.handleSaveMd === 'function') {
                globalThis.handleSaveMd();
            }
        },
    });

    document.body.classList.add(RICH_BODY_CLASS);
    _mode = MODE.RICH;

    try { _editor.focus(); } catch (e) { /* 容错 */ }
}

function exitRich() {
    if (_mode !== MODE.RICH) return;

    const store = globalThis.Store;
    let finalMarkdown = '';
    if (_editor) {
        try { finalMarkdown = _editor.getMarkdown(); } catch (e) { finalMarkdown = ''; }
        if (store && typeof store.setRawMarkdown === 'function') {
            store.setRawMarkdown(finalMarkdown);
        }
        try { _editor.destroy(); } catch (e) { /* 容错 */ }
        _editor = null;
    }

    // 清理 Rich Mode 容器
    const richContainer = document.getElementById(RICH_CONTAINER_ID);
    if (richContainer && richContainer.parentNode) {
        try { richContainer.parentNode.removeChild(richContainer); } catch (e) { /* 容错 */ }
    }

    document.body.classList.remove(RICH_BODY_CLASS);
    _mode = MODE.INACTIVE;

    try {
        window.dispatchEvent(new CustomEvent('rich-mode-exit', { detail: { finalMarkdown } }));
    } catch (e) { /* 容错 */ }
}

// ===== 查询函数 =====

function isRichActive() { return _mode === MODE.RICH; }
function isAnyEditorActive() { return _mode !== MODE.INACTIVE; }

export const EditMode = {
    enterRich, exitRich, isRichActive,
    isAnyEditorActive,
};
