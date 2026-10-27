/**
 * nodeviews/frontmatter.js — YAML Front Matter NodeView
 */

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
        const contentChanged = node.attrs.content !== this.node.attrs.content;
        this.node = node;
        // 内容未变时不重建 DOM
        if (!this.editing && contentChanged) {
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

export { FrontmatterNodeView };
