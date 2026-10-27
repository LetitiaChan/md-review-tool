/**
 * ProseMirror entry — Rich Mode 编辑器引擎
 *
 * 由 esbuild 打包为 webview/dist/pm.bundle.js，以 IIFE 形式加载。
 * 导出到 globalThis.PM = { createRichEditor }，供 edit-mode.js 调用。
 *
 * Change: add-dual-mode-editor-phase-b-pm-rich
 */

import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin, Selection, TextSelection } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, setBlockType, wrapIn, chainCommands, exitCode, joinUp, joinDown, lift, selectParentNode } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis } from 'prosemirror-inputrules';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { gapCursor } from 'prosemirror-gapcursor';
import { columnResizing, tableEditing, goToNextCell, addRowBefore, addRowAfter, addColumnBefore, addColumnAfter, deleteRow, deleteColumn, deleteTable } from 'prosemirror-tables';
import { Decoration, DecorationSet } from 'prosemirror-view';

import { schema } from '../../js/pm-schema.js';
import { parseMarkdown, serializeMarkdown as serializeMarkdownFn, baseSerializer } from '../../js/pm-markdown-bridge.js';
import { createSlashCommandPlugin } from '../slash-command/slash-command-plugin.js';

// ===== 输入规则 =====
function buildInputRules() {
    const rules = [
        // # → heading
        textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, match => ({ level: match[1].length })),
        // > → blockquote
        wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
        // ``` → code_block
        textblockTypeInputRule(/^```(\w*)\s$/, schema.nodes.code_block, match => ({ language: match[1] || '' })),
        // --- → horizontal_rule
        {
            match: /^(---|___|\*\*\*)\s*$/,
            handler(state, match, start, end) {
                const tr = state.tr.replaceRangeWith(start, end, schema.nodes.horizontal_rule.create());
                return tr;
            },
        },
        // - [ ] → task list item (unchecked)
        {
            match: /^\s*[-+*]\s\[\s?\]\s$/,
            handler(state, match, start, end) {
                const listItem = schema.nodes.list_item.create({ checked: false }, schema.nodes.paragraph.create());
                const bulletList = schema.nodes.bullet_list.create(null, listItem);
                const tr = state.tr.replaceRangeWith(start, end, bulletList);
                // 将光标放到 list_item 内的 paragraph 中
                const resolvedPos = tr.doc.resolve(start + 3); // bullet_list > list_item > paragraph
                tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos));
                return tr;
            },
        },
        // - [x] / - [X] → task list item (checked)
        {
            match: /^\s*[-+*]\s\[[xX]\]\s$/,
            handler(state, match, start, end) {
                const listItem = schema.nodes.list_item.create({ checked: true }, schema.nodes.paragraph.create());
                const bulletList = schema.nodes.bullet_list.create(null, listItem);
                const tr = state.tr.replaceRangeWith(start, end, bulletList);
                const resolvedPos = tr.doc.resolve(start + 3);
                tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos));
                return tr;
            },
        },
        // - → bullet_list
        wrappingInputRule(/^\s*[-+*]\s$/, schema.nodes.bullet_list),
        // 1. → ordered_list
        wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, match => ({ start: +match[1] })),
    ];
    return inputRules({ rules });
}

// ===== 批注 Decoration Plugin =====
function buildAnnotationPlugin() {
    function buildDecorations(state, annotations) {
        if (!annotations || annotations.length === 0) return DecorationSet.empty;

        const decorations = [];
        const doc = state.doc;
        // 一次构建块索引（O(块数)），之后每条批注 O(1) 定位，
        // 避免每条批注都从 doc 头部遍历（原 O(批注数 × 块数)）。
        const index = buildBlockPositionIndex(doc);

        for (const ann of annotations) {
            const pos = blockIndexToPos(doc, ann.blockIndex, ann.startOffset || 0, index);
            const endPos = blockIndexToPos(doc, ann.endBlockIndex || ann.blockIndex, ann.endOffset || (ann.startOffset || 0) + (ann.selectedText || '').length, index);

            if (pos !== null && endPos !== null && pos < endPos && endPos <= doc.content.size) {
                const className = `annotation-highlight annotation-${ann.type || 'comment'}`;
                decorations.push(Decoration.inline(pos, endPos, {
                    class: className,
                    'data-annotation-id': String(ann.id),
                }));
            }
        }

        return DecorationSet.create(state.doc, decorations);
    }

    let currentAnnotations = [];

    const plugin = new Plugin({
        key: new (require('prosemirror-state').PluginKey)('annotations'),
        state: {
            init(_, state) { return buildDecorations(state, currentAnnotations); },
            apply(tr, old, _, newState) {
                if (tr.getMeta('annotations-changed')) {
                    currentAnnotations = tr.getMeta('annotations-changed');
                    return buildDecorations(newState, currentAnnotations);
                }
                if (tr.docChanged) {
                    return old.map(tr.mapping, tr.doc);
                }
                return old;
            },
        },
        props: {
            decorations(state) { return this.getState(state); },
        },
    });

    return { plugin, setAnnotations: (anns) => { currentAnnotations = anns; } };
}

/**
 * 收集一个块内所有叶子文本块（段落/标题/代码块等）及其内容起始位置。
 * 用于把预览侧的「块内文本偏移」映射到 PM doc 坐标。
 */
function collectTextblocks(node, pos, out) {
    if (node.isTextblock) {
        out.push({ node, start: pos + 1 });
        return;
    }
    // 叶子节点（图片/分隔线等）没有文本，直接跳过；
    // 其余容器（列表、引用块、表格等）都继续下钻，不能只看 isBlock，
    // 因为 table_cell 这类节点没有 block 分组
    if (node.isLeaf) return;
    let childPos = pos + 1;
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        collectTextblocks(child, childPos, out);
        childPos += child.nodeSize;
    }
}

/**
 * 构建顶层块位置索引：{ starts: [{node, start}], textblocks: Map<blockIndex, []> }
 * 一次 O(块数) 遍历，供所有批注复用。
 */
function buildBlockPositionIndex(doc) {
    const starts = [];
    let pos = 0;
    for (let i = 0; i < doc.childCount; i++) {
        const child = doc.child(i);
        // 预览侧会把「纯脚注定义块」从块列表中移除，PM 里的 footnote_def
        // 不占 blockIndex，索引时必须跳过。
        if (child.type.name !== 'footnote_def') {
            starts.push({ node: child, start: pos });
        }
        pos += child.nodeSize;
    }
    return { starts, textblocks: new Map() };
}

/**
 * 将 blockIndex + offset 映射为 PM doc 中的绝对位置。
 *
 * 注意：blockIndex 来自预览侧按空行切分的「顶层块」序号，
 * 因此这里只能统计 doc 的顶层子节点，不能把 list_item / table_cell
 * 等嵌套块也计入（否则列表之后的批注会整体错位）。
 *
 * @param {object} [index] 可选的 buildBlockPositionIndex 结果（批量构建 decoration 时复用）
 */
function blockIndexToPos(doc, blockIndex, offset, index) {
    if (blockIndex == null || blockIndex < 0) return null;

    const idx = index || buildBlockPositionIndex(doc);
    const entry = idx.starts[blockIndex];
    if (!entry) return null;

    let textblocks = idx.textblocks.get(blockIndex);
    if (!textblocks) {
        textblocks = [];
        collectTextblocks(entry.node, entry.start, textblocks);
        idx.textblocks.set(blockIndex, textblocks);
    }
    if (textblocks.length === 0) return entry.start + 1;

    // 在块内的文本块之间摊平累加偏移，与预览侧拼接文本节点的顺序一致
    let remaining = Math.max(0, offset || 0);
    for (const tb of textblocks) {
        const size = tb.node.content.size;
        if (remaining <= size) return tb.start + remaining;
        remaining -= size;
    }
    const last = textblocks[textblocks.length - 1];
    return last.start + last.node.content.size;
}

// ===== 快捷键配置 =====
function buildKeymap(onSave) {
    const keys = {};

    // G1 黑名单让路
    keys['Ctrl-s'] = keys['Mod-s'] = () => { if (onSave) onSave(); return true; };
    keys['Ctrl-f'] = keys['Mod-f'] = () => false;
    keys['Ctrl-e'] = keys['Mod-e'] = () => false;
    keys['Alt-z'] = () => false;
    keys['F5'] = () => false;

    // 基础编辑命令
    keys['Mod-z'] = undo;
    keys['Mod-y'] = redo;
    keys['Shift-Mod-z'] = redo;

    // 格式化
    keys['Mod-b'] = toggleMark(schema.marks.strong);
    keys['Mod-i'] = toggleMark(schema.marks.em);
    keys['Mod-`'] = toggleMark(schema.marks.code);

    // 列表
    keys['Enter'] = splitListItem(schema.nodes.list_item);
    keys['Mod-['] = liftListItem(schema.nodes.list_item);
    keys['Mod-]'] = sinkListItem(schema.nodes.list_item);
    keys['Tab'] = goToNextCell(1);
    keys['Shift-Tab'] = goToNextCell(-1);

    return keymap(keys);
}

// ===== 图表 NodeView =====
class DiagramNodeView {
    constructor(node, view, getPos) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.editing = false;

        this.dom = document.createElement('div');
        this.dom.className = `diagram-nodeview diagram-${node.attrs.language}`;
        this.dom.contentEditable = 'false';

        this.renderPreview();

        // 双击进入编辑
        this.dom.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.editing) this.enterEdit();
        });
    }

    renderPreview() {
        const { language, source } = this.node.attrs;
        if (this._renderTimer) { clearTimeout(this._renderTimer); this._renderTimer = null; }
        this.dom.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'diagram-edit-header';
        header.innerHTML = `<span class="diagram-edit-lang">${language}</span><span class="diagram-edit-hint">双击编辑</span>`;
        this.dom.appendChild(header);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'diagram-preview';
        this.dom.appendChild(previewContainer);

        // 构造与预览一致的容器结构，并只渲染本 NodeView 的子树
        // （旧实现创建 <pre class="mermaid"> 且调用全局 renderMermaid，
        //   既渲染不到自身，又会重排隐藏的预览 DOM）
        const lang = (language || '').toLowerCase();
        let containerClass = '';
        let sourceClass = '';
        let dataClass = '';
        let render = null;

        if (lang === 'mermaid' && globalThis.Renderer?.renderMermaid) {
            containerClass = 'mermaid-container';
            sourceClass = 'mermaid-source';
            dataClass = 'mermaid-source-data';
            render = () => globalThis.Renderer.renderMermaid(previewContainer);
        } else if (lang === 'plantuml' && globalThis.Renderer?.renderPlantUML) {
            containerClass = 'plantuml-container';
            sourceClass = 'plantuml-source';
            dataClass = 'plantuml-source-data';
            render = () => globalThis.Renderer.renderPlantUML(previewContainer);
        } else if ((lang === 'dot' || lang === 'graphviz') && globalThis.Renderer?.renderGraphviz) {
            containerClass = 'graphviz-container';
            sourceClass = 'graphviz-source';
            dataClass = 'graphviz-source-data';
            render = () => globalThis.Renderer.renderGraphviz(previewContainer);
        }

        if (!render) {
            const pre = document.createElement('pre');
            pre.textContent = source;
            previewContainer.appendChild(pre);
            return;
        }

        const container = document.createElement('div');
        container.className = containerClass;

        const sourceData = document.createElement('div');
        sourceData.className = dataClass;
        sourceData.style.display = 'none';
        try {
            sourceData.dataset.source = btoa(unescape(encodeURIComponent(source)));
        } catch (e) {
            sourceData.dataset.source = '';
        }

        const pre = document.createElement('pre');
        pre.className = sourceClass;
        pre.textContent = source;

        container.appendChild(sourceData);
        container.appendChild(pre);
        previewContainer.appendChild(container);

        // 等 DOM 挂载后再渲染（构造阶段 NodeView 尚未进入文档）
        const tryRender = (attempt) => {
            if (!this.dom.isConnected) {
                if (attempt < 10) {
                    this._renderTimer = setTimeout(() => tryRender(attempt + 1), 50);
                }
                return;
            }
            try { render(); } catch (e) { /* 容错 */ }
        };
        this._renderTimer = setTimeout(() => tryRender(0), 50);
    }

    enterEdit() {
        this.editing = true;
        this.dom.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'diagram-edit-header';
        header.innerHTML = `<span class="diagram-edit-lang">${this.node.attrs.language}</span><span class="diagram-edit-hint">Ctrl+Enter 或点击外部完成编辑</span>`;
        this.dom.appendChild(header);

        const textarea = document.createElement('textarea');
        textarea.className = 'diagram-edit-textarea';
        textarea.value = this.node.attrs.source;
        textarea.spellcheck = false;
        this.dom.appendChild(textarea);

        // 自动高度
        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 80) + 'px';
        };
        textarea.addEventListener('input', autoResize);
        setTimeout(autoResize, 0);

        // Ctrl+Enter 完成编辑
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.finishEdit(textarea.value);
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }
        });

        // blur 完成编辑
        textarea.addEventListener('blur', () => {
            // 延迟以避免与 Ctrl+Enter 冲突
            setTimeout(() => {
                if (this.editing) this.finishEdit(textarea.value);
            }, 100);
        });

        textarea.focus();
    }

    finishEdit(newSource) {
        if (!this.editing) return;
        this.editing = false;

        const pos = this.getPos();
        if (pos === undefined) return;

        // 更新节点属性
        const tr = this.view.state.tr.setNodeMarkup(pos, null, {
            ...this.node.attrs,
            source: newSource,
        });
        this.view.dispatch(tr);
    }

    update(node) {
        if (node.type !== this.node.type) return false;
        const languageChanged = node.attrs.language !== this.node.attrs.language;
        const sourceChanged = node.attrs.source !== this.node.attrs.source;
        this.node = node;
        // 属性没变时不重建 DOM（每次事务都会调用 update）
        if (!this.editing && (languageChanged || sourceChanged)) {
            this.renderPreview();
        }
        return true;
    }

    stopEvent(event) {
        // 编辑模式下拦截所有事件
        return this.editing;
    }

    ignoreMutation() {
        return true;
    }

    destroy() {
        if (this._renderTimer) {
            clearTimeout(this._renderTimer);
            this._renderTimer = null;
        }
    }
}

// ===== Frontmatter NodeView =====
class FrontmatterNodeView {
    constructor(node, view, getPos) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.editing = false;

        this.dom = document.createElement('div');
        this.dom.className = 'frontmatter-nodeview';
        this.dom.contentEditable = 'false';

        this.renderPreview();

        // 双击进入编辑
        this.dom.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.editing) this.enterEdit();
        });
    }

    renderPreview() {
        const content = this.node.attrs.content || '';
        this.dom.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'frontmatter-edit-header';
        header.innerHTML = `<span class="frontmatter-edit-icon">⚙️</span><span class="frontmatter-edit-title">YAML Front Matter</span><span class="frontmatter-edit-hint">双击编辑</span>`;
        this.dom.appendChild(header);

        const pre = document.createElement('pre');
        pre.className = 'frontmatter-content';
        pre.textContent = content;
        this.dom.appendChild(pre);
    }

    enterEdit() {
        this.editing = true;
        this.dom.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'frontmatter-edit-header';
        header.innerHTML = `<span class="frontmatter-edit-icon">⚙️</span><span class="frontmatter-edit-title">YAML Front Matter</span><span class="frontmatter-edit-hint">Ctrl+Enter 或点击外部完成编辑</span>`;
        this.dom.appendChild(header);

        const textarea = document.createElement('textarea');
        textarea.className = 'frontmatter-edit-textarea';
        textarea.value = this.node.attrs.content || '';
        textarea.spellcheck = false;
        this.dom.appendChild(textarea);

        // 自动高度
        const autoResize = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 80) + 'px';
        };
        textarea.addEventListener('input', autoResize);
        setTimeout(autoResize, 0);

        // Ctrl+Enter 完成编辑
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.finishEdit(textarea.value);
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            }
        });

        // blur 完成编辑
        textarea.addEventListener('blur', () => {
            setTimeout(() => {
                if (this.editing) this.finishEdit(textarea.value);
            }, 100);
        });

        textarea.focus();
    }

    finishEdit(newContent) {
        if (!this.editing) return;
        this.editing = false;

        const pos = this.getPos();
        if (pos === undefined) return;

        // 更新节点属性
        const tr = this.view.state.tr.setNodeMarkup(pos, null, {
            ...this.node.attrs,
            content: newContent,
        });
        this.view.dispatch(tr);
    }

    update(node) {
        if (node.type !== this.node.type) return false;
        this.node = node;
        if (!this.editing) {
            this.renderPreview();
        }
        return true;
    }

    stopEvent(event) {
        return this.editing;
    }

    ignoreMutation() {
        return true;
    }

    destroy() {
        // 清理
    }
}

// ===== 智能粘贴 =====
function handlePaste(view, event, slice) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;

    // 图片粘贴检测：优先处理图片文件
    const files = clipboardData.files;
    if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                // 5MB 大小限制
                if (file.size > 5 * 1024 * 1024) {
                    if (globalThis.__vscodeApi) {
                        globalThis.__vscodeApi.postMessage({ type: 'showWarning', payload: { message: 'Image too large (max 5MB)' } });
                    }
                    return true;
                }
                // 读取为 base64 DataURL
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const ext = file.type.split('/')[1] || 'png';
                    const now = new Date();
                    const timestamp = now.getFullYear().toString() +
                        String(now.getMonth() + 1).padStart(2, '0') +
                        String(now.getDate()).padStart(2, '0') + '-' +
                        String(now.getHours()).padStart(2, '0') +
                        String(now.getMinutes()).padStart(2, '0') +
                        String(now.getSeconds()).padStart(2, '0');
                    const random = Math.random().toString(36).slice(2, 6);
                    const filename = `image-${timestamp}-${random}.${ext}`;
                    if (globalThis.__vscodeApi) {
                        globalThis.__vscodeApi.postMessage({
                            type: 'saveImage',
                            payload: { dataUrl, filename, requestId: `img-${Date.now()}` },
                        });
                    }
                };
                reader.readAsDataURL(file);
                return true; // 阻止默认粘贴行为
            }
        }
    }

    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html && html.trim()) {
        // HTML → markdown → PM doc
        try {
            // 使用 turndown 将 HTML 转为 markdown（复用现有安全配置）
            let markdown = text; // 降级：使用纯文本
            if (typeof TurndownService !== 'undefined') {
                const ts = new TurndownService({
                    headingStyle: 'atx', hr: '---', bulletListMarker: '-',
                    codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**',
                });
                ts.escape = s => s;
                ts.keep(['kbd']);
                markdown = ts.turndown(html);
            }

            const doc = parseMarkdown(markdown);
            if (doc && doc.content.size > 0) {
                const tr = view.state.tr.replaceSelection(doc.slice(0, doc.content.size));
                view.dispatch(tr);
                return true;
            }
        } catch (e) {
            console.warn('[pm] paste HTML→markdown failed, falling back to plain text', e);
        }
    }

    // 纯文本粘贴：走默认处理
    return false;
}

// ===== createRichEditor 工厂函数 =====

/**
 * 创建一个 ProseMirror Rich Mode 编辑器实例。
 *
 * @param {Object} options
 * @param {HTMLElement} options.parent - 挂载点
 * @param {string} options.markdown - 初始 markdown 文档内容
 * @param {(markdown: string) => void} [options.onChange] - 文档变更回调（参数为最新 markdown）
 * @param {() => void} [options.onSave] - Ctrl+S 触发回调
 * @param {Array} [options.annotations] - 初始批注数据
 * @param {(state: {activeMarks: string[], blockType: string, blockAttrs: object}) => void} [options.onSelectionChange] - 选区/文档变化回调（用于更新工具栏按钮状态）
 * @returns {{ destroy: () => void, getMarkdown: () => string, setMarkdown: (s: string) => void, focus: () => void, updateAnnotations: (annotations: Array) => void, execCommand: (name: string, attrs?: object) => boolean }}
 */
function createRichEditor({ parent, markdown, onChange, onSave, annotations, onSelectionChange, initialCursorLine, initialCursorPosition }) {
    const doc = parseMarkdown(markdown || '');

    const { plugin: annotationPlugin, setAnnotations } = buildAnnotationPlugin();
    if (annotations) setAnnotations(annotations);

    // Slash Command Plugin 使用延迟引用（commandMap 在 plugins 之后定义）
    const commandMapRef = {};
    const slashCommandPlugin = createSlashCommandPlugin({
        commandMap: commandMapRef,
        getI18n: (key) => (globalThis.I18n && globalThis.I18n.t) ? globalThis.I18n.t(key) : key,
    });

    const plugins = [
        buildKeymap(onSave),
        // 斜杠命令面板必须排在 baseKeymap 之前：面板打开时 Enter/方向键要先被它拦截，
        // 否则 baseKeymap 的 splitBlock 会先消费 Enter，命令永远执行不到
        slashCommandPlugin,
        keymap(baseKeymap),
        buildInputRules(),
        history(),
        gapCursor(),
        columnResizing(),
        tableEditing(),
        annotationPlugin,
        // onChange 监听
        // 注意：这里不再逐键序列化整篇文档。保存/退出/导出路径会显式调用
        // getMarkdown() 取最新内容；预览同步由 edit-mode 做 250ms 防抖。
        new Plugin({
            view() {
                return {
                    update(view, prevState) {
                        if (!view.state.doc.eq(prevState.doc) && typeof onChange === 'function') {
                            onChange();
                        }
                    },
                };
            },
        }),
        // 智能粘贴
        new Plugin({
            props: {
                handlePaste,
            },
        }),
        // 选区/文档变化监听（用于工具栏按钮状态更新）
        ...(typeof onSelectionChange === 'function' ? [new Plugin({
            view() {
                return {
                    update(view, prevState) {
                        if (view.state.selection.eq(prevState.selection) && view.state.doc.eq(prevState.doc)) return;
                        const state = view.state;
                        const { $from } = state.selection;
                        // 收集活跃 marks
                        const activeMarks = [];
                        const storedMarks = state.storedMarks || $from.marks();
                        for (const mark of storedMarks) {
                            activeMarks.push(mark.type.name);
                        }
                        // 收集当前 block type
                        const parentNode = $from.parent;
                        const blockType = parentNode.type.name;
                        const blockAttrs = parentNode.attrs || {};
                        onSelectionChange({ activeMarks, blockType, blockAttrs });
                    },
                };
            },
        })] : []),
    ];

    const state = EditorState.create({ doc, plugins });
    const view = new EditorView(parent, {
        state,
        nodeViews: {
            diagram(node, view, getPos) { return new DiagramNodeView(node, view, getPos); },
            frontmatter(node, view, getPos) { return new FrontmatterNodeView(node, view, getPos); },
            list_item(node, view, getPos) {
                // 只有 task list item（checked !== null）才使用自定义 NodeView
                if (node.attrs.checked === null) return undefined;

                const CHECK_SVG = '<svg class="task-check-icon" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>';

                const dom = document.createElement('li');
                dom.classList.add('task-list-item');
                if (node.attrs.checked) dom.classList.add('checked');

                // 使用 span 自定义 checkbox（与预览模式一致，避免原生 input 在 webview 中样式泄露）
                const checkbox = document.createElement('span');
                checkbox.classList.add('task-checkbox');
                if (node.attrs.checked) {
                    checkbox.classList.add('checked');
                    checkbox.innerHTML = CHECK_SVG;
                }
                checkbox.contentEditable = 'false';
                checkbox.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // 阻止 ProseMirror 失焦
                    const pos = getPos();
                    if (pos == null) return;
                    const currentChecked = view.state.doc.nodeAt(pos)?.attrs.checked;
                    const tr = view.state.tr.setNodeMarkup(pos, null, {
                        ...view.state.doc.nodeAt(pos).attrs,
                        checked: !currentChecked,
                    });
                    view.dispatch(tr);
                });

                // 内容容器
                const contentDOM = document.createElement('div');
                contentDOM.classList.add('task-list-content');

                dom.appendChild(checkbox);
                dom.appendChild(contentDOM);

                return {
                    dom,
                    contentDOM,
                    update(updatedNode) {
                        if (updatedNode.type.name !== 'list_item') return false;
                        if (updatedNode.attrs.checked === null) return false;
                        const isChecked = updatedNode.attrs.checked;
                        checkbox.classList.toggle('checked', isChecked);
                        checkbox.innerHTML = isChecked ? CHECK_SVG : '';
                        dom.classList.toggle('checked', isChecked);
                        return true;
                    },
                };
            },
        },
        handleDOMEvents: {
            // 编辑模式下阻止超链接点击跳转，并派发浮动菜单事件
            click(view, event) {
                const target = event.target;
                const anchor = target && (target.tagName === 'A' ? target : (target.closest && target.closest('a')));
                if (anchor) {
                    event.preventDefault();
                    event.stopPropagation();
                    // 派发 pm-link-click 事件，携带链接 DOM 坐标和属性
                    try {
                        const rect = anchor.getBoundingClientRect();
                        window.dispatchEvent(new CustomEvent('pm-link-click', {
                            detail: {
                                href: anchor.getAttribute('data-href') || anchor.getAttribute('href') || '',
                                title: anchor.getAttribute('title') || '',
                                text: anchor.textContent || '',
                                rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
                            }
                        }));
                    } catch (e) { /* 容错 */ }
                } else {
                    // 点击非链接区域，关闭浮动菜单
                    window.dispatchEvent(new CustomEvent('pm-link-click', { detail: null }));
                }
                return false; // 不阻止 ProseMirror 继续处理（光标定位等）
            },
        },
        handleDoubleClick(view, pos, event) {
            // 检测双击位置是否在 link mark 上
            const $pos = view.state.doc.resolve(pos);
            const linkType = schema.marks.link;
            const marks = $pos.marks();
            let linkMark = null;
            for (const m of marks) {
                if (m.type === linkType) { linkMark = m; break; }
            }
            if (!linkMark) {
                // 尝试前一位置
                const before = $pos.nodeBefore;
                if (before && before.marks) {
                    for (const m of before.marks) {
                        if (m.type === linkType) { linkMark = m; break; }
                    }
                }
            }
            if (linkMark) {
                // 派发自定义事件通知 app.js 打开链接编辑 popover
                try {
                    window.dispatchEvent(new CustomEvent('pm-link-dblclick', { detail: {} }));
                } catch (e) { /* 容错 */ }
                return true; // 阻止默认双击选词行为
            }
            return false;
        },
    });

    // ===== 恢复光标位置 =====
    // 优先使用结构化的 { blockIndex, offset }；initialCursorLine 仅作旧接口兼容
    const restorePos = initialCursorPosition
        || (initialCursorLine && initialCursorLine > 0 ? { blockIndex: initialCursorLine - 1, offset: 0 } : null);
    if (restorePos) {
        try {
            const targetPos = blockIndexToPos(view.state.doc, restorePos.blockIndex, restorePos.offset || 0);
            if (targetPos !== null && targetPos > 0 && targetPos <= view.state.doc.content.size) {
                const sel = TextSelection.create(view.state.doc, targetPos);
                const tr = view.state.tr.setSelection(sel).scrollIntoView();
                view.dispatch(tr);
            }
        } catch (e) { /* 容错：恢复失败不影响编辑 */ }
    }

    // ===== 图片拖拽监听 =====
    view.dom.addEventListener('drop', (event) => {
        const dt = event.dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) return;
        for (let i = 0; i < dt.files.length; i++) {
            const file = dt.files[i];
            if (file.type.startsWith('image/')) {
                event.preventDefault();
                event.stopPropagation();
                if (file.size > 5 * 1024 * 1024) {
                    if (globalThis.__vscodeApi) {
                        globalThis.__vscodeApi.postMessage({ type: 'showWarning', payload: { message: 'Image too large (max 5MB)' } });
                    }
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const ext = file.type.split('/')[1] || 'png';
                    const now = new Date();
                    const timestamp = now.getFullYear().toString() +
                        String(now.getMonth() + 1).padStart(2, '0') +
                        String(now.getDate()).padStart(2, '0') + '-' +
                        String(now.getHours()).padStart(2, '0') +
                        String(now.getMinutes()).padStart(2, '0') +
                        String(now.getSeconds()).padStart(2, '0');
                    const random = Math.random().toString(36).slice(2, 6);
                    const filename = `image-${timestamp}-${random}.${ext}`;
                    if (globalThis.__vscodeApi) {
                        globalThis.__vscodeApi.postMessage({
                            type: 'saveImage',
                            payload: { dataUrl, filename, requestId: `img-${Date.now()}` },
                        });
                    }
                };
                reader.readAsDataURL(file);
                return;
            }
        }
    });

    // ===== 监听 imageSaved 消息，插入图片节点 =====
    function handleImageSaved(event) {
        const msg = event.data;
        if (msg && msg.type === 'imageSaved' && msg.payload && msg.payload.relativePath) {
            // 先更新 Renderer 的图片 URI 缓存，确保 toDOM 能正确解析新图片路径
            if (msg.payload.webviewUri && globalThis.Renderer && globalThis.Renderer.getImageUriCache) {
                const cache = globalThis.Renderer.getImageUriCache();
                cache[msg.payload.relativePath] = msg.payload.webviewUri;
                // 同时缓存 decoded 版本（toDOM 会尝试 decodeURIComponent）
                try { cache[decodeURIComponent(msg.payload.relativePath)] = msg.payload.webviewUri; } catch (e) { /* ignore */ }
            }
            const node = schema.nodes.image.create({ src: msg.payload.relativePath, alt: null, title: null });
            const tr = view.state.tr.replaceSelectionWith(node);
            view.dispatch(tr);
        }
    }
    window.addEventListener('message', handleImageSaved);

    // ===== 辅助：通过坐标设置选区到表格单元格 =====
    function setCellSelection(view, coords) {
        const posInfo = view.posAtCoords({ left: coords.left, top: coords.top });
        if (!posInfo) return;
        const pos = posInfo.pos;
        const $pos = view.state.doc.resolve(pos);
        // 向上查找最近的 table_cell 或 table_header 节点
        for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d);
            if (node.type.name === 'table_cell' || node.type.name === 'table_header') {
                const cellStart = $pos.start(d);
                const tr = view.state.tr.setSelection(Selection.near(view.state.doc.resolve(cellStart)));
                view.dispatch(tr);
                return;
            }
        }
    }

    // ===== 命令映射表 =====
    const commandMap = {
        bold:          (state, dispatch) => toggleMark(schema.marks.strong)(state, dispatch),
        italic:        (state, dispatch) => toggleMark(schema.marks.em)(state, dispatch),
        strikethrough: (state, dispatch) => toggleMark(schema.marks.strikethrough)(state, dispatch),
        h1:            (state, dispatch) => {
            if (state.selection.$from.parent.type === schema.nodes.heading && state.selection.$from.parent.attrs.level === 1) {
                return setBlockType(schema.nodes.paragraph)(state, dispatch);
            }
            return setBlockType(schema.nodes.heading, { level: 1 })(state, dispatch);
        },
        h2:            (state, dispatch) => {
            if (state.selection.$from.parent.type === schema.nodes.heading && state.selection.$from.parent.attrs.level === 2) {
                return setBlockType(schema.nodes.paragraph)(state, dispatch);
            }
            return setBlockType(schema.nodes.heading, { level: 2 })(state, dispatch);
        },
        h3:            (state, dispatch) => {
            if (state.selection.$from.parent.type === schema.nodes.heading && state.selection.$from.parent.attrs.level === 3) {
                return setBlockType(schema.nodes.paragraph)(state, dispatch);
            }
            return setBlockType(schema.nodes.heading, { level: 3 })(state, dispatch);
        },
        ul:            (state, dispatch) => wrapInList(schema.nodes.bullet_list)(state, dispatch),
        ol:            (state, dispatch) => wrapInList(schema.nodes.ordered_list)(state, dispatch),
        blockquote:    (state, dispatch) => wrapIn(schema.nodes.blockquote)(state, dispatch),
        hr:            (state, dispatch) => {
            if (dispatch) {
                const { $from } = state.selection;
                const tr = state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create());
                dispatch(tr);
            }
            return true;
        },
        undo:          (state, dispatch) => undo(state, dispatch),
        redo:          (state, dispatch) => redo(state, dispatch),
        // 表格行列编辑命令
        tableInsertRowAbove: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return addRowBefore(state, dispatch);
        },
        tableInsertRowBelow: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return addRowAfter(state, dispatch);
        },
        tableInsertColLeft: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return addColumnBefore(state, dispatch);
        },
        tableInsertColRight: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return addColumnAfter(state, dispatch);
        },
        tableDeleteRow: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return deleteRow(state, dispatch);
        },
        tableDeleteCol: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return deleteColumn(state, dispatch);
        },
        // ===== 扩展工具栏命令 =====
        code:          (state, dispatch) => toggleMark(schema.marks.code)(state, dispatch),
        highlight:     (state, dispatch) => toggleMark(schema.marks.mark)(state, dispatch),
        textColor:     (state, dispatch, view, attrs) => {
            if (!attrs || !attrs.color) return false;
            return toggleMark(schema.marks.colored_text, { color: attrs.color })(state, dispatch);
        },
        taskList:      (state, dispatch) => {
            // 先包裹为 bullet_list，再将新包裹 list 中所有 checked===null 的 list_item 改为 checked=false
            // 关键修正：遍历新包裹的 bullet_list 节点本身（不用旧 selection 的 from/to 范围），
            // 确保序列化时输出 `- [ ] ` 前缀。
            if (!dispatch) {
                return wrapInList(schema.nodes.bullet_list)(state);
            }
            return wrapInList(schema.nodes.bullet_list)(state, (tr) => {
                const $from = tr.selection.$from;
                // 向上查找最近的 bullet_list 节点及其位置
                let listPos = -1;
                let listNode = null;
                for (let d = $from.depth; d > 0; d--) {
                    const node = $from.node(d);
                    if (node.type === schema.nodes.bullet_list) {
                        listPos = $from.before(d);
                        listNode = node;
                        break;
                    }
                }
                if (listNode) {
                    // 遍历 list 的直接子节点（list_item），将 checked===null 的改为 false
                    let childOffset = 0;
                    listNode.forEach((item, _offset, _idx) => {
                        if (item.type === schema.nodes.list_item && item.attrs.checked === null) {
                            const itemPos = listPos + 1 + childOffset;
                            tr.setNodeMarkup(itemPos, null, { ...item.attrs, checked: false });
                        }
                        childOffset += item.nodeSize;
                    });
                }
                dispatch(tr);
            });
        },
        link:          (state, dispatch, view, attrs) => {
            if (!attrs) return false;
            const { from, to, empty } = state.selection;
            if (empty) return false;
            if (dispatch) {
                let tr = state.tr;
                const href = typeof attrs.href === 'string' ? attrs.href.trim() : '';
                const newText = typeof attrs.text === 'string' ? attrs.text : '';
                const currentText = state.doc.textBetween(from, to);
                // 如果提供了新的显示文本且与当前不同，替换文本内容
                if (newText && newText !== currentText) {
                    // 替换文本并应用 link mark（或移除）
                    if (href) {
                        const mark = schema.marks.link.create({ href, title: attrs.title || null });
                        const textNode = schema.text(newText, [mark]);
                        tr = tr.replaceWith(from, to, textNode);
                    } else {
                        // 空 href = 移除链接，只替换文本
                        const textNode = schema.text(newText);
                        tr = tr.replaceWith(from, to, textNode);
                    }
                } else {
                    // 文本不变，只操作 mark
                    tr = tr.removeMark(from, to, schema.marks.link);
                    if (href) {
                        const mark = schema.marks.link.create({ href, title: attrs.title || null });
                        tr = tr.addMark(from, to, mark);
                    }
                }
                dispatch(tr.scrollIntoView());
            }
            return true;
        },
        tableDelete: (state, dispatch, view, attrs) => {
            if (attrs && attrs.coords) { setCellSelection(view, attrs.coords); state = view.state; }
            return deleteTable(state, dispatch);
        },
        insertImage:   (state, dispatch, view, attrs) => {
            if (!attrs || !attrs.src) return false;
            if (dispatch) {
                const node = schema.nodes.image.create({ src: attrs.src, alt: attrs.alt || null, title: null });
                dispatch(state.tr.replaceSelectionWith(node));
            }
            return true;
        },
        alertBlock:    (state, dispatch, view, attrs) => {
            const alertType = (attrs && attrs.alertType) || 'NOTE';
            // 侦测当前光标是否已在 gh_alert 祖先内 → setNodeMarkup 切换 attr
            const $from = state.selection.$from;
            for (let d = $from.depth; d > 0; d--) {
                const node = $from.node(d);
                if (node.type === schema.nodes.gh_alert) {
                    const pos = $from.before(d);
                    if (dispatch) {
                        dispatch(state.tr.setNodeMarkup(pos, null, { ...node.attrs, alertType }));
                    }
                    return true;
                }
            }
            // 未在 alert 内 → 包裹
            return wrapIn(schema.nodes.gh_alert, { alertType })(state, dispatch);
        },
        codeBlock:     (state, dispatch, view, attrs) => {
            const language = ((attrs && attrs.language) || '').trim().toLowerCase();
            // 侦测当前光标是否已在 code_block 祖先内 → setNodeMarkup 切换 attr
            const $from = state.selection.$from;
            for (let d = $from.depth; d > 0; d--) {
                const node = $from.node(d);
                if (node.type === schema.nodes.code_block) {
                    const pos = $from.before(d);
                    if (dispatch) {
                        dispatch(state.tr.setNodeMarkup(pos, null, { ...node.attrs, language }));
                    }
                    return true;
                }
            }
            // 未在 code_block 内 → 插入新的
            if (dispatch) {
                const node = schema.nodes.code_block.create({ language });
                dispatch(state.tr.replaceSelectionWith(node));
            }
            return true;
        },
        insertTable:   (state, dispatch, view, attrs) => {
            if (dispatch) {
                // 支持 attrs.rows（总行数，含表头）和 attrs.cols，无 attrs 时回退到 3×3
                const rows = (attrs && attrs.rows && attrs.rows >= 1) ? attrs.rows : 3;
                const cols = (attrs && attrs.cols && attrs.cols >= 1) ? attrs.cols : 3;
                // 表头行
                const headerCells = [];
                for (let c = 0; c < cols; c++) headerCells.push(schema.nodes.table_header.createAndFill());
                const headerRow = schema.nodes.table_row.create(null, headerCells);
                // 数据行（rows - 1 行）
                const bodyRows = [];
                for (let r = 1; r < rows; r++) {
                    const cells = [];
                    for (let c = 0; c < cols; c++) cells.push(schema.nodes.table_cell.createAndFill());
                    bodyRows.push(schema.nodes.table_row.create(null, cells));
                }
                const table = schema.nodes.table.create(null, [headerRow, ...bodyRows]);
                dispatch(state.tr.replaceSelectionWith(table));
            }
            return true;
        },
        insertMermaid: (state, dispatch) => {
            if (dispatch) {
                const node = schema.nodes.diagram.create({ language: 'mermaid', source: 'graph TD\n  A --> B' });
                dispatch(state.tr.replaceSelectionWith(node));
            }
            return true;
        },
        insertEmoji:   (state, dispatch, view, attrs) => {
            if (!attrs || !attrs.emoji) return false;
            if (dispatch) {
                dispatch(state.tr.insertText(attrs.emoji));
            }
            return true;
        },
        insertPlantuml: (state, dispatch) => {
            if (dispatch) {
                const node = schema.nodes.diagram.create({ language: 'plantuml', source: '@startuml\nAlice -> Bob: Hello\n@enduml' });
                dispatch(state.tr.replaceSelectionWith(node));
            }
            return true;
        },
        insertGraphviz: (state, dispatch) => {
            if (dispatch) {
                const node = schema.nodes.diagram.create({ language: 'dot', source: 'digraph G {\n  A -> B\n}' });
                dispatch(state.tr.replaceSelectionWith(node));
            }
            return true;
        },
    };

    // 将 commandMap 填充到延迟引用对象（供 Slash Command Plugin 使用）
    Object.assign(commandMapRef, commandMap);

    // ===== 辅助：读取当前选区所处 link mark 的属性与覆盖范围 =====
    function getLinkAttrsAtSelection() {
        const state = view.state;
        const { $from } = state.selection;
        const linkType = schema.marks.link;
        // 查找 $from 位置上的 link mark
        const marks = $from.marks();
        let linkMark = null;
        for (const m of marks) {
            if (m.type === linkType) { linkMark = m; break; }
        }
        // 如果 $from 上没有，尝试 parent 内前一位置（选区边界情况）
        if (!linkMark) {
            const before = $from.nodeBefore;
            if (before && before.marks) {
                for (const m of before.marks) {
                    if (m.type === linkType) { linkMark = m; break; }
                }
            }
        }
        if (!linkMark) return null;

        // 找到 link mark 的完整覆盖范围（在当前 parent 节点内扩展）
        const parent = $from.parent;
        const parentStart = $from.start();
        const posInParent = $from.parentOffset;
        let markStart = posInParent;
        let markEnd = posInParent;
        // 遍历 parent 的 inline 内容，找到 link mark 连续区间
        let offset = 0;
        parent.forEach((child, _off, _idx) => {
            const childSize = child.nodeSize;
            const childHasLink = child.marks && child.marks.some(m => (
                m.type === linkType && m.attrs.href === linkMark.attrs.href
            ));
            if (childHasLink) {
                if (offset <= posInParent && posInParent <= offset + childSize) {
                    // 命中区间：扩展边界
                    markStart = Math.min(markStart, offset);
                    markEnd = Math.max(markEnd, offset + childSize);
                }
            }
            offset += childSize;
        });
        // 退路：如果上述遍历没有扩展到，则至少返回 mark 的属性与当前选区
        const from = parentStart + markStart;
        const to = parentStart + markEnd;
        // 获取链接显示文本
        const text = state.doc.textBetween(from, to);
        return {
            href: linkMark.attrs.href || '',
            title: linkMark.attrs.title || '',
            text: text || '',
            from: from,
            to: to,
        };
    }

    return {
        destroy() {
            window.removeEventListener('message', handleImageSaved);
            view.destroy();
        },
        getMarkdown() { return serializeMarkdownFn(view.state.doc); },
        setMarkdown(s) {
            const newDoc = parseMarkdown(s || '');
            const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
            view.dispatch(tr);
        },
        focus() { view.focus(); },
        updateAnnotations(anns) {
            setAnnotations(anns);
            const tr = view.state.tr.setMeta('annotations-changed', anns);
            view.dispatch(tr);
        },
        execCommand(name, attrs) {
            const cmd = commandMap[name];
            if (!cmd) { console.warn(`[pm] unknown command: ${name}`); return false; }
            const result = cmd(view.state, view.dispatch, view, attrs);
            view.focus();
            return !!result;
        },
        getLinkAttrsAtSelection,
        // 暴露扩展选区到指定范围（供 link popover 确认前用）
        setSelectionRange(from, to) {
            const doc = view.state.doc;
            if (from < 0 || to < 0 || from > doc.content.size || to > doc.content.size || from > to) return false;
            const sel = TextSelection.create(doc, from, to);
            view.dispatch(view.state.tr.setSelection(sel));
            return true;
        },
        // 光标位置查询：返回与预览块索引一致的 { blockIndex, offset }。
        // 之前的 getCursorLine 返回 markdown 行号，却被 enterRich 当成块索引用，
        // 导致重新进入富文本时光标跳到错误块。
        getCursorPosition() {
            try {
                const pos = view.state.selection.from;
                let blockStart = 0;
                let seen = -1;
                let targetStart = 0;
                let targetNode = null;
                let lastContent = null; // 最后一个非 footnote_def 块，用于文末兜底

                for (let i = 0; i < view.state.doc.childCount; i++) {
                    const child = view.state.doc.child(i);
                    if (child.type.name !== 'footnote_def') {
                        seen++;
                        lastContent = { index: seen, node: child, start: blockStart };
                        if (pos < blockStart + child.nodeSize) {
                            targetStart = blockStart;
                            targetNode = child;
                            break;
                        }
                    }
                    blockStart += child.nodeSize;
                }

                if (!targetNode) {
                    if (!lastContent) return { blockIndex: 0, offset: 0 };
                    const lastIndex = lastContent.index;
                    const lastStart = lastContent.start;
                    const textblocks = [];
                    collectTextblocks(lastContent.node, lastStart, textblocks);
                    const total = textblocks.reduce((n, tb) => n + tb.node.content.size, 0);
                    return { blockIndex: lastIndex, offset: total };
                }

                const textblocks = [];
                collectTextblocks(targetNode, targetStart, textblocks);
                let offset = 0;
                let found = false;
                for (const tb of textblocks) {
                    const size = tb.node.content.size;
                    if (pos < tb.start + size) {
                        offset += Math.max(0, pos - tb.start);
                        found = true;
                        break;
                    }
                    offset += size;
                }
                if (!found) offset = textblocks.reduce((n, tb) => n + tb.node.content.size, 0);
                return { blockIndex: seen, offset };
            } catch (e) {
                return { blockIndex: 0, offset: 0 };
            }
        },
        // 兼容旧接口：返回块序号（1-based），不再声称是行号
        getCursorLine() {
            return this.getCursorPosition().blockIndex + 1;
        },
    };
}

// 挂载到 globalThis
globalThis.PM = {
    createRichEditor,
    /**
     * 诊断/基准用：把 markdown 解析后重新序列化。
     * useBase=true 时使用 prosemirror-markdown 的基类实现，用于逐字节对比。
     */
    serializeMarkdown(markdown, useBase) {
        const doc = parseMarkdown(markdown || '');
        return useBase ? baseSerializer.serialize(doc) : serializeMarkdownFn(doc);
    },
};
