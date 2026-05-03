/**
 * pm-markdown-bridge.js — Markdown↔ProseMirror 双向桥
 *
 * 基于 prosemirror-markdown 的 MarkdownParser 和 MarkdownSerializer，
 * 实现 markdown 文本与 ProseMirror 文档的双向转换。
 * 完全绕过 turndown，直接从 PM doc 结构生成 markdown 文本。
 *
 * Change: add-dual-mode-editor-phase-b-pm-rich
 */

import { schema } from './pm-schema.js';
import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown';
import markdownit from 'markdown-it';

// ===== markdown-it 实例配置 =====
const md = markdownit('commonmark', { html: true })
    .enable('strikethrough')
    .enable('table');

// ===== 自定义 markdown-it 插件 =====

/**
 * Frontmatter 插件：识别文档开头的 ---\n...\n---
 */
function frontmatterPlugin(md) {
    md.block.ruler.before('hr', 'frontmatter', function (state, startLine, endLine, silent) {
        if (startLine !== 0) return false;
        const startPos = state.bMarks[startLine] + state.tShift[startLine];
        const startMax = state.eMarks[startLine];
        if (state.src.slice(startPos, startMax).trim() !== '---') return false;

        let nextLine = startLine + 1;
        let found = false;
        while (nextLine < endLine) {
            const pos = state.bMarks[nextLine] + state.tShift[nextLine];
            const max = state.eMarks[nextLine];
            if (state.src.slice(pos, max).trim() === '---') {
                found = true;
                break;
            }
            nextLine++;
        }
        if (!found) return false;
        if (silent) return true;

        const contentStart = state.eMarks[startLine] + 1;
        const contentEnd = state.bMarks[nextLine];
        const content = state.src.slice(contentStart, contentEnd);

        const token = state.push('frontmatter', '', 0);
        token.content = content;
        token.map = [startLine, nextLine + 1];
        state.line = nextLine + 1;
        return true;
    });
}

/**
 * 数学公式插件：识别 $...$ (inline) 和 $$...$$ (display)
 */
function mathPlugin(md) {
    // Display math: $$...$$
    md.block.ruler.before('fence', 'math_display', function (state, startLine, endLine, silent) {
        const startPos = state.bMarks[startLine] + state.tShift[startLine];
        const startMax = state.eMarks[startLine];
        if (state.src.slice(startPos, startPos + 2) !== '$$') return false;

        // 单行 $$formula$$
        const restOfLine = state.src.slice(startPos + 2, startMax);
        if (restOfLine.endsWith('$$') && restOfLine.length > 2) {
            if (silent) return true;
            const token = state.push('math_display', '', 0);
            token.content = restOfLine.slice(0, -2);
            token.map = [startLine, startLine + 1];
            state.line = startLine + 1;
            return true;
        }

        // 多行 $$\n...\n$$
        let nextLine = startLine + 1;
        let found = false;
        while (nextLine < endLine) {
            const pos = state.bMarks[nextLine] + state.tShift[nextLine];
            const max = state.eMarks[nextLine];
            if (state.src.slice(pos, max).trim() === '$$') {
                found = true;
                break;
            }
            nextLine++;
        }
        if (!found) return false;
        if (silent) return true;

        const contentStart = state.eMarks[startLine] + 1;
        const contentEnd = state.bMarks[nextLine];
        const content = state.src.slice(contentStart, contentEnd).replace(/^\n|\n$/g, '');

        const token = state.push('math_display', '', 0);
        token.content = content;
        token.map = [startLine, nextLine + 1];
        state.line = nextLine + 1;
        return true;
    });

    // Inline math: $...$
    md.inline.ruler.after('escape', 'math_inline', function (state, silent) {
        if (state.src[state.pos] !== '$') return false;
        if (state.src[state.pos + 1] === '$') return false; // 跳过 $$

        const start = state.pos + 1;
        let end = start;
        while (end < state.posMax) {
            if (state.src[end] === '$' && state.src[end - 1] !== '\\') break;
            end++;
        }
        if (end >= state.posMax) return false;
        if (end === start) return false; // 空公式 $$

        if (silent) { state.pos = end + 1; return true; }

        const token = state.push('math_inline', '', 0);
        token.content = state.src.slice(start, end);
        state.pos = end + 1;
        return true;
    });
}

/**
 * GH 告警块插件：识别 > [!NOTE] 等
 */
function ghAlertPlugin(md) {
    // 在 blockquote 渲染后处理
    const originalBlockquoteOpen = md.renderer.rules.blockquote_open;
    const originalBlockquoteClose = md.renderer.rules.blockquote_close;

    // 我们通过 core rule 在 token 流中识别告警块
    md.core.ruler.after('block', 'gh_alert', function (state) {
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type !== 'blockquote_open') continue;

            // 查找 blockquote 内的第一个 inline token
            let j = i + 1;
            while (j < tokens.length && tokens[j].type !== 'blockquote_close') {
                if (tokens[j].type === 'inline') {
                    const content = tokens[j].content;
                    const alertMatch = content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
                    if (alertMatch) {
                        const alertType = alertMatch[1].toUpperCase();
                        // 替换 blockquote_open → gh_alert_open
                        tokens[i].type = 'gh_alert_open';
                        tokens[i].tag = 'div';
                        tokens[i].attrSet('class', `gh-alert alert-${alertType.toLowerCase()}`);
                        tokens[i].meta = { alertType };

                        // 移除 [!TYPE] 前缀
                        tokens[j].content = content.slice(alertMatch[0].length);

                        // 找到对应的 blockquote_close 并替换
                        let depth = 1;
                        for (let k = i + 1; k < tokens.length; k++) {
                            if (tokens[k].type === 'blockquote_open') depth++;
                            if (tokens[k].type === 'blockquote_close') {
                                depth--;
                                if (depth === 0) {
                                    tokens[k].type = 'gh_alert_close';
                                    tokens[k].tag = 'div';
                                    break;
                                }
                            }
                        }
                    }
                    break;
                }
                j++;
            }
        }
    });
}

/**
 * 彩色文本插件：识别 {color:xxx}...{/color}
 */
function coloredTextPlugin(md) {
    md.inline.ruler.after('emphasis', 'colored_text', function (state, silent) {
        const src = state.src;
        if (src.slice(state.pos, state.pos + 7) !== '{color:') return false;

        const colorEnd = src.indexOf('}', state.pos + 7);
        if (colorEnd === -1) return false;
        const color = src.slice(state.pos + 7, colorEnd);
        if (!color) return false;

        const closeTag = '{/color}';
        const closeIdx = src.indexOf(closeTag, colorEnd + 1);
        if (closeIdx === -1) return false;

        if (silent) { state.pos = closeIdx + closeTag.length; return true; }

        const tokenOpen = state.push('colored_text_open', 'span', 1);
        tokenOpen.attrSet('style', `color: ${color}`);
        tokenOpen.markup = `{color:${color}}`;

        // 解析内部内容
        const innerContent = src.slice(colorEnd + 1, closeIdx);
        const tokenInline = state.push('text', '', 0);
        tokenInline.content = innerContent;

        const tokenClose = state.push('colored_text_close', 'span', -1);
        tokenClose.markup = closeTag;

        state.pos = closeIdx + closeTag.length;
        return true;
    });
}

/**
 * 图表代码块识别：将 ```mermaid/plantuml/dot 映射为 diagram token
 */
function diagramPlugin(md) {
    const diagramLangs = new Set(['mermaid', 'plantuml', 'dot', 'graphviz']);
    const originalFence = md.renderer.rules.fence;

    md.core.ruler.after('block', 'diagram', function (state) {
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === 'fence' && diagramLangs.has((tokens[i].info || '').trim().toLowerCase())) {
                tokens[i].type = 'diagram';
                tokens[i].meta = {
                    language: tokens[i].info.trim().toLowerCase() === 'graphviz' ? 'dot' : tokens[i].info.trim().toLowerCase(),
                    source: tokens[i].content,
                };
            }
        }
    });
}

/**
 * HTML inline 标签转换插件：将已知的 HTML 标签（<br>, <kbd>, <mark>, <sub>, <sup>, <ins>, <u>）
 * 转换为对应的 PM mark/node token，避免 MarkdownParser 抛出 "html_inline not supported"。
 * 未识别的 HTML 标签降级为纯文本（text token），保证 parser 不崩溃。
 *
 * 工作在 inline token children 层面：md.core 规则遍历 inline token 的 children，
 * 识别 html_inline 并原地替换/插入新 token。
 */
function htmlTagConverterPlugin(md) {
    // 已知的 HTML mark 标签 → PM mark 名称
    const markTagMap = {
        'kbd': 'kbd',
        'mark': 'mark',
        'sub': 'subscript',
        'sup': 'superscript',
        'ins': 'underline',
        'u': 'underline',
    };

    /**
     * 解析单个 html_inline token 的 content，返回描述对象：
     *  - { kind: 'br' }
     *  - { kind: 'mark_open' | 'mark_close', markName }
     *  - { kind: 'text', text }   (无法识别，降级为文本)
     */
    function classifyHtmlInline(content) {
        const trimmed = content.trim();
        // <br>, <br/>, <br />
        if (/^<br\s*\/?\s*>$/i.test(trimmed)) {
            return { kind: 'br' };
        }
        // <tag> or <tag attrs...>
        const openMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>$/);
        if (openMatch) {
            const tag = openMatch[1].toLowerCase();
            if (markTagMap[tag]) return { kind: 'mark_open', markName: markTagMap[tag] };
        }
        // </tag>
        const closeMatch = trimmed.match(/^<\/([a-zA-Z][a-zA-Z0-9]*)\s*>$/);
        if (closeMatch) {
            const tag = closeMatch[1].toLowerCase();
            if (markTagMap[tag]) return { kind: 'mark_close', markName: markTagMap[tag] };
        }
        // 其他未识别 HTML 标签 → 降级为文本
        return { kind: 'text', text: content };
    }

    md.core.ruler.after('inline', 'html_tag_converter', function (state) {
        const Token = state.Token;
        for (const tok of state.tokens) {
            if (tok.type !== 'inline' || !tok.children || !tok.children.length) continue;
            const newChildren = [];
            for (const child of tok.children) {
                if (child.type === 'html_inline') {
                    const info = classifyHtmlInline(child.content);
                    if (info.kind === 'br') {
                        const t = new Token('hardbreak', 'br', 0);
                        newChildren.push(t);
                    } else if (info.kind === 'mark_open') {
                        const t = new Token(info.markName + '_open', '', 1);
                        t.markup = child.content;
                        newChildren.push(t);
                    } else if (info.kind === 'mark_close') {
                        const t = new Token(info.markName + '_close', '', -1);
                        t.markup = child.content;
                        newChildren.push(t);
                    } else {
                        // 降级：html_inline → text，保留原始内容但不崩溃
                        const t = new Token('text', '', 0);
                        t.content = info.text;
                        newChildren.push(t);
                    }
                } else {
                    newChildren.push(child);
                }
            }
            tok.children = newChildren;
        }
    });
}

// 注册插件
md.use(frontmatterPlugin);
md.use(mathPlugin);
md.use(ghAlertPlugin);
md.use(coloredTextPlugin);
md.use(diagramPlugin);
md.use(htmlTagConverterPlugin);

// ===== MarkdownParser 配置 =====
const parser = new MarkdownParser(schema, md, {
    blockquote: { block: 'blockquote' },
    paragraph: { block: 'paragraph' },
    list_item: { block: 'list_item' },
    bullet_list: { block: 'bullet_list' },
    ordered_list: { block: 'ordered_list', getAttrs: tok => ({ start: +tok.attrGet('start') || 1 }) },
    heading: { block: 'heading', getAttrs: tok => ({ level: +tok.tag.slice(1) }) },
    code_block: { block: 'code_block', noCloseToken: true },
    fence: { block: 'code_block', getAttrs: tok => ({ language: tok.info || '' }), noCloseToken: true },
    hr: { node: 'horizontal_rule' },
    image: { node: 'image', getAttrs: tok => ({
        src: tok.attrGet('src'),
        title: tok.attrGet('title') || null,
        alt: (tok.children && tok.children[0] && tok.children[0].content) || null,
    }) },
    hardbreak: { node: 'hard_break' },
    // HTML token 兜底：html_inline 已在 htmlTagConverterPlugin 中被转换为 hardbreak/mark/text token，
    // 理论上不会到达 parser；此处映射为 ignore 作为最后一道保险。
    // html_block（整块 HTML）统一 ignore，避免解析失败；如果将来需要保留原文可改为自定义节点。
    html_inline: { ignore: true },
    html_block: { ignore: true },
    // 表格节点（markdown-it table 插件 → prosemirror-tables schema）
    table: { block: 'table' },
    thead: { ignore: true },
    tbody: { ignore: true },
    tr: { block: 'table_row' },
    th: { block: 'table_header', getAttrs: tok => {
        const style = tok.attrGet('style') || '';
        const match = style.match(/text-align\s*:\s*(\w+)/);
        return { align: match ? match[1] : null };
    }},
    td: { block: 'table_cell', getAttrs: tok => {
        const style = tok.attrGet('style') || '';
        const match = style.match(/text-align\s*:\s*(\w+)/);
        return { align: match ? match[1] : null };
    }},
    // 自定义节点
    frontmatter: { node: 'frontmatter', getAttrs: tok => ({ content: tok.content }) },
    math_display: { node: 'math_display', getAttrs: tok => ({ formula: tok.content }) },
    math_inline: { node: 'math_inline', getAttrs: tok => ({ formula: tok.content }) },
    diagram: { node: 'diagram', getAttrs: tok => ({
        language: tok.meta?.language || 'mermaid',
        source: tok.meta?.source || tok.content || '',
    }) },
    gh_alert: { block: 'gh_alert', getAttrs: tok => ({ alertType: tok.meta?.alertType || 'NOTE' }) },
    // 标记
    em: { mark: 'em' },
    strong: { mark: 'strong' },
    link: { mark: 'link', getAttrs: tok => ({
        href: tok.attrGet('href'),
        title: tok.attrGet('title') || null,
    }) },
    code_inline: { mark: 'code' },
    s: { mark: 'strikethrough' },
    colored_text: { mark: 'colored_text', getAttrs: tok => {
        const style = tok.attrGet('style') || '';
        const match = style.match(/color\s*:\s*([^;]+)/i);
        return { color: match ? match[1].trim() : '' };
    }},
    // HTML 标签对应的 mark（由 htmlTagConverterPlugin 注入的合成 token）
    kbd: { mark: 'kbd' },
    mark: { mark: 'mark' },
    subscript: { mark: 'subscript' },
    superscript: { mark: 'superscript' },
    underline: { mark: 'underline' },
});

// ===== MarkdownSerializer 配置 =====
const serializer = new MarkdownSerializer(
    // 节点序列化器
    {
        doc(state, node) {
            state.renderContent(node);
        },
        paragraph(state, node) {
            state.renderInline(node);
            state.closeBlock(node);
        },
        heading(state, node) {
            state.write('#'.repeat(node.attrs.level) + ' ');
            state.renderInline(node);
            state.closeBlock(node);
        },
        blockquote(state, node) {
            state.wrapBlock('> ', null, node, () => state.renderContent(node));
        },
        gh_alert(state, node) {
            state.wrapBlock('> ', null, node, () => {
                state.write(`[!${node.attrs.alertType}]`);
                state.ensureNewLine();
                state.renderContent(node);
            });
        },
        code_block(state, node) {
            const lang = node.attrs.language || '';
            state.write('```' + lang + '\n');
            state.text(node.textContent, false);
            state.ensureNewLine();
            state.write('```');
            state.closeBlock(node);
        },
        horizontal_rule(state, node) {
            state.write('---');
            state.closeBlock(node);
        },
        bullet_list(state, node) {
            state.renderList(node, '  ', () => '- ');
        },
        ordered_list(state, node) {
            const start = node.attrs.start || 1;
            const maxW = String(start + node.childCount - 1).length;
            const space = '  ';
            state.renderList(node, space, (i) => {
                const nStr = String(start + i);
                return nStr + '. ';
            });
        },
        list_item(state, node) {
            if (node.attrs.checked !== null) {
                state.write(node.attrs.checked ? '[x] ' : '[ ] ');
            }
            state.renderContent(node);
        },
        // 表格序列化
        table(state, node) {
            // 收集所有行
            const rows = [];
            node.forEach(row => {
                const cells = [];
                row.forEach(cell => {
                    const isHeader = cell.type.name === 'table_header';
                    const align = cell.attrs.align || null;
                    // 序列化 cell 内容为 inline markdown
                    let cellContent = '';
                    const tmpState = new MarkdownSerializer(serializer.nodes, serializer.marks).serialize(cell);
                    // 简化：直接提取文本
                    cell.forEach(child => {
                        // 对于简单 inline 内容，递归序列化
                    });
                    // 使用 state 的 renderInline 来获取 cell 内容
                    cells.push({ content: '', isHeader, align });
                });
                rows.push(cells);
            });

            // 简化的表格序列化：逐行处理
            let isFirstRow = true;
            let headerAligns = [];
            node.forEach((row, _, rowIdx) => {
                let line = '|';
                const cellAligns = [];
                row.forEach(cell => {
                    // 序列化 cell 内容
                    let cellText = '';
                    cell.forEach(p => {
                        // 简单提取文本内容
                        cellText += serializeInlineContent(state, p);
                    });
                    cellText = cellText.trim() || ' ';
                    line += ' ' + cellText + ' |';
                    cellAligns.push(cell.attrs.align || null);
                });
                state.write(line);
                state.ensureNewLine();

                // 在第一行后添加分隔行
                if (isFirstRow) {
                    headerAligns = cellAligns;
                    let sepLine = '|';
                    for (const align of cellAligns) {
                        if (align === 'left') sepLine += ' :--- |';
                        else if (align === 'center') sepLine += ' :---: |';
                        else if (align === 'right') sepLine += ' ---: |';
                        else sepLine += ' --- |';
                    }
                    state.write(sepLine);
                    state.ensureNewLine();
                    isFirstRow = false;
                }
            });
            state.closeBlock(node);
        },
        table_row(state, node) {
            // 由 table 统一处理
        },
        table_cell(state, node) {
            // 由 table 统一处理
        },
        table_header(state, node) {
            // 由 table 统一处理
        },
        image(state, node) {
            const alt = state.esc(node.attrs.alt || '');
            const src = node.attrs.src;
            const title = node.attrs.title;
            state.write('![' + alt + '](' + src + (title ? ' "' + title.replace(/"/g, '\\"') + '"' : '') + ')');
        },
        hard_break(state, node, parent, index) {
            // 如果是段落末尾的 hard_break，不输出
            if (index === parent.childCount - 1) return;
            state.write('  \n');
        },
        math_inline(state, node) {
            state.write('$' + node.attrs.formula + '$');
        },
        math_display(state, node) {
            state.write('$$\n' + node.attrs.formula + '\n$$');
            state.closeBlock(node);
        },
        diagram(state, node) {
            const lang = node.attrs.language || 'mermaid';
            const source = (node.attrs.source || '').replace(/\n$/, '');
            state.write('```' + lang + '\n' + source + '\n```');
            state.closeBlock(node);
        },
        frontmatter(state, node) {
            state.write('---\n' + node.attrs.content + '---');
            state.closeBlock(node);
        },
        text(state, node) {
            state.text(node.text);
        },
    },
    // 标记序列化器
    {
        strong: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
        em: { open: '*', close: '*', mixable: true, expelEnclosingWhitespace: true },
        code: { open: '`', close: '`', escape: false },
        link: {
            open(_state, mark) { return '['; },
            close(_state, mark) {
                const title = mark.attrs.title ? ` "${mark.attrs.title.replace(/"/g, '\\"')}"` : '';
                return '](' + mark.attrs.href + title + ')';
            },
        },
        strikethrough: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
        colored_text: {
            open(_state, mark) { return `{color:${mark.attrs.color}}`; },
            close() { return '{/color}'; },
        },
        kbd: { open: '<kbd>', close: '</kbd>' },
        mark: { open: '<mark>', close: '</mark>' },
        subscript: { open: '<sub>', close: '</sub>' },
        superscript: { open: '<sup>', close: '</sup>' },
        underline: { open: '<ins>', close: '</ins>' },
    }
);

/**
 * 辅助函数：序列化 inline 内容为 markdown 字符串
 */
function serializeInlineContent(state, node) {
    let result = '';
    if (node.isText) {
        return node.text || '';
    }
    node.forEach(child => {
        if (child.isText) {
            let text = child.text || '';
            // 应用 marks
            child.marks.forEach(mark => {
                const markSpec = serializer.marks[mark.type.name];
                if (markSpec) {
                    const open = typeof markSpec.open === 'function' ? markSpec.open(state, mark) : markSpec.open;
                    const close = typeof markSpec.close === 'function' ? markSpec.close(state, mark) : markSpec.close;
                    text = open + text + close;
                }
            });
            result += text;
        } else if (child.type.name === 'image') {
            result += `![${child.attrs.alt || ''}](${child.attrs.src})`;
        } else if (child.type.name === 'hard_break') {
            result += '<br>';
        } else if (child.type.name === 'math_inline') {
            result += `$${child.attrs.formula}$`;
        }
    });
    return result;
}

/**
 * 解析 markdown 文本为 ProseMirror 文档
 * @param {string} markdown
 * @returns {import('prosemirror-model').Node}
 */
function parseMarkdown(markdown) {
    return parser.parse(markdown || '');
}

/**
 * 将 ProseMirror 文档序列化为 markdown 文本
 * @param {import('prosemirror-model').Node} doc
 * @returns {string}
 */
function serializeMarkdown(doc) {
    return serializer.serialize(doc);
}

export { parser, serializer, parseMarkdown, serializeMarkdown, schema };
