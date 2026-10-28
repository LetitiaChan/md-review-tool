/**
 * marked-setup.js — marked 渲染器配置、扩展、标题 slug 与代码高亮缓存
 */

import { RenderContext as ctx } from './context.js';
import { escapeHtml } from './utils.js';

/**
 * 生成文档内唯一的标题 slug。
 * 同名标题依次追加 -1、-2 ...，否则重复 id 会让 TOC 项和 #锚点永远定位到第一个标题。
 */
function uniqueHeadingSlug(base) {
    const root = base || 'section';
    let slug = root;
    let n = 1;
    while (Object.prototype.hasOwnProperty.call(ctx.slugCounts, slug)) {
        slug = root + '-' + n++;
    }
    ctx.slugCounts[slug] = true;
    return slug;
}

// ===== 代码高亮（带 LRU 缓存） =====
// highlightAuto 会尝试所有已注册语言，对大代码块非常慢；仅对小代码块启用。
const HIGHLIGHT_CACHE_MAX = 200;
const HIGHLIGHT_AUTO_MAX_LENGTH = 2048;

function getHighlightedCode(lang, code) {
    const cacheKey = (lang || '') + '\u0000' + code;
    const cached = ctx.highlightCache.get(cacheKey);
    if (cached !== undefined) {
        // LRU：命中后移到队尾
        ctx.highlightCache.delete(cacheKey);
        ctx.highlightCache.set(cacheKey, cached);
        return cached;
    }

    let highlighted = '';
    if (typeof hljs !== 'undefined') {
        if (lang && hljs.getLanguage(lang)) {
            try {
                highlighted = hljs.highlight(code, { language: lang }).value;
            } catch (e) { /* fallback */ }
        }
        if (!highlighted && code.length <= HIGHLIGHT_AUTO_MAX_LENGTH) {
            try {
                highlighted = hljs.highlightAuto(code).value;
            } catch (e) { /* fallback */ }
        }
    }

    // 修复代码块中下划线变量名被错误渲染的问题：
    // highlight.js 的 Markdown 语法将 _xxx_ 识别为 emphasis、__xxx__ 识别为 strong，
    // 导致 {file_count}、{cos_name} 等含下划线的变量名被错误解析（跨行匹配吞掉大量文本）。
    // highlight.js 输出 <span class="hljs-emphasis">...</span>（部分版本可能用 <em>/<strong>），
    // 后处理：用正则匹配完整标签对并去掉（保留内容文本），代码块中不应有 Markdown 格式化效果。
    if (highlighted) {
        // 检测是否存在"跨段 emphasis/strong"（内部含空行 \n\n）—— 这是一切误识别的根源信号。
        // 当出现时，同一代码块内其他结构化 hljs span（如 hljs-code 配对）也高概率错误，应一并清理。
        const hasRunawayEmphasis = /<span class="hljs-(emphasis|strong)">[\s\S]*?\n\n[\s\S]*?<\/span>/.test(highlighted);

        highlighted = highlighted
            .replace(/<span class="hljs-emphasis">([\s\S]*?)<\/span>/g, '$1')
            .replace(/<span class="hljs-strong">([\s\S]*?)<\/span>/g, '$1')
            .replace(/<em class="hljs-emphasis">([\s\S]*?)<\/em>/g, '$1')
            .replace(/<strong class="hljs-strong">([\s\S]*?)<\/strong>/g, '$1');
        // 修复 hljs-quote 跨行吞掉后续内容的问题：
        // 当 > 引用行中含未闭合的 _ 时，emphasis 跨行导致外层 hljs-quote 也跨行，
        // 去掉 emphasis 后 hljs-quote 仍包裹了后续段落（如 ### 标题）。
        // 检测 hljs-quote 内容是否跨越空行（\n\n），如果是则去掉 span 保留内容。
        highlighted = highlighted.replace(/<span class="hljs-quote">([\s\S]*?)<\/span>/g, function(match, inner) {
            return inner.includes('\n\n') ? inner : match;
        });
        // 修复 hljs-code 被 emphasis 错配导致跨越普通文字的问题：
        // 当 emphasis 跨段吞噬发生时，同代码块的 inline code 反引号配对也会错乱
        // （例如 `node_modules` 被拆散后，hljs 把下一段 `npm install` 的结尾反引号误认为闭合点，
        //  导致中间一大段正常文字被染上 hljs-code 颜色）。
        // 策略：hasRunawayEmphasis 为 true 时清除所有 hljs-code；否则仅清除跨行的 hljs-code。
        if (hasRunawayEmphasis) {
            highlighted = highlighted.replace(/<span class="hljs-code">([\s\S]*?)<\/span>/g, '$1');
        } else {
            highlighted = highlighted.replace(/<span class="hljs-code">([\s\S]*?)<\/span>/g, function(match, inner) {
                return inner.includes('\n') ? inner : match;
            });
        }
        // 修复被 emphasis/quote 吞掉的 markdown 结构失去高亮的问题：
        // 去掉错误的 span 后，被吞掉的 # 标题 / > 引用 / - 列表等变成了纯文本，
        // 丢失了本应有的 hljs-section/hljs-quote/hljs-bullet 高亮。
        // 对 markdown 语言的代码块，逐行重新识别裸的 markdown 结构并补上高亮标签。
        if (lang === 'markdown' || lang === 'md') {
            highlighted = highlighted.split('\n').map(function(line) {
                // 标题与列表：仅当整行不含任何 hljs span 时才补标（避免包裹已有结构）
                if (!/<span class="hljs-/.test(line)) {
                    var m = line.match(/^(#{1,6}\s.*)$/);
                    if (m) return '<span class="hljs-section">' + m[1] + '</span>';
                    m = line.match(/^(\s*)([-*+])(\s.*)$/);
                    if (m) return m[1] + '<span class="hljs-bullet">' + m[2] + '</span>' + m[3];
                }
                // 引用：&gt; 开头且尚未被 hljs-quote 包裹，则整行包裹为 quote
                // （即使行内已有其他 hljs span，如 hljs-code，仍应补 quote，因为 quote 可嵌套）
                if (/^&gt;\s/.test(line) && !/^<span class="hljs-quote">/.test(line)) {
                    return '<span class="hljs-quote">' + line + '</span>';
                }
                return line;
            }).join('\n');
        }
    }

    ctx.highlightCache.set(cacheKey, highlighted);
    if (ctx.highlightCache.size > HIGHLIGHT_CACHE_MAX) {
        // 删除最早插入的条目
        ctx.highlightCache.delete(ctx.highlightCache.keys().next().value);
    }
    return highlighted;
}


/**
 * 预处理 Markdown 文本（在 marked 解析前执行）
 * 处理 marked 不原生支持的语法扩展
 */
function preprocessMarkdown(md) {
    // 0. 统一换行符：去掉 \r，避免 \r\n 文件中 \r 残留导致解析异常
    md = md.replace(/\r/g, '');

    // 1. {color:xxx}text{/color} → <span style="color:xxx">text</span>
    md = md.replace(/\{color:([\w#]+(?:\([\d,.\s%]+\))?)\}([\s\S]*?)\{\/color\}/g,
        '<span style="color:$1">$2</span>');

    // 2. 多行引用硬换行：连续的 > 行在 Markdown 标准中会合并为一个段落，
    //    为保留用户书写的换行，在每行末尾追加两个空格（Markdown 硬换行语法）
    const lines = md.split('\n');
    const result = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
        // 当前行是引用行（> 后有实际内容），且下一行也是引用行（> 后有实际内容）
        if (/^(>{1,})\s+\S/.test(line) && nextLine !== null && /^(>{1,})\s+\S/.test(nextLine)) {
            // 提取当前行和下一行的引用层级（> 的数量）
            const curLevel = line.match(/^(>{1,})/)[1].length;
            const nextLevel = nextLine.match(/^(>{1,})/)[1].length;
            // 仅在同级引用行之间添加硬换行
            if (curLevel === nextLevel && !line.endsWith('  ')) {
                result.push(line + '  ');
                continue;
            }
        }
        result.push(line);
    }
    md = result.join('\n');

    // ==高亮文本== 和 定义列表已通过 marked 扩展处理，无需预处理
    // 脚注由 marked-footnote 库处理，无需预处理

    return md;
}

/**
 * 后处理已渲染的 HTML
 * 仅处理脚注（GitHub告警/任务列表/表格/图片已由自定义renderer处理）
 */
function postprocessHTML(html, rawBlock) {
    // marked-footnote 会在每个包含脚注引用的块中生成 <section class="footnotes">
    // 由于我们逐块渲染，脚注区域会重复出现，在此处移除
    // 最终脚注区域由 renderBlocks 末尾统一渲染
    html = html.replace(/<section class="footnotes"[\s\S]*?<\/section>\s*/g, '');
    return html;
}

/**
 * 配置 marked.js：自定义渲染器 + 扩展
 * 包括代码块(highlight.js + Mermaid + 行号 + diff着色 + 复制按钮)、
 * 表格(table-wrapper横向滚动)、blockquote(GitHub风格告警)、
 * link(外部链接新窗口)、image(span容器)、listitem(自定义checkbox)、
 * 定义列表扩展
 */
// marked 配置是否已完成（configureHighlight 幂等：重复调用会重复注册扩展，
// 实测 4000 块文档解析耗时从 70ms 涨到 376ms）

function configureHighlight() {
    if (typeof marked === 'undefined') return;
    if (ctx.highlightConfigured) return;
    ctx.highlightConfigured = true;

    const renderer = new marked.Renderer();

    // ===== 自定义代码块渲染 =====
    // 使用 <div class="code-block"> 而非 <pre> 作为容器，
    // 因为 <pre> 内不允许嵌套 <div>（code-header），浏览器会自动修复 DOM 导致样式失效
    renderer.code = function(data) {
        const code = data.text || '';
        const lang = (data.lang || '').trim().toLowerCase();

        // Mermaid 图表：使用 base64 编码存储源码，避免 HTML 转义破坏 mermaid 语法
        if (lang === 'mermaid') {
            const id = 'mermaid-' + (++ctx.mermaidCounter);
            const base64Code = btoa(unescape(encodeURIComponent(code)));
            return `<div class="mermaid-container" data-mermaid-id="${id}"><div class="mermaid-source-data" data-source="${base64Code}" style="display:none"></div><pre class="mermaid-source">${escapeHtml(code)}</pre></div>`;
        }

        // PlantUML 图表：延迟渲染（与 Mermaid/Graphviz 一致，只存储源码，由 renderPlantUML() 动态构建 <img>）
        if (lang === 'plantuml' || lang === 'puml') {
            const base64Code = btoa(unescape(encodeURIComponent(code)));
            return `<div class="plantuml-container"><div class="plantuml-source-data" data-source="${base64Code}" style="display:none"></div><pre class="plantuml-source">${escapeHtml(code)}</pre></div>`;
        }

        // Graphviz DOT 图表：使用 Viz.js 本地渲染
        if (lang === 'dot' || lang === 'graphviz') {
            const base64Code = btoa(unescape(encodeURIComponent(code)));
            return `<div class="graphviz-container"><div class="graphviz-source-data" data-source="${base64Code}" style="display:none"></div><pre class="graphviz-source">${escapeHtml(code)}</pre></div>`;
        }

        /**
         * 将高亮后的 HTML 按行包裹 <span class="code-line">
         * 支持 CSS counter 行号 + diff 语言整行背景色
         */
        function wrapLines(highlightedCode, language) {
            const lines = highlightedCode.split('\n');
            // 去除末尾空行
            while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
            const isDiff = language === 'diff';
            // 追踪跨行的未关闭 <span> 标签（hljs 高亮可能产生跨行 span，
            // 如 markdown 语言中 ```code``` 被包裹在 <span class="hljs-code"> 中）。
            // 每行结束时补上关闭标签，下一行开头重新打开，确保每个 code-line 内的 HTML 标签平衡。
            let openSpans = []; // 当前累积的未关闭 span 开标签
            return lines.map((line, i) => {
                let lineClass = 'code-line';
                if (isDiff) {
                    if (line.includes('hljs-addition')) {
                        lineClass += ' diff-addition';
                    } else if (line.includes('hljs-deletion')) {
                        lineClass += ' diff-deletion';
                    } else {
                        const plainText = line.replace(/<[^>]*>/g, '');
                        if (plainText.startsWith('+')) lineClass += ' diff-addition';
                        else if (plainText.startsWith('-')) lineClass += ' diff-deletion';
                    }
                }
                // 在行首重新打开上一行遗留的未关闭 span
                const reopenTags = openSpans.join('');
                // 扫描当前行的 <span ...> 和 </span>，更新 openSpans 栈
                const tagRegex = /<span[^>]*>|<\/span>/g;
                let match;
                while ((match = tagRegex.exec(line)) !== null) {
                    if (match[0].startsWith('</')) {
                        openSpans.pop();
                    } else {
                        openSpans.push(match[0]);
                    }
                }
                // 在行尾补上关闭标签
                const closeTags = '</span>'.repeat(openSpans.length);
                const content = (reopenTags + line) || ' ';
                return `<span class="${lineClass}" data-line="${i + 1}">${content}${closeTags}</span>`;
            }).join('\n');
        }

        const langLabel = lang || 'code';
        const highlighted = getHighlightedCode(lang, code);

        const codeContent = highlighted || escapeHtml(code);
        const hljsClass = highlighted ? ` hljs language-${langLabel}` : '';

        return `<div class="code-block" data-lang="${escapeHtml(lang)}"><div class="code-header"><span class="code-lang">${escapeHtml(langLabel)}</span><button class="code-copy-btn" title="${typeof t === 'function' ? t('notification.copy') : '📋 复制'}">${typeof t === 'function' ? t('renderer.copy_code') : '📋 复制'}</button></div><pre><code class="${hljsClass}">${wrapLines(codeContent, lang)}</code></pre></div>`;
    };

    // ===== 自定义标题渲染 — 生成 GitHub 风格的 slug id，支持中文锚点跳转 =====
    renderer.heading = function(data) {
        const text = this.parser.parseInline(data.tokens);
        const depth = data.depth;
        // 生成 slug：取纯文本 → 转小写 → 去除非字母数字中文字符 → 空格转连字符 → 去除首尾连字符
        const rawText = text.replace(/<[^>]*>/g, '').trim();
        const baseSlug = rawText
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/^-+|-+$/g, '');
        // 同名标题追加 -1 / -2，避免重复 id 导致 TOC 与 #锚点 永远只定位到第一个
        const slug = uniqueHeadingSlug(baseSlug);
        return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
    };

    // ===== 自定义链接渲染 — 外部链接新窗口打开，工作区文件链接特殊处理 =====
    renderer.link = function(data) {
        const href = data.href || '';
        const title = data.title;
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        const isExternal = href.startsWith('http://') || href.startsWith('https://');
        const isAnchor = href.startsWith('#');
        const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

        // 用 parseInline 渲染链接文本：既支持链接内的行内 Markdown（[**重要**](url)），
        // 也支持图片+文字（[![alt](img.png) caption](url)）——旧实现直接用 data.text
        // 会把 ** 原样输出，并丢掉图片后的文字
        let text;
        if (data.tokens && data.tokens.length > 0) {
            text = this.parser.parseInline(data.tokens);
        } else {
            text = escapeHtml(data.text || '');
        }

        // 工作区内文件链接：非外部、非锚点的链接视为相对文件路径
        if (!isExternal && !isAnchor && href) {
            return `<a href="${href}"${titleAttr} class="workspace-file-link" data-filepath="${escapeHtml(href)}" title="${escapeHtml(href)}">${text}</a>`;
        }

        return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
    };

    // ===== 自定义图片渲染 — 使用 <span> 替代 <figure> =====
    // <figure> 是块级元素，不能嵌套在 <p> 中，会导致浏览器 DOM 修复异常
    // 注意：失败兜底不能写成内联 onerror 属性，webview 的 CSP 禁止内联事件处理器，
    // 由 bindImageFallbacks() 在渲染完成后统一绑定
    renderer.image = function(data) {
        const href = data.href || '';
        const title = data.title;
        const text = data.text || '';
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        if (href && !/^(https?:\/\/|data:|vscode-)/i.test(href)) {
            try { ctx.collectedImagePaths.add(decodeURIComponent(href)); } catch (e) { ctx.collectedImagePaths.add(href); }
        }
        return `<span class="md-image-container"><img src="${href}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" class="md-image" />${text ? `<span class="md-image-caption" style="display:none">${escapeHtml(text)}</span>` : ''}</span>`;
    };

    // ===== 自定义表格渲染 — table-wrapper 支持横向滚动 =====
    // 使用 this.parser.parseInline(cell.tokens) 正确渲染单元格内容
    renderer.table = function(data) {
        const header = data.header;
        const rows = data.rows;
        let headerHtml = '<thead><tr>';
        header.forEach(cell => {
            const align = cell.align ? ` style="text-align:${cell.align}"` : '';
            const content = cell.tokens ? this.parser.parseInline(cell.tokens) : (cell.text || '');
            headerHtml += `<th${align}>${content}</th>`;
        });
        headerHtml += '</tr></thead>';

        let bodyHtml = '<tbody>';
        rows.forEach(row => {
            bodyHtml += '<tr>';
            row.forEach(cell => {
                const align = cell.align ? ` style="text-align:${cell.align}"` : '';
                const content = cell.tokens ? this.parser.parseInline(cell.tokens) : (cell.text || '');
                bodyHtml += `<td${align}>${content}</td>`;
            });
            bodyHtml += '</tr>';
        });
        bodyHtml += '</tbody>';

        return `<div class="table-wrapper"><table>${headerHtml}${bodyHtml}</table></div>`;
    };

    // ===== 自定义引用块渲染 — 支持 GitHub 风格告警 =====
    // 使用 this.parser.parse(data.tokens) 递归渲染子 token
    renderer.blockquote = function(data) {
        let inner = '';
        if (data.tokens) {
            inner = this.parser.parse(data.tokens);
        } else if (typeof data.text === 'string') {
            inner = data.text;
        }

        const alertTypes = {
            'NOTE':      { icon: 'ℹ️', label: (typeof t === 'function' ? t('renderer.alert_note') : 'Note'), cls: 'alert-note' },
            'TIP':       { icon: '💡', label: (typeof t === 'function' ? t('renderer.alert_tip') : 'Tip'), cls: 'alert-tip' },
            'IMPORTANT': { icon: '❗', label: (typeof t === 'function' ? t('renderer.alert_important') : 'Important'), cls: 'alert-important' },
            'WARNING':   { icon: '⚠️', label: (typeof t === 'function' ? t('renderer.alert_warning') : 'Warning'), cls: 'alert-warning' },
            'CAUTION':   { icon: '🔴', label: (typeof t === 'function' ? t('renderer.alert_caution') : 'Caution'), cls: 'alert-caution' }
        };

        // 在渲染后的 HTML 中匹配 [!TYPE] 语法
        const alertRegex = /^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
        const match = inner.match(alertRegex);

        if (match) {
            const type = match[1].toUpperCase();
            const info = alertTypes[type] || alertTypes['NOTE'];
            const content = inner.replace(alertRegex, '<p>');
            return `<div class="gh-alert ${info.cls}"><div class="gh-alert-title">${info.icon} ${info.label}</div><div class="gh-alert-content">${content}</div></div>`;
        }

        // 支持空白高亮块 > [!BLANK] — 无标题无图标的简洁高亮区块
        const blankRegex = /^\s*<p>\s*\[!BLANK\]\s*/i;
        const blankMatch = inner.match(blankRegex);
        if (blankMatch) {
            const content = inner.replace(blankRegex, '<p>');
            return `<div class="gh-alert alert-blank"><div class="gh-alert-content">${content}</div></div>`;
        }

        return `<blockquote>${inner}</blockquote>`;
    };

    // ===== 自定义列表项渲染 — 增强 checkbox 样式 =====
    // 使用 this.parser.parse(data.tokens) 渲染行内元素
    renderer.listitem = function(data) {
        let text = this.parser.parse(data.tokens);
        // parse() 会给文本包裹 <p>，对于非 loose 列表需要去掉
        if (!data.loose) {
            text = text.replace(/<p>([\s\S]*?)<\/p>\n?/g, '$1');
        }
        if (data.task) {
            const checkedClass = data.checked ? ' checked' : '';
            const checkedAttr = data.checked ? ' checked' : '';
            const checkIcon = data.checked
                ? '<svg class="task-check-icon" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>'
                : '';
            return `<li class="task-list-item${checkedClass}"><span class="task-checkbox${checkedClass}"><input type="checkbox"${checkedAttr} disabled />${checkIcon}</span><span class="task-text">${text}</span></li>`;
        }
        return `<li>${text}</li>`;
    };

    marked.setOptions({ renderer, gfm: true, breaks: true });

    // ===== 注册 marked-footnote 插件（处理 [^id] 引用和 [^id]: 定义） =====
    if (typeof markedFootnote !== 'undefined') {
        marked.use(markedFootnote({ prefixId: 'fn-', description: 'Footnotes' }));
    }

    // ===== 注册自定义扩展 =====
    marked.use({
        extensions: [
            // ==高亮文本== → <mark>高亮文本</mark>
            {
                name: 'highlight',
                level: 'inline',
                start(src) {
                    return src.indexOf('==');
                },
                tokenizer(src) {
                    const rule = /^==((?:[^=]|=[^=])+)==/;
                    const match = rule.exec(src);
                    if (match) {
                        return {
                            type: 'highlight',
                            raw: match[0],
                            text: match[1],
                            tokens: this.lexer.inlineTokens(match[1])
                        };
                    }
                },
                renderer(token) {
                    return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
                }
            },
            // ^上标^ → <sup>上标</sup>
            {
                name: 'superscript',
                level: 'inline',
                start(src) {
                    // 排除脚注引用 [^id] 中的 ^ — 只在非 [ 后面的 ^ 上触发
                    const idx = src.indexOf('^');
                    if (idx === -1) return -1;
                    // 如果 ^ 前面紧邻 [ 则跳过（已被 marked-footnote 处理）
                    if (idx > 0 && src[idx - 1] === '[') {
                        const nextIdx = src.indexOf('^', idx + 1);
                        return nextIdx === -1 ? -1 : nextIdx;
                    }
                    return idx;
                },
                tokenizer(src) {
                    // 匹配 ^content^，content 不含空格、^、换行，且长度合理（最多100字符）
                    const rule = /^\^([^\s\^\[\]\n]{1,100})\^/;
                    const match = rule.exec(src);
                    if (match) {
                        return {
                            type: 'superscript',
                            raw: match[0],
                            text: match[1],
                            tokens: this.lexer.inlineTokens(match[1])
                        };
                    }
                },
                renderer(token) {
                    return `<sup>${this.parser.parseInline(token.tokens)}</sup>`;
                }
            },
            // ~下标~ → <sub>下标</sub>
            {
                name: 'subscript',
                level: 'inline',
                start(src) {
                    // 查找单个 ~（排除 ~~ 删除线）
                    const match = src.match(/(?<![~])~(?!~)/);
                    return match ? match.index : -1;
                },
                tokenizer(src) {
                    // 匹配单个 ~content~，不匹配 ~~删除线~~
                    // 前后都不能紧邻另一个 ~
                    const rule = /^~(?!~)([^\s~][^~]*?)~(?!~)/;
                    const match = rule.exec(src);
                    if (match) {
                        return {
                            type: 'subscript',
                            raw: match[0],
                            text: match[1],
                            tokens: this.lexer.inlineTokens(match[1])
                        };
                    }
                },
                renderer(token) {
                    return `<sub>${this.parser.parseInline(token.tokens)}</sub>`;
                }
            },
            // ++下划线++ → <ins>下划线</ins>
            {
                name: 'underline',
                level: 'inline',
                start(src) {
                    return src.indexOf('++');
                },
                tokenizer(src) {
                    const rule = /^\+\+((?:[^+]|\+[^+])+)\+\+/;
                    const match = rule.exec(src);
                    if (match) {
                        return {
                            type: 'underline',
                            raw: match[0],
                            text: match[1],
                            tokens: this.lexer.inlineTokens(match[1])
                        };
                    }
                },
                renderer(token) {
                    return `<ins>${this.parser.parseInline(token.tokens)}</ins>`;
                }
            },
            // 定义列表（PHP Markdown Extra 风格）Term\n: Definition
            // 注意：不要提供 start(src)。block 扩展的 start 会在每个块起点
            // 拿到剩余全文，本项目的正则会一路扫描到文末，导致 marked 整体
            // 退化为 O(块数 × 文档长度)。tokenizer 本身是行首锚定的，足够。
            {
                name: 'deflist',
                level: 'block',
                tokenizer(src) {
                    const rule = /^(?:[^\n]+\n(?::[ \t]+[^\n]+(?:\n|$))+(?:\n|$)?)+/;
                    const match = rule.exec(src);
                    if (match) {
                        const raw = match[0];
                        const items = [];
                        const parts = raw.split(/\n(?=[^\n:])/).filter(Boolean);
                        for (const part of parts) {
                            const lines = part.split('\n').filter(Boolean);
                            if (lines.length >= 1) {
                                const dt = lines[0].trim();
                                const dds = [];
                                for (let i = 1; i < lines.length; i++) {
                                    const ddMatch = lines[i].match(/^:[ \t]+(.*)/);
                                    if (ddMatch) dds.push(ddMatch[1].trim());
                                }
                                if (dds.length > 0) {
                                    items.push({
                                        dt,
                                        dtTokens: this.lexer.inlineTokens(dt),
                                        dds: dds.map(dd => ({
                                            text: dd,
                                            tokens: this.lexer.inlineTokens(dd)
                                        }))
                                    });
                                }
                            }
                        }
                        if (items.length > 0) {
                            return { type: 'deflist', raw, items };
                        }
                    }
                },
                renderer(token) {
                    let html = '<dl>\n';
                    for (const item of token.items) {
                        html += `<dt>${this.parser.parseInline(item.dtTokens)}</dt>\n`;
                        for (const dd of item.dds) {
                            html += `<dd>${this.parser.parseInline(dd.tokens)}</dd>\n`;
                        }
                    }
                    html += '</dl>\n';
                    return html;
                }
            },
            // :emoji_name: → GitHub 风格 Emoji（Unicode）
            {
                name: 'emoji',
                level: 'inline',
                start(src) {
                    return src.indexOf(':');
                },
                tokenizer(src) {
                    // 匹配 :emoji_name: 格式，名称由字母、数字、下划线、加号、减号组成
                    const rule = /^:([a-zA-Z0-9_+\-]+):/;
                    const match = rule.exec(src);
                    if (match && typeof EMOJI_MAP !== 'undefined' && EMOJI_MAP[match[1]]) {
                        return {
                            type: 'emoji',
                            raw: match[0],
                            name: match[1],
                            emoji: EMOJI_MAP[match[1]]
                        };
                    }
                },
                renderer(token) {
                    return `<span class="emoji" title=":${token.name}:">${token.emoji}</span>`;
                }
            }
        ]
    });
}

export { uniqueHeadingSlug, getHighlightedCode, preprocessMarkdown, postprocessHTML, configureHighlight };
