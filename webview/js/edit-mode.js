/**
 * edit-mode.js — 双模式编辑器状态机
 *
 * 管理三态模式：inactive / source / rich
 * 与 app.js 的 currentMode ∈ {preview, rich, source} 配合。
 *
 * Change: add-dual-mode-editor-phase-b-pm-rich（从 Phase A 二态扩展为三态）
 *
 * 依赖：
 * - globalThis.CM6.createEditor（由 cm6.entry.js 提供，Source Mode）
 * - globalThis.PM.createRichEditor（由 pm.entry.js 提供，Rich Mode）
 * - globalThis.Store（Store.getData, Store.setRawMarkdown，由 store.js 提供）
 * - globalThis.handleSaveMd（由 app.js 暴露，Ctrl+S 保存路径）
 * - globalThis.triggerAutoSave（由 app.js 暴露，onChange 节流保存路径，可选）
 */

// ===== 模式枚举 =====
const MODE = { INACTIVE: 'inactive', SOURCE: 'source', RICH: 'rich' };

let _mode = MODE.INACTIVE;
let _editor = null;       // CM6 或 PM 实例句柄
let _container = null;    // Source Mode 容器

const SOURCE_CONTAINER_ID = 'sourceModeContainer';
const RICH_CONTAINER_ID = 'richModeContainer';
const SOURCE_BODY_CLASS = 'source-mode-active';
const RICH_BODY_CLASS = 'rich-mode-active';

// ===== Source Mode 容器管理 =====

function ensureSourceContainer() {
    if (_container && _container.isConnected) return _container;
    let el = document.getElementById(SOURCE_CONTAINER_ID);
    if (!el) {
        el = document.createElement('div');
        el.id = SOURCE_CONTAINER_ID;
        const docContent = document.getElementById('documentContent');
        if (docContent && docContent.parentNode) {
            docContent.parentNode.insertBefore(el, docContent.nextSibling);
        } else {
            document.body.appendChild(el);
        }
    }
    _container = el;
    return el;
}

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

// ===== Source Mode =====

function enterSource() {
    if (_mode !== MODE.INACTIVE) return;
    if (!globalThis.CM6 || typeof globalThis.CM6.createEditor !== 'function') {
        console.warn('[edit-mode] CM6 not loaded, cannot enter source mode');
        return;
    }
    const store = globalThis.Store;
    if (!store || typeof store.getData !== 'function') {
        console.warn('[edit-mode] Store not loaded');
        return;
    }

    const doc = (store.getData().rawMarkdown) || '';
    const container = ensureSourceContainer();

    _editor = globalThis.CM6.createEditor({
        parent: container,
        doc,
        onChange: (newDoc) => {
            if (typeof store.setRawMarkdown === 'function') {
                store.setRawMarkdown(newDoc);
            }
            if (typeof globalThis.triggerAutoSave === 'function') {
                globalThis.triggerAutoSave();
            }
        },
        onSave: () => {
            if (_editor && typeof store.setRawMarkdown === 'function') {
                store.setRawMarkdown(_editor.getDoc());
            }
            if (typeof globalThis.handleSaveMd === 'function') {
                globalThis.handleSaveMd();
            }
        },
    });

    document.body.classList.add(SOURCE_BODY_CLASS);
    _mode = MODE.SOURCE;

    try { _editor.focus(); } catch (e) { /* jsdom 等环境可能抛 */ }
}

function exitSource() {
    if (_mode !== MODE.SOURCE) return;

    const store = globalThis.Store;
    let finalDoc = '';
    if (_editor) {
        try { finalDoc = _editor.getDoc(); } catch (e) { finalDoc = ''; }
        if (store && typeof store.setRawMarkdown === 'function') {
            store.setRawMarkdown(finalDoc);
        }
        try { _editor.destroy(); } catch (e) { /* 容错 */ }
        _editor = null;
    }

    if (_container && _container.parentNode) {
        try { _container.parentNode.removeChild(_container); } catch (e) { /* 容错 */ }
    }
    _container = null;

    document.body.classList.remove(SOURCE_BODY_CLASS);
    _mode = MODE.INACTIVE;

    try {
        window.dispatchEvent(new CustomEvent('source-mode-exit', { detail: { finalDoc } }));
    } catch (e) { /* 容错 */ }
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

function isSourceActive() { return _mode === MODE.SOURCE; }
function isRichActive() { return _mode === MODE.RICH; }
function isAnyEditorActive() { return _mode !== MODE.INACTIVE; }

export const EditMode = {
    enterSource, exitSource, isSourceActive,
    enterRich, exitRich, isRichActive,
    isAnyEditorActive,
};
