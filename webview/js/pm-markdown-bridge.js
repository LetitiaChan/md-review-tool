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
import { MarkdownParser, MarkdownSerializer, MarkdownSerializerState } from 'prosemirror-markdown';
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

/**
 * Task List 插件：识别 list_item 中以 [ ] 或 [x]/[X] 开头的内容，
 * 在 list_item_open token 上设置 meta.checked 属性，并从 inline 内容中移除前缀。
 * 这样 MarkdownParser 的 getAttrs 就能正确读取 checked 状态。
 */
function taskListPlugin(md) {
    md.core.ruler.after('inline', 'task_list', function (state) {
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type !== 'list_item_open') continue;
            // 找到 list_item_open 后面的第一个 inline token（通常在 paragraph_open 之后）
            let j = i + 1;
            while (j < tokens.length && tokens[j].type !== 'list_item_close') {
                if (tokens[j].type === 'inline') {
                    const content = tokens[j].content;
                    // 匹配 [ ] 或 [x]/[X] 开头
                    const taskMatch = content.match(/^\[([ xX])\]\s?/);
                    if (taskMatch) {
                        const checked = taskMatch[1] !== ' ';
                        // 在 list_item_open 上设置 meta
                        if (!tokens[i].meta) tokens[i].meta = {};
                        tokens[i].meta.checked = checked;
                        // 从 inline 内容中移除 [ ] / [x] 前缀
                        tokens[j].content = content.slice(taskMatch[0].length);
                        // 同时更新 children（如果已经生成）
                        if (tokens[j].children && tokens[j].children.length > 0) {
                            const firstChild = tokens[j].children[0];
                            if (firstChild.type === 'text') {
                                firstChild.content = firstChild.content.slice(taskMatch[0].length);
                                if (firstChild.content === '') {
                                    tokens[j].children.shift();
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
 * 脚注插件：识别 [^id] 引用与 [^id]: 定义。
 * 不识别的话，CommonMark 会把定义当成链接引用定义，往返后变成 [^id](内容)。
 */
function footnotePlugin(md) {
    md.block.ruler.before('reference', 'footnote_def', function (state, startLine, endLine, silent) {
        const lineStart = state.bMarks[startLine] + state.tShift[startLine];
        const lineEnd = state.eMarks[startLine];
        const line = state.src.slice(lineStart, lineEnd);
        const match = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/.exec(line);
        if (!match) return false;
        if (silent) return true;

        const contentLines = [match[2]];
        let nextLine = startLine + 1;
        while (nextLine < endLine) {
            const s = state.bMarks[nextLine] + state.tShift[nextLine];
            const e = state.eMarks[nextLine];
            const l = state.src.slice(s, e);
            // 4 空格 / Tab 缩进的续行属于该脚注
            if (/^(?: {4}|\t)/.test(l)) {
                contentLines.push(l.replace(/^(?: {4}|\t)/, ''));
                nextLine++;
            } else {
                break;
            }
        }

        const content = contentLines.join('\n');
        const token = state.push('footnote_def', '', 0);
        token.meta = { id: match[1], content };
        token.content = content;
        token.block = true;
        token.map = [startLine, nextLine];
        state.line = nextLine;
        return true;
    });

    md.inline.ruler.before('link', 'footnote_ref', function (state, silent) {
        const start = state.pos;
        if (state.src.charCodeAt(start) !== 0x5B /* [ */) return false;
        if (state.src.charCodeAt(start + 1) !== 0x5E /* ^ */) return false;
        const match = /^\[\^([^\]\n]+)\]/.exec(state.src.slice(start));
        if (!match) return false;
        if (!silent) {
            const token = state.push('footnote_ref', '', 0);
            token.meta = { id: match[1] };
            token.markup = match[0];
        }
        state.pos = start + match[0].length;
        return true;
    });
}

/**
 * 下标插件：识别 ~text~（单个波浪线），输出 subscript mark。
 * 双波浪线 ~~text~~ 交给 strikethrough 处理。
 */
function subscriptPlugin(md) {
    md.inline.ruler.before('strikethrough', 'subscript', function (state, silent) {
        const start = state.pos;
        if (state.src.charCodeAt(start) !== 0x7E /* ~ */) return false;
        if (state.src.charCodeAt(start + 1) === 0x7E) return false; // ~~删除线
        const match = /^~([^~\n]+)~/.exec(state.src.slice(start));
        if (!match) return false;
        if (match[1].trim() === '') return false;
        if (!silent) {
            state.push('subscript_open', 'sub', 1).markup = '~';
            const text = state.push('text', '', 0);
            text.content = match[1];
            state.push('subscript_close', 'sub', -1).markup = '~';
        }
        state.pos = start + match[0].length;
        return true;
    });
}

// 注册插件
md.use(frontmatterPlugin);
md.use(mathPlugin);
md.use(ghAlertPlugin);
md.use(coloredTextPlugin);
md.use(diagramPlugin);
md.use(htmlTagConverterPlugin);
md.use(taskListPlugin);
md.use(footnotePlugin);
md.use(subscriptPlugin);

// ===== 辅助函数：检测列表是否为 tight =====
function listIsTight(tokens, i) {
    while (++i < tokens.length)
        if (tokens[i].type !== 'list_item_open') return tokens[i].hidden;
    return false;
}

// ===== MarkdownParser 配置 =====
const parser = new MarkdownParser(schema, md, {
    blockquote: { block: 'blockquote' },
    paragraph: { block: 'paragraph' },
    list_item: { block: 'list_item', getAttrs: tok => ({ checked: tok.meta && tok.meta.checked !== undefined ? tok.meta.checked : null }) },
    bullet_list: { block: 'bullet_list', getAttrs: (_, tokens, i) => ({ tight: listIsTight(tokens, i) }) },
    ordered_list: { block: 'ordered_list', getAttrs: (tok, tokens, i) => ({ start: +tok.attrGet('start') || 1, tight: listIsTight(tokens, i) }) },
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
    // 注意：html_inline 和 html_block 都是独立 token（无 _open/_close 后缀），必须加 noCloseToken: true
    html_inline: { ignore: true, noCloseToken: true },
    html_block: { ignore: true, noCloseToken: true },
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
    footnote_def: { node: 'footnote_def', getAttrs: tok => ({
        id: tok.meta?.id || '',
        content: tok.content || '',
    }) },
    footnote_ref: { node: 'footnote_ref', getAttrs: tok => ({ id: tok.meta?.id || '' }) },
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
            // 传入 false：heading 行以 # 开头，内容不在行首，
            // 避免 esc() 误将 "0. " 等模式转义为 "0\. "
            state.renderInline(node, false);
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
            // 逐行逐格渲染：单元格内容是 inline*，必须走真正的 renderInline，
            // 否则链接、加粗、行内代码、图片、公式都会退化成纯文本（静默丢格式）。
            let rowIndex = 0;
            node.forEach((row) => {
                const cells = [];
                row.forEach((cell) => {
                    cells.push({
                        text: serializeTableCell(cell),
                        align: cell.attrs.align || null,
                    });
                });

                state.write('|' + cells.map(c => ' ' + c.text + ' |').join(''));
                state.ensureNewLine();

                // 第一行后写分隔行
                if (rowIndex === 0) {
                    const sep = cells.map((c) => {
                        if (c.align === 'left') return ' :--- |';
                        if (c.align === 'center') return ' :---: |';
                        if (c.align === 'right') return ' ---: |';
                        return ' --- |';
                    }).join('');
                    state.write('|' + sep);
                    state.ensureNewLine();
                }
                rowIndex++;
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
        footnote_def(state, node) {
            const content = (node.attrs.content || '')
                .split('\n')
                .map((line, i) => i === 0 ? line : '    ' + line)
                .join('\n');
            state.write(`[^${node.attrs.id}]: ${content}`);
            state.closeBlock(node);
        },
        footnote_ref(state, node) {
            state.write(`[^${node.attrs.id}]`);
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
        subscript: { open: '~', close: '~' },
        superscript: { open: '<sup>', close: '</sup>' },
        underline: { open: '<ins>', close: '</ins>' },
    }
);

/**
 * 表格单元格渲染为单行 markdown。
 * 单元格内容是 inline*，用独立的 serializer state 走 renderInline，
 * 这样链接、加粗、行内代码、图片、公式都不会丢失。
 */
function serializeTableCell(cell) {
    const sub = new MarkdownSerializerState(serializer.nodes, serializer.marks, {});
    sub.renderInline(cell);
    let text = sub.out.trim();
    if (!text) return ' ';
    // 表格单元格内不允许裸换行
    text = text.replace(/\s*\n\s*/g, '<br>');
    // 未转义的竖线会破坏列结构（跳过已转义的 \|）
    text = text.replace(/(^|[^\\])\|/g, '$1\\|');
    return text;
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
