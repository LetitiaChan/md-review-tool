/**
 * edit-mode.js — Source Mode 状态机
 *
 * 管理 sourceModeActive 布尔态与当前 CodeMirror 6 编辑器实例句柄。
 * 与 app.js 的 currentMode ∈ {preview, edit} 二态解耦，作为"第三并存态"覆盖视图层。
 *
 * Change: add-dual-mode-editor-phase-a-cm6-source
 *
 * 依赖：
 * - globalThis.CM6.createEditor（由 cm6.entry.js 提供）
 * - globalThis.Store（Store.getData, Store.setRawMarkdown，由 store.js 提供）
 * - globalThis.handleSaveMd（由 app.js 暴露，Ctrl+S 保存路径）
 * - globalThis.triggerAutoSave（由 app.js 暴露，onChange 节流保存路径，可选）
 */

let _active = false;
let _editor = null;
let _container = null;

const CONTAINER_ID = 'sourceModeContainer';
const BODY_ACTIVE_CLASS = 'source-mode-active';

/**
 * 获取或创建 Source Mode 的独立容器（避免污染 #documentContent 的 preview 渲染 DOM）
 */
function ensureContainer() {
    if (_container && _container.isConnected) return _container;
    let el = document.getElementById(CONTAINER_ID);
    if (!el) {
        el = document.createElement('div');
        el.id = CONTAINER_ID;
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

/**
 * 进入 Source Mode：读 Store → 挂载 CM6 → 加 body class
 */
function enterSource() {
    if (_active) return;
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
    const container = ensureContainer();

    _editor = globalThis.CM6.createEditor({
        parent: container,
        doc,
        onChange: (newDoc) => {
            // 回写真相源（B1 决策：markdown 单一真相源）
            if (typeof store.setRawMarkdown === 'function') {
                store.setRawMarkdown(newDoc);
            }
            // 触发既有 autosave timer（如已暴露）
            if (typeof globalThis.triggerAutoSave === 'function') {
                globalThis.triggerAutoSave();
            }
        },
        onSave: () => {
            // Ctrl+S：先同步最新 doc 到 Store，再走既有 handleSaveMd 路径
            if (_editor && typeof store.setRawMarkdown === 'function') {
                store.setRawMarkdown(_editor.getDoc());
            }
            if (typeof globalThis.handleSaveMd === 'function') {
                globalThis.handleSaveMd();
            }
        },
    });

    document.body.classList.add(BODY_ACTIVE_CLASS);
    _active = true;

    // focus 让用户立即可输入
    try { _editor.focus(); } catch (e) { /* jsdom 等环境可能抛 */ }
}

/**
 * 退出 Source Mode：写回 Store → 销毁 CM6 → 移除 body class → 通知 app.js 重渲染
 */
function exitSource() {
    if (!_active) return;

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

    // 清理容器 DOM
    if (_container && _container.parentNode) {
        try { _container.parentNode.removeChild(_container); } catch (e) { /* 容错 */ }
    }
    _container = null;

    document.body.classList.remove(BODY_ACTIVE_CLASS);
    _active = false;

    // 通知 app.js：Source 退出，需根据 currentMode 重渲染 preview/edit
    try {
        window.dispatchEvent(new CustomEvent('source-mode-exit', { detail: { finalDoc } }));
    } catch (e) { /* 容错 */ }
}

/**
 * 查询是否处于 Source Mode
 */
function isSourceActive() {
    return _active;
}

export const EditMode = { enterSource, exitSource, isSourceActive };
