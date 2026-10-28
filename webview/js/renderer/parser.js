/**
 * parser.js — Markdown 分块与跨块定义（引用/脚注）提取
 */

import { RenderContext as ctx } from './context.js';

function parseMarkdown(markdown) {
    // 剥离 YAML frontmatter（.mdc 文件等带 --- 头的文件）
    let processedMarkdown = markdown;
    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    let frontmatterBlock = null;
    if (frontmatterMatch) {
        frontmatterBlock = frontmatterMatch[0].trimEnd();
        processedMarkdown = markdown.slice(frontmatterMatch[0].length);
    }

    const lines = processedMarkdown.split('\n');
    const blocks = [];
    let current = [];
    let inCodeBlock = false;
    let inHtmlBlock = false; // 追踪 <details> / <div> 等 HTML 块
    let htmlBlockTag = '';
    let htmlBlockDepth = 0; // 嵌套深度计数器（处理同名标签嵌套）
    let inList = false; // 追踪列表上下文（含 loose list 中的空行和缩进段落）
    let inListCodeBlock = false; // 追踪列表项内的代码块（缩进的 ```）
    let codeBlockFenceCount = 0; // 代码块开始围栏的反引号数量（用于匹配结束围栏）
    let listCodeBlockFenceCount = 0; // 列表内代码块开始围栏的反引号数量
    let inBlockquote = false; // 追踪引用块上下文（含引用块中的空行、列表、代码块等）
    let inFootnote = false; // 追踪脚注定义上下文（含多段落脚注中的空行和缩进续行）

    // 列表项起始检测：无序 (- / * / +) 或有序 (数字.)
    const listItemRegex = /^(\s*)([-*+]|\d+[.)]) /;
    // 列表续行：缩进内容（属于前一个列表项的后续段落）
    const listContinuationRegex = /^([ ]{2,}|\t)/;
    // 引用块中的列表项
    const blockquoteListRegex = /^>\s*([-*+]|\d+[.)]) /;
    // 引用块行检测：以 > 开头（含嵌套 >>、>>> 等）
    const blockquoteLineRegex = /^\s{0,3}>/
    // 脚注定义起始检测：[^id]: content
    const footnoteDefLineRegex = /^\s{0,3}\[\^([^\]\n]+)\]:\s*/;

    // 将 frontmatter 作为第一个块（使用专属标记，渲染时生成卡片式 UI）
    if (frontmatterBlock) {
        blocks.push('%%FRONTMATTER%%\n' + frontmatterBlock);
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 引用块行检测 — 在引用块上下文中，所有以 > 开头的行（含代码块围栏）都保留在同一块中
        if (inBlockquote) {
            if (blockquoteLineRegex.test(line)) {
                // 仍在引用块中，直接收集
                current.push(line);
                continue;
            } else if (line.trim() === '') {
                // 引用块后遇到空行 — 前瞻判断后续是否还有引用行
                let nextNonEmpty = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() !== '') {
                        nextNonEmpty = j;
                        break;
                    }
                }
                if (nextNonEmpty !== -1 && blockquoteLineRegex.test(lines[nextNonEmpty])) {
                    // 后续仍是引用块，保留空行不分割
                    current.push(line);
                } else {
                    // 引用块结束
                    if (current.length > 0) {
                        blocks.push(current.join('\n'));
                        current = [];
                    }
                    inBlockquote = false;
                }
                continue;
            } else {
                // 非引用行且非空行，引用块结束
                inBlockquote = false;
                // 先把之前的引用块分割出去
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                // 继续往下走，让后续逻辑处理当前行
            }
        }

        // 脚注定义续行检测 — 在脚注上下文中，缩进行（4-space/tab）保留在同一块中
        if (inFootnote && line.trim() !== '') {
            if (/^(?:[ ]{4}|\t)/.test(line)) {
                // 仍是脚注缩进续行，直接收集
                current.push(line);
                continue;
            } else {
                // 非缩进行，脚注定义结束
                inFootnote = false;
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                // 继续往下走，让后续逻辑处理当前行
            }
        }

        // 代码块围栏检测（仅在不处于 HTML 块内时才作为独立块分割）
        // 支持不同长度的反引号围栏（如 ``` vs ````），结束围栏的反引号数 ≥ 开始围栏
        const fenceMatch = !inHtmlBlock && line.trim().match(/^(`{3,})/);
        if (fenceMatch) {
            const fenceCount = fenceMatch[1].length;
            // 判断是否为列表项内的缩进代码块（行首有空白）
            const isIndentedFence = /^\s+`/.test(line);

            if (inListCodeBlock) {
                // 列表内代码块的结束围栏 — 仅当反引号数 ≥ 开始围栏且行内无其他非空白内容时才结束
                if (fenceCount >= listCodeBlockFenceCount && line.trim().match(/^`{3,}\s*$/)) {
                    current.push(line);
                    inListCodeBlock = false;
                    listCodeBlockFenceCount = 0;
                } else {
                    current.push(line);
                }
                continue;
            }

            if (inList && isIndentedFence) {
                // 列表项内的缩进代码块开始 — 保留在列表块中
                current.push(line);
                inListCodeBlock = true;
                listCodeBlockFenceCount = fenceCount;
                continue;
            }

            if (inCodeBlock) {
                // 结束围栏：反引号数 ≥ 开始围栏数量，且行内无其他非空白内容
                if (fenceCount >= codeBlockFenceCount && line.trim().match(/^`{3,}\s*$/)) {
                    current.push(line);
                    blocks.push(current.join('\n'));
                    current = [];
                    inCodeBlock = false;
                    codeBlockFenceCount = 0;
                    inList = false;
                } else {
                    // 反引号数不够或有其他内容（如 ```lua），视为代码块内的普通行
                    current.push(line);
                }
                continue;
            } else {
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                inCodeBlock = true;
                codeBlockFenceCount = fenceCount;
                inList = false;
                current.push(line);
                continue;
            }
        }

        if (inCodeBlock) {
            current.push(line);
            continue;
        }

        // 列表项内的代码块中的行 — 直接收集，不做分割判断
        if (inListCodeBlock) {
            current.push(line);
            continue;
        }

        // 追踪块级 HTML 标签（details / div 等） — 将整个开闭标签视为一个块（支持嵌套）
        if (!inHtmlBlock) {
            const htmlBlockMatch = /^\s*<(details|div)[\s>]/i.exec(line);
            if (htmlBlockMatch) {
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                inHtmlBlock = true;
                inList = false;
                htmlBlockTag = htmlBlockMatch[1].toLowerCase();
                htmlBlockDepth = 1;
                current.push(line);
                // 检查同一行内是否有额外的同名开标签和闭标签
                const openCount = (line.match(new RegExp(`<${htmlBlockTag}[\\s>]`, 'gi')) || []).length;
                const closeCount = (line.match(new RegExp(`</${htmlBlockTag}\\s*>`, 'gi')) || []).length;
                htmlBlockDepth = openCount - closeCount;
                if (htmlBlockDepth <= 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                    inHtmlBlock = false;
                    htmlBlockTag = '';
                    htmlBlockDepth = 0;
                }
                continue;
            }
        }

        if (inHtmlBlock) {
            current.push(line);
            // 统计当前行中同名标签的开闭数量
            const openCount = (line.match(new RegExp(`<${htmlBlockTag}[\\s>]`, 'gi')) || []).length;
            const closeCount = (line.match(new RegExp(`</${htmlBlockTag}\\s*>`, 'gi')) || []).length;
            htmlBlockDepth += openCount - closeCount;
            if (htmlBlockDepth <= 0) {
                blocks.push(current.join('\n'));
                current = [];
                inHtmlBlock = false;
                htmlBlockTag = '';
                htmlBlockDepth = 0;
            }
            continue;
        }

        if (line.trim() === '') {
            if (inFootnote) {
                // 在脚注定义上下文中遇到空行 — 前瞻判断后续是否还属于该脚注（4-space/tab 缩进续行）
                let nextNonEmpty = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() !== '') {
                        nextNonEmpty = j;
                        break;
                    }
                }
                if (nextNonEmpty !== -1 && /^(?:[ ]{4}|\t)/.test(lines[nextNonEmpty])) {
                    // 后续仍是脚注缩进续行，保留空行不分割
                    current.push(line);
                } else {
                    // 脚注定义结束
                    if (current.length > 0) {
                        blocks.push(current.join('\n'));
                        current = [];
                    }
                    inFootnote = false;
                }
            } else if (inList) {
                // 在列表上下文中遇到空行 — 先前瞻判断后续是否还属于该列表
                // 列表延续条件：下一个非空行是缩进内容（列表项的续段落）或新的列表项
                let nextNonEmpty = -1;
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() !== '') {
                        nextNonEmpty = j;
                        break;
                    }
                }
                if (nextNonEmpty !== -1 &&
                    (listContinuationRegex.test(lines[nextNonEmpty]) || listItemRegex.test(lines[nextNonEmpty]))) {
                    // 后续仍是列表内容，保留空行不分割
                    current.push(line);
                } else {
                    // 列表已结束
                    if (current.length > 0) {
                        blocks.push(current.join('\n'));
                        current = [];
                    }
                    inList = false;
                }
            } else {
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
            }
        } else {
            // 检测脚注定义开始
            if (!inList && !inBlockquote && !inFootnote && footnoteDefLineRegex.test(line)) {
                // 如果 current 中已有非脚注内容，先分割出去
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                inFootnote = true;
                current.push(line);
            // 检测引用块开始（不在列表上下文中时）
            } else if (!inList && !inBlockquote && blockquoteLineRegex.test(line)) {
                // 如果 current 中已有非引用内容，先分割出去
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                inBlockquote = true;
                inList = false;
                current.push(line);
            } else if (!inList && !inBlockquote && (listItemRegex.test(line) || blockquoteListRegex.test(line))) {
                // 检测列表开始（不在引用块上下文中时）
                // 如果 current 中已有非列表内容，先分割出去
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
                inList = true;
                current.push(line);
            } else {
                current.push(line);
            }
        }
    }
    if (current.length > 0) {
        blocks.push(current.join('\n'));
    }

    // 收集引用式链接定义（[id]: url "title"），跨块共享
    // 格式：[id]: URL 或 [id]: URL "title" 或 [id]: URL 'title' 或 [id]: URL (title)
    // 同时收集脚注定义 [^id]: content（包括后续 4-space 缩进行），交给 marked-footnote 处理
    const refLinkDefRegex = /^\s{0,3}\[([^\]]+)\]:\s+(.+?)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/;
    const footnoteDefStartRegex = /^\s{0,3}\[\^([^\]\n]+)\]:\s*/;
    ctx.refLinkDefs = [];
    ctx.footnoteDefs = [];
    // 保存脚注/引用式链接提取前的原始 blocks（编辑模式快照用）
    const rawBlocksCopy = blocks.map(b => b);
    for (let b = 0; b < blocks.length; b++) {
        const blockLines = blocks[b].split('\n');
        const remaining = [];
        let i = 0;
        while (i < blockLines.length) {
            const line = blockLines[i];
            if (footnoteDefStartRegex.test(line)) {
                // 脚注定义：收集当前行 + 后续 4-space/tab 缩进行（允许跨空行）
                const fnLines = [line];
                i++;
                while (i < blockLines.length) {
                    if (/^(?:[ ]{4}|\t)/.test(blockLines[i])) {
                        // 缩进续行，继续收集
                        fnLines.push(blockLines[i]);
                        i++;
                    } else if (blockLines[i].trim() === '') {
                        // 空行 — 前瞻判断后续是否还有缩进续行
                        let nextNonEmpty = -1;
                        for (let j = i + 1; j < blockLines.length; j++) {
                            if (blockLines[j].trim() !== '') {
                                nextNonEmpty = j;
                                break;
                            }
                        }
                        if (nextNonEmpty !== -1 && /^(?:[ ]{4}|\t)/.test(blockLines[nextNonEmpty])) {
                            // 后续仍有缩进续行，保留空行
                            fnLines.push(blockLines[i]);
                            i++;
                        } else {
                            // 脚注定义结束
                            break;
                        }
                    } else {
                        // 非缩进非空行，脚注定义结束
                        break;
                    }
                }
                ctx.footnoteDefs.push(fnLines.join('\n'));
            } else {
                const m = refLinkDefRegex.exec(line);
                if (m) {
                    ctx.refLinkDefs.push(line.trim());
                } else {
                    remaining.push(line);
                }
                i++;
            }
        }
        // 如果该块全是引用式链接/脚注定义，变为空块（后续会被跳过）
        const cleaned = remaining.join('\n').trim();
        blocks[b] = cleaned;
    }
    // 移除空块，同时保存对应的原始 block（含脚注/引用式链接定义，编辑模式快照用）
    // 空块（全是脚注/引用式链接定义）单独记录位置和内容，不合并到相邻块
    const finalBlocks = [];
    ctx.rawBlocksBeforeExtract = [];
    ctx.orphanedDefBlocks = []; // {insertBeforeIndex: number, rawText: string}
    ctx.inlineExtractedDefs = []; // 每个元素对应 finalBlocks[i] 中被提取的定义行
    let pendingOrphans = []; // 暂存被过滤掉的空块原始内容
    for (let b = 0; b < blocks.length; b++) {
        if (blocks[b].length > 0) {
            // 将之前暂存的空块记录为"插入到当前 finalBlock 索引之前"
            const currentFinalIndex = finalBlocks.length;
            for (const orphan of pendingOrphans) {
                ctx.orphanedDefBlocks.push({ insertBeforeIndex: currentFinalIndex, rawText: orphan });
            }
            pendingOrphans = [];
            finalBlocks.push(blocks[b]);
            ctx.rawBlocksBeforeExtract.push(rawBlocksCopy[b]);
            // 计算该非空块中被提取的定义行（rawBlocksCopy[b] 和 blocks[b] 的差异）
            // 注意：blocks[b] 经过 .trim() 处理，首尾行的空白可能被去掉，
            // 所以用 trimmed 行进行比较，避免因空白差异导致非定义行被错误提取
            const rawLines = rawBlocksCopy[b].split('\n');
            const cleanedLines = new Set(blocks[b].split('\n').map(l => l.trimEnd()));
            const extractedLines = rawLines.filter(line => !cleanedLines.has(line.trimEnd()));
            ctx.inlineExtractedDefs.push(extractedLines);
        } else {
            // 空块（全是脚注/引用式链接定义），暂存其原始内容
            pendingOrphans.push(rawBlocksCopy[b]);
        }
    }
    // 如果末尾还有暂存的空块，记录为"插入到最后一个 finalBlock 之后"
    for (const orphan of pendingOrphans) {
        ctx.orphanedDefBlocks.push({ insertBeforeIndex: finalBlocks.length, rawText: orphan });
    }

    return finalBlocks;
}

export { parseMarkdown };
