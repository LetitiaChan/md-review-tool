/**
 * CodeMirror 6 entry — Source Mode 编辑器引擎
 *
 * 由 esbuild 打包为 webview/dist/cm6.bundle.js，以 IIFE 形式加载。
 * 导出到 globalThis.CM6 = { createEditor }，供 edit-mode.js 调用。
 *
 * Change: add-dual-mode-editor-phase-a-cm6-source
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';

/**
 * 创建一个 CodeMirror 6 编辑器实例。
 *
 * @param {Object} options
 * @param {HTMLElement} options.parent - 挂载点
 * @param {string} options.doc - 初始文档内容（markdown 源码）
 * @param {(doc: string) => void} [options.onChange] - 文档变更回调
 * @param {() => void} [options.onSave] - Ctrl+S 触发回调（应调用既有 handleSaveMd）
 * @returns {{ destroy: () => void, getDoc: () => string, setDoc: (s: string) => void, focus: () => void }}
 */
function createEditor({ parent, doc, onChange, onSave }) {
    // G1 黑名单让路：Ctrl+F/Ctrl+E/Alt+Z/F5 交给 app.js 全局 handler 处理
    // Ctrl+S 特殊处理：主动调 onSave 并吞掉事件（防止浏览器默认"另存为网页"对话框）
    const letThroughKeymap = [
        { key: 'Ctrl-s', run: () => { if (onSave) onSave(); return true; }, preventDefault: true },
        { key: 'Mod-s', run: () => { if (onSave) onSave(); return true; }, preventDefault: true },
        { key: 'Ctrl-f', run: () => false },
        { key: 'Mod-f', run: () => false },
        { key: 'Ctrl-e', run: () => false },
        { key: 'Mod-e', run: () => false },
        { key: 'Alt-z', run: () => false },
        { key: 'F5', run: () => false },
    ];

    const extensions = [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        bracketMatching(),
        indentOnInput(),
        highlightSelectionMatches(),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
            ...letThroughKeymap,
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
            if (u.docChanged && typeof onChange === 'function') {
                onChange(u.state.doc.toString());
            }
        }),
    ];

    const state = EditorState.create({ doc: doc || '', extensions });
    const view = new EditorView({ state, parent });

    return {
        destroy() { view.destroy(); },
        getDoc() { return view.state.doc.toString(); },
        setDoc(s) {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: s || '' },
            });
        },
        focus() { view.focus(); },
    };
}

// 挂载到 globalThis，供 edit-mode.js 通过 globalThis.CM6.createEditor 调用
globalThis.CM6 = { createEditor };
