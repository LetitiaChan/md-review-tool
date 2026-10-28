/**
 * math.js — KaTeX 数学公式：占位符预处理、渲染与还原
 */

import { RenderContext as ctx } from './context.js';

const MATH_PLACEHOLDER_PREFIX = '%%MATH_EXPR_';
const MATH_PLACEHOLDER_SUFFIX = '%%';


/**
 * 预处理数学公式：将 $$...$$ 和 $...$ 替换为占位符
 * 避免 marked 将公式中的 _、*、\ 等特殊字符错误解析
 */
function preprocessMath(md) {
    // 注意：不再在此处清空 ctx.mathExpressions
    // 因为 renderBlocks 逐块调用 preprocessMath，清空会导致前面块的公式丢失
    // ctx.mathExpressions 的清空已移至 renderBlocks 开头统一执行
    let result = md;

    // 1. 先保护代码块（代码中的 $ 不应被当作公式）
    const codeBlocks = [];
    result = result.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
        const index = codeBlocks.length;
        codeBlocks.push(match);
        return `%%CODE_BLOCK_${index}%%`;
    });

    // 2. 处理块级公式 $$...$$（可跨行）
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        const index = ctx.mathExpressions.length;
        ctx.mathExpressions.push({ formula: formula.trim(), displayMode: true });
        return `\n\n${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}\n\n`;
    });

    // 3. 处理行内公式 $...$（不跨行，排除货币符号如 $100）
    result = result.replace(/(?<!\$|\\)\$(?!\$)(.+?)(?<!\$|\\)\$(?!\$)/g, (match, formula) => {
        // 排除货币金额（如 $100）
        if (/^\d/.test(formula.trim()) && /\d$/.test(formula.trim()) && !/[\\{}^_]/.test(formula)) {
            return match;
        }
        const index = ctx.mathExpressions.length;
        ctx.mathExpressions.push({ formula: formula.trim(), displayMode: false });
        return `${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}`;
    });

    // 4. 恢复代码块
    result = result.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => {
        return codeBlocks[parseInt(index)];
    });

    return result;
}

/**
 * 渲染数学公式（KaTeX）
 * 使用 TreeWalker 遍历 DOM，将占位符替换为 KaTeX 渲染结果
 */
function renderMath(root) {
    if (typeof katex === 'undefined') {
        // 按需加载 KaTeX 后重入
        const loader = globalThis.AssetLoader;
        if (loader && !loader.isLoaded('katex')) {
            loader.ensure('katex').then((ok) => { if (ok) renderMath(root); });
        }
        return;
    }
    if (ctx.mathExpressions.length === 0) return;

    const container = root || document.getElementById('documentContent');
    if (!container) return;

    // 使用 TreeWalker 遍历所有文本节点，查找占位符
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
        if (node.textContent.includes(MATH_PLACEHOLDER_PREFIX)) {
            textNodes.push(node);
        }
    }

    const placeholderRegex = new RegExp(
        MATH_PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '(\\d+)' +
        MATH_PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
    );

    for (const textNode of textNodes) {
        const text = textNode.textContent;
        const parts = [];
        let lastIndex = 0;
        let match;

        placeholderRegex.lastIndex = 0;
        while ((match = placeholderRegex.exec(text)) !== null) {
            // 占位符前的文本
            if (match.index > lastIndex) {
                parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const exprIndex = parseInt(match[1]);
            const expr = ctx.mathExpressions[exprIndex];

            if (expr) {
                try {
                    const rendered = document.createElement(expr.displayMode ? 'div' : 'span');
                    rendered.className = expr.displayMode ? 'katex-display' : 'katex-inline';
                    katex.render(expr.formula, rendered, {
                        displayMode: expr.displayMode,
                        throwOnError: false,
                        output: 'html'
                    });
                    parts.push(rendered);
                } catch (e) {
                    const errorSpan = document.createElement('span');
                    errorSpan.className = 'katex-error';
                    errorSpan.textContent = expr.displayMode ? `$$${expr.formula}$$` : `$${expr.formula}$`;
                    errorSpan.title = '公式渲染失败: ' + e.message;
                    parts.push(errorSpan);
                }
            } else {
                parts.push(document.createTextNode(match[0]));
            }

            lastIndex = match.index + match[0].length;
        }

        // 占位符后的剩余文本
        if (lastIndex < text.length) {
            parts.push(document.createTextNode(text.slice(lastIndex)));
        }

        // 替换原始文本节点
        if (parts.length > 0) {
            const fragment = document.createDocumentFragment();
            parts.forEach(p => fragment.appendChild(p));
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    }
}


/**
 * 将 DOM 中的数学公式占位符还原为原始公式文本（编辑模式专用）
 * 在编辑模式下，用户需要看到并编辑原始的 $...$ / $$...$$ 文本，而非占位符
 */
function restoreMathPlaceholders() {
    if (ctx.mathExpressions.length === 0) return;

    const container = document.getElementById('documentContent');
    if (!container) return;

    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
        if (node.textContent.includes(MATH_PLACEHOLDER_PREFIX)) {
            textNodes.push(node);
        }
    }

    const placeholderRegex = new RegExp(
        MATH_PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
        '(\\d+)' +
        MATH_PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
    );

    for (const textNode of textNodes) {
        const text = textNode.textContent;
        const restored = text.replace(placeholderRegex, (match, indexStr) => {
            const exprIndex = parseInt(indexStr);
            const expr = ctx.mathExpressions[exprIndex];
            if (expr) {
                return expr.displayMode ? `$$${expr.formula}$$` : `$${expr.formula}$`;
            }
            return match;
        });
        if (restored !== text) {
            textNode.textContent = restored;
        }
    }
}

export { preprocessMath, renderMath, restoreMathPlaceholders, MATH_PLACEHOLDER_PREFIX, MATH_PLACEHOLDER_SUFFIX };
