/**
 * pm-schema.js — ProseMirror Schema 定义
 *
 * 覆盖项目所有 Markdown 特性的 ProseMirror Schema。
 * 节点和标记类型参见 design.md D2。
 *
 * Change: add-dual-mode-editor-phase-b-pm-rich
 */

import { Schema } from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';

// ===== 表格节点（由 prosemirror-tables 提供基础定义） =====
const tableNodeSpecs = tableNodes({
    tableGroup: 'block',
    cellContent: 'inline*',
    cellAttributes: {
        align: {
            default: null,
            getFromDOM(dom) { return dom.getAttribute('data-align') || dom.style.textAlign || null; },
            setDOMAttr(value, attrs) { if (value) attrs['data-align'] = value; },
        },
    },
});

// ===== 节点定义 =====
const nodes = {
    doc: {
        content: 'block+',
    },

    paragraph: {
        content: 'inline*',
        group: 'block',
        parseDOM: [{ tag: 'p' }],
        toDOM() { return ['p', 0]; },
    },

    heading: {
        attrs: { level: { default: 1, validate: 'number' } },
        content: 'inline*',
        group: 'block',
        defining: true,
        parseDOM: [
            { tag: 'h1', attrs: { level: 1 } },
            { tag: 'h2', attrs: { level: 2 } },
            { tag: 'h3', attrs: { level: 3 } },
            { tag: 'h4', attrs: { level: 4 } },
            { tag: 'h5', attrs: { level: 5 } },
            { tag: 'h6', attrs: { level: 6 } },
        ],
        toDOM(node) { return ['h' + node.attrs.level, 0]; },
    },

    blockquote: {
        content: 'block+',
        group: 'block',
        defining: true,
        parseDOM: [{ tag: 'blockquote' }],
        toDOM() { return ['blockquote', 0]; },
    },

    gh_alert: {
        attrs: { alertType: { default: 'NOTE' } },
        content: 'block+',
        group: 'block',
        defining: true,
        parseDOM: [{
            tag: 'div.gh-alert',
            getAttrs(dom) {
                const typeMap = { 'alert-note': 'NOTE', 'alert-tip': 'TIP', 'alert-important': 'IMPORTANT', 'alert-warning': 'WARNING', 'alert-caution': 'CAUTION' };
                for (const [cls, type] of Object.entries(typeMap)) {
                    if (dom.classList.contains(cls)) return { alertType: type };
                }
                return { alertType: 'NOTE' };
            },
        }],
        toDOM(node) {
            const cls = 'alert-' + node.attrs.alertType.toLowerCase();
            return ['div', { class: `gh-alert ${cls}` }, 0];
        },
    },

    code_block: {
        attrs: { language: { default: '' } },
        content: 'text*',
        marks: '',
        group: 'block',
        code: true,
        defining: true,
        parseDOM: [{
            tag: 'pre',
            preserveWhitespace: 'full',
            getAttrs(dom) {
                const code = dom.querySelector('code');
                const cls = code ? (code.className || '') : '';
                const match = cls.match(/language-(\S+)/);
                return { language: match ? match[1] : '' };
            },
        }],
        toDOM(node) {
            const codeAttrs = node.attrs.language ? { class: `language-${node.attrs.language}` } : {};
            return ['pre', ['code', codeAttrs, 0]];
        },
    },

    horizontal_rule: {
        group: 'block',
        parseDOM: [{ tag: 'hr' }],
        toDOM() { return ['hr']; },
    },

    bullet_list: {
        content: 'list_item+',
        group: 'block',
        parseDOM: [{ tag: 'ul' }],
        toDOM() { return ['ul', 0]; },
    },

    ordered_list: {
        attrs: { start: { default: 1, validate: 'number' } },
        content: 'list_item+',
        group: 'block',
        parseDOM: [{
            tag: 'ol',
            getAttrs(dom) { return { start: dom.hasAttribute('start') ? +dom.getAttribute('start') : 1 }; },
        }],
        toDOM(node) {
            return node.attrs.start === 1 ? ['ol', 0] : ['ol', { start: node.attrs.start }, 0];
        },
    },

    list_item: {
        attrs: { checked: { default: null } },
        content: 'paragraph block*',
        parseDOM: [{
            tag: 'li',
            getAttrs(dom) {
                const checkbox = dom.querySelector('input[type="checkbox"]');
                if (checkbox) return { checked: checkbox.checked };
                return { checked: null };
            },
        }],
        toDOM(node) {
            if (node.attrs.checked !== null) {
                return ['li', { class: 'task-list-item' }, 0];
            }
            return ['li', 0];
        },
        defining: true,
    },

    // 表格节点（由 prosemirror-tables 生成，覆盖 align 属性）
    ...tableNodeSpecs,

    image: {
        inline: true,
        attrs: {
            src: {},
            alt: { default: null },
            title: { default: null },
        },
        group: 'inline',
        draggable: true,
        parseDOM: [{
            tag: 'img[src]',
            getAttrs(dom) {
                return {
                    src: dom.getAttribute('src'),
                    alt: dom.getAttribute('alt'),
                    title: dom.getAttribute('title'),
                };
            },
        }],
        toDOM(node) {
            const { src, alt, title } = node.attrs;
            return ['img', { src, alt, title }];
        },
    },

    hard_break: {
        inline: true,
        group: 'inline',
        selectable: false,
        parseDOM: [{ tag: 'br' }],
        toDOM() { return ['br']; },
    },

    math_inline: {
        attrs: { formula: { default: '' } },
        inline: true,
        group: 'inline',
        atom: true,
        code: true,
        toDOM(node) {
            return ['code', { class: 'math-inline', 'data-formula': node.attrs.formula }, `$${node.attrs.formula}$`];
        },
        parseDOM: [{
            tag: 'code.math-inline',
            getAttrs(dom) { return { formula: dom.getAttribute('data-formula') || dom.textContent.replace(/^\$|\$$/g, '') }; },
        }],
    },

    math_display: {
        attrs: { formula: { default: '' } },
        group: 'block',
        atom: true,
        code: true,
        toDOM(node) {
            return ['div', { class: 'math-display', 'data-formula': node.attrs.formula }, `$$${node.attrs.formula}$$`];
        },
        parseDOM: [{
            tag: 'div.math-display',
            getAttrs(dom) { return { formula: dom.getAttribute('data-formula') || dom.textContent.replace(/^\$\$|\$\$$/g, '') }; },
        }],
    },

    diagram: {
        attrs: {
            language: { default: 'mermaid' },
            source: { default: '' },
        },
        group: 'block',
        atom: true,
        toDOM(node) {
            return ['div', {
                class: `diagram-nodeview diagram-${node.attrs.language}`,
                'data-language': node.attrs.language,
                'data-source': node.attrs.source,
            }, `\`\`\`${node.attrs.language}`];
        },
        parseDOM: [{
            tag: 'div.diagram-nodeview',
            getAttrs(dom) {
                return {
                    language: dom.getAttribute('data-language') || 'mermaid',
                    source: dom.getAttribute('data-source') || '',
                };
            },
        }],
    },

    frontmatter: {
        attrs: { content: { default: '' } },
        group: 'block',
        atom: true,
        toDOM(node) {
            return ['pre', { class: 'frontmatter', 'data-content': node.attrs.content }, node.attrs.content];
        },
        parseDOM: [{
            tag: 'pre.frontmatter',
            getAttrs(dom) { return { content: dom.getAttribute('data-content') || dom.textContent }; },
        }],
    },

    text: {
        group: 'inline',
    },
};

// ===== 标记定义 =====
const marks = {
    strong: {
        parseDOM: [
            { tag: 'strong' },
            { tag: 'b', getAttrs: node => node.style.fontWeight !== 'normal' && null },
            { style: 'font-weight=bold' },
            { style: 'font-weight', getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
        ],
        toDOM() { return ['strong', 0]; },
    },

    em: {
        parseDOM: [
            { tag: 'i' },
            { tag: 'em' },
            { style: 'font-style=italic' },
        ],
        toDOM() { return ['em', 0]; },
    },

    code: {
        parseDOM: [{ tag: 'code' }],
        toDOM() { return ['code', 0]; },
    },

    link: {
        attrs: {
            href: {},
            title: { default: null },
        },
        inclusive: false,
        parseDOM: [{
            tag: 'a[href]',
            getAttrs(dom) {
                return { href: dom.getAttribute('href'), title: dom.getAttribute('title') };
            },
        }],
        toDOM(node) {
            const { href, title } = node.attrs;
            return ['a', { href, title }, 0];
        },
    },

    strikethrough: {
        parseDOM: [
            { tag: 's' },
            { tag: 'del' },
            { style: 'text-decoration', getAttrs: value => value === 'line-through' && null },
        ],
        toDOM() { return ['del', 0]; },
    },

    colored_text: {
        attrs: { color: { default: '' } },
        parseDOM: [{
            tag: 'span',
            getAttrs(dom) {
                const style = dom.getAttribute('style') || '';
                const match = style.match(/color\s*:\s*([^;]+)/i);
                return match ? { color: match[1].trim() } : false;
            },
        }],
        toDOM(node) {
            return ['span', { style: `color: ${node.attrs.color}` }, 0];
        },
    },

    kbd: {
        parseDOM: [{ tag: 'kbd' }],
        toDOM() { return ['kbd', 0]; },
    },

    mark: {
        parseDOM: [{ tag: 'mark' }],
        toDOM() { return ['mark', 0]; },
    },

    subscript: {
        parseDOM: [{ tag: 'sub' }],
        toDOM() { return ['sub', 0]; },
    },

    superscript: {
        parseDOM: [{ tag: 'sup' }],
        toDOM() { return ['sup', 0]; },
    },

    underline: {
        parseDOM: [
            { tag: 'u' },
            { tag: 'ins' },
            { style: 'text-decoration', getAttrs: value => value === 'underline' && null },
        ],
        toDOM() { return ['u', 0]; },
    },
};

// ===== 创建 Schema =====
const schema = new Schema({ nodes, marks });

export { schema };
