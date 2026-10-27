/**
 * nodeviews/diagram.js — 图表（Mermaid / PlantUML / Graphviz）NodeView
 */

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

export { DiagramNodeView };
