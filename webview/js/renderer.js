/**
 * renderer.js - Markdown 渲染模块（VSCode 插件版）
 * 将 Markdown 解析为带有块级索引的 HTML，支持批注高亮
 * 图片路径通过 Extension Host 转换为 webviewUri
 * 
 * 扩展渲染支持：
 *   - ==高亮文本==
 *   - 任务列表 (- [x] / - [ ])
 *   - GitHub 风格告警块 (> [!NOTE] 等)
 *   - 代码块行号（根据设置控制）
 *   - 脚注 ([^1])
 *   - 定义列表 (Term\n: Definition)
 *   - 折叠内容区域 (<details>)
 *   - 文本颜色标记 {color:red}text{/color}
 *   - 引用式链接 [text][ref]
 *   - 表格头样式加强
 *   - 图片居中与标题
 *   - Mermaid / KaTeX
 *   - GitHub 风格 Emoji (:emoji_name:)
 */
const Renderer = (() => {

    // 缓存图片 URI 映射
    let _imageUriCache = {};
    // Mermaid 图表唯一 ID 计数器
    let _mermaidCounter = 0;
    // Mermaid 是否已初始化
    let _mermaidInitialized = false;

    // 数学公式占位符机制
    const MATH_PLACEHOLDER_PREFIX = '%%MATH_EXPR_';
    const MATH_PLACEHOLDER_SUFFIX = '%%';
    let _mathExpressions = [];

    // 引用式链接定义收集（跨块共享）
    let _refLinkDefs = [];
    // 脚注定义原始行收集（跨块共享，注入每个块以支持 marked-footnote 跨块解析）
    let _footnoteDefs = [];
    // 编辑模式快照用：保存脚注/引用式链接提取前的原始 blocks（含脚注定义行）
    let _rawBlocksBeforeExtract = [];
    // 编辑模式快照用：保存被过滤掉的空块（全是脚注/引用式链接定义）的位置和原始内容
    let _orphanedDefBlocks = []; // {insertBeforeIndex: number, rawText: string}
    // 编辑模式快照用：每个非空 block 中被提取的定义行（引用式链接/脚注）
    let _inlineExtractedDefs = []; // 每个元素是字符串数组，对应 finalBlocks[i] 中被提取的定义行

    // ===== HTML 转义辅助 =====
    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

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

        // 将 frontmatter 作为第一个块（以代码块样式保留展示）
        if (frontmatterBlock) {
            blocks.push('```yaml\n' + frontmatterBlock + '\n```');
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
            if (line.trim().startsWith('```') && !inHtmlBlock) {
                // 判断是否为列表项内的缩进代码块（行首有空白）
                const isIndentedFence = /^\s+```/.test(line);

                if (inListCodeBlock) {
                    // 列表内代码块的结束围栏
                    current.push(line);
                    inListCodeBlock = false;
                    continue;
                }

                if (inList && isIndentedFence) {
                    // 列表项内的缩进代码块开始 — 保留在列表块中
                    current.push(line);
                    inListCodeBlock = true;
                    continue;
                }

                if (inCodeBlock) {
                    current.push(line);
                    blocks.push(current.join('\n'));
                    current = [];
                    inCodeBlock = false;
                    inList = false;
                    continue;
                } else {
                    if (current.length > 0) {
                        blocks.push(current.join('\n'));
                        current = [];
                    }
                    inCodeBlock = true;
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
        _refLinkDefs = [];
        _footnoteDefs = [];
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
                    _footnoteDefs.push(fnLines.join('\n'));
                } else {
                    const m = refLinkDefRegex.exec(line);
                    if (m) {
                        _refLinkDefs.push(line.trim());
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
        _rawBlocksBeforeExtract = [];
        _orphanedDefBlocks = []; // {insertBeforeIndex: number, rawText: string}
        _inlineExtractedDefs = []; // 每个元素对应 finalBlocks[i] 中被提取的定义行
        let pendingOrphans = []; // 暂存被过滤掉的空块原始内容
        for (let b = 0; b < blocks.length; b++) {
            if (blocks[b].length > 0) {
                // 将之前暂存的空块记录为"插入到当前 finalBlock 索引之前"
                const currentFinalIndex = finalBlocks.length;
                for (const orphan of pendingOrphans) {
                    _orphanedDefBlocks.push({ insertBeforeIndex: currentFinalIndex, rawText: orphan });
                }
                pendingOrphans = [];
                finalBlocks.push(blocks[b]);
                _rawBlocksBeforeExtract.push(rawBlocksCopy[b]);
                // 计算该非空块中被提取的定义行（rawBlocksCopy[b] 和 blocks[b] 的差异）
                // 注意：blocks[b] 经过 .trim() 处理，首尾行的空白可能被去掉，
                // 所以用 trimmed 行进行比较，避免因空白差异导致非定义行被错误提取
                const rawLines = rawBlocksCopy[b].split('\n');
                const cleanedLines = new Set(blocks[b].split('\n').map(l => l.trimEnd()));
                const extractedLines = rawLines.filter(line => !cleanedLines.has(line.trimEnd()));
                _inlineExtractedDefs.push(extractedLines);
            } else {
                // 空块（全是脚注/引用式链接定义），暂存其原始内容
                pendingOrphans.push(rawBlocksCopy[b]);
            }
        }
        // 如果末尾还有暂存的空块，记录为"插入到最后一个 finalBlock 之后"
        for (const orphan of pendingOrphans) {
            _orphanedDefBlocks.push({ insertBeforeIndex: finalBlocks.length, rawText: orphan });
        }

        return finalBlocks;
    }

    /**
     * 预处理数学公式：将 $$...$$ 和 $...$ 替换为占位符
     * 避免 marked 将公式中的 _、*、\ 等特殊字符错误解析
     */
    function preprocessMath(md) {
        // 注意：不再在此处清空 _mathExpressions
        // 因为 renderBlocks 逐块调用 preprocessMath，清空会导致前面块的公式丢失
        // _mathExpressions 的清空已移至 renderBlocks 开头统一执行
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
            const index = _mathExpressions.length;
            _mathExpressions.push({ formula: formula.trim(), displayMode: true });
            return `\n\n${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}\n\n`;
        });

        // 3. 处理行内公式 $...$（不跨行，排除货币符号如 $100）
        result = result.replace(/(?<!\$|\\)\$(?!\$)(.+?)(?<!\$|\\)\$(?!\$)/g, (match, formula) => {
            // 排除货币金额（如 $100）
            if (/^\d/.test(formula.trim()) && /\d$/.test(formula.trim()) && !/[\\{}^_]/.test(formula)) {
                return match;
            }
            const index = _mathExpressions.length;
            _mathExpressions.push({ formula: formula.trim(), displayMode: false });
            return `${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}`;
        });

        // 4. 恢复代码块
        result = result.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => {
            return codeBlocks[parseInt(index)];
        });

        return result;
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
    function configureHighlight() {
        if (typeof marked === 'undefined') return;

        const renderer = new marked.Renderer();

        // ===== 自定义代码块渲染 =====
        // 使用 <div class="code-block"> 而非 <pre> 作为容器，
        // 因为 <pre> 内不允许嵌套 <div>（code-header），浏览器会自动修复 DOM 导致样式失效
        renderer.code = function(data) {
            const code = data.text || '';
            const lang = (data.lang || '').trim().toLowerCase();

            // Mermaid 图表：使用 base64 编码存储源码，避免 HTML 转义破坏 mermaid 语法
            if (lang === 'mermaid') {
                const id = 'mermaid-' + (++_mermaidCounter);
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
                    return `<span class="${lineClass}" data-line="${i + 1}">${line || ' '}</span>`;
                }).join('\n');
            }

            let highlighted = '';
            const langLabel = lang || 'code';

            if (typeof hljs !== 'undefined') {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        highlighted = hljs.highlight(code, { language: lang }).value;
                    } catch (e) { /* fallback */ }
                }
                if (!highlighted) {
                    try {
                        highlighted = hljs.highlightAuto(code).value;
                    } catch (e) { /* fallback */ }
                }
            }

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
            const slug = rawText
                .toLowerCase()
                .replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/^-+|-+$/g, '');
            return `<h${depth} id="${slug}">${text}</h${depth}>\n`;
        };

        // ===== 自定义链接渲染 — 外部链接新窗口打开 =====
        renderer.link = function(data) {
            const href = data.href || '';
            const title = data.title;
            let text = data.text || '';
            const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
            const isExternal = href.startsWith('http://') || href.startsWith('https://');
            const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

            // 处理链接内嵌套图片 [![alt](img)](link)
            if (data.tokens && data.tokens.length > 0 && data.tokens[0].type === 'image') {
                const img = data.tokens[0];
                const imgTitle = img.title ? ` title="${escapeHtml(img.title)}"` : '';
                text = `<img src="${img.href}" alt="${escapeHtml(img.text)}"${imgTitle} loading="lazy" class="md-image" />`;
            }

            return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
        };

        // ===== 自定义图片渲染 — 使用 <span> 替代 <figure> =====
        // <figure> 是块级元素，不能嵌套在 <p> 中，会导致浏览器 DOM 修复异常
        renderer.image = function(data) {
            const href = data.href || '';
            const title = data.title;
            const text = data.text || '';
            const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
            const safeAlt = escapeHtml(text).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const errorHandler = `this.onerror=null;this.style.display='none';` +
                `var p=document.createElement('div');` +
                `p.className='img-placeholder';` +
                `p.innerHTML='🖼️ 图片加载失败: ${safeAlt}';` +
                `this.parentNode.insertBefore(p,this);` +
                `var cap=this.parentNode.querySelector('.md-image-caption');if(cap)cap.style.display='';`;
            return `<span class="md-image-container"><img src="${href}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" class="md-image" onerror="${errorHandler}" />${text ? `<span class="md-image-caption" style="display:none">${escapeHtml(text)}</span>` : ''}</span>`;
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

        marked.setOptions({ renderer, gfm: true, breaks: false });

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
                {
                    name: 'deflist',
                    level: 'block',
                    start(src) {
                        const match = src.match(/^[^\n]+\n(?=:[ \t])/m);
                        return match ? match.index : undefined;
                    },
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

    function renderBlocks(blocks, annotations) {
        const container = document.getElementById('documentContent');
        container.innerHTML = '';

        // 统一清空数学公式缓存，后续逐块 preprocessMath 会累积填充
        _mathExpressions = [];

        // 建立脚注标签 → 全局序号的映射（按定义顺序编号 1, 2, 3, ...）
        const fnLabelToGlobalIndex = {};
        if (_footnoteDefs.length > 0) {
            const fnLabelRegex = /^\s{0,3}\[\^([^\]\n]+)\]:/;
            let globalIdx = 1;
            for (const def of _footnoteDefs) {
                const m = fnLabelRegex.exec(def);
                if (m) {
                    fnLabelToGlobalIndex[encodeURIComponent(m[1])] = globalIdx++;
                }
            }
        }

        blocks.forEach((block, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'md-block';
            wrapper.dataset.blockIndex = index;

            // 预处理 → 数学公式占位 → marked 解析 → 后处理
            let preprocessed = preprocessMarkdown(block);
            preprocessed = preprocessMath(preprocessed);
            // 注入引用式链接定义，使 marked 能跨块解析 [text][ref] 语法
            if (_refLinkDefs.length > 0) {
                preprocessed = preprocessed + '\n\n' + _refLinkDefs.join('\n');
            }
            // 注入脚注定义，使 marked-footnote 能跨块解析 [^id] 引用
            if (_footnoteDefs.length > 0) {
                preprocessed = preprocessed + '\n\n' + _footnoteDefs.join('\n\n');
            }
            let html = marked.parse(preprocessed);
            html = postprocessHTML(html, block);
            // 修正脚注引用的上标序号为全局序号
            if (Object.keys(fnLabelToGlobalIndex).length > 0) {
                html = html.replace(
                    /<sup><a\s+id="fn-ref-([^"]+)"\s+href="#fn-([^"]+)"\s+data-fn-ref\s+aria-describedby="fn-label">\d+<\/a><\/sup>/g,
                    (match, refLabel, hrefLabel) => {
                        const globalNum = fnLabelToGlobalIndex[hrefLabel];
                        if (globalNum !== undefined) {
                            return match.replace(/>\d+<\/a><\/sup>$/, `>${globalNum}</a></sup>`);
                        }
                        return match;
                    }
                );
            }
            html = rewriteImagePaths(html);

            const blockAnnotations = annotations.filter(a => a.blockIndex === index);
            const crossBlockAnnotations = annotations.filter(a => {
                if (a.blockIndex === index) return false;
                if (a.type === 'insert') return false;
                if (!a.selectedText) return false;

                if (a.endBlockIndex !== undefined && a.endBlockIndex !== null) {
                    return index >= a.blockIndex && index <= a.endBlockIndex;
                }

                const normSelected = a.selectedText.replace(/\s+/g, ' ').trim();
                const normBlock = block.replace(/\s+/g, ' ').trim();
                if (!normBlock || normBlock.length < 4) return false;
                return normSelected.includes(normBlock);
            });

            const allAnnotations = [...blockAnnotations, ...crossBlockAnnotations];
            if (allAnnotations.length > 0) {
                html = applyHighlights(html, block, allAnnotations);
            }

            wrapper.innerHTML = html;
            container.appendChild(wrapper);
        });

        // 所有块渲染完成后，统一在文档末尾渲染脚注区域
        // 用 marked-footnote 对所有脚注引用+定义做一次完整解析
        if (_footnoteDefs.length > 0) {
            // 构造包含虚拟引用和所有脚注定义的 Markdown，让 marked-footnote 生成完整脚注 section
            // 提取所有脚注标签
            const fnLabels = [];
            const fnLabelRegex = /^\s{0,3}\[\^([^\]\n]+)\]:/;
            for (const def of _footnoteDefs) {
                const m = fnLabelRegex.exec(def);
                if (m) fnLabels.push(m[1]);
            }
            if (fnLabels.length > 0) {
                const dummyRefs = fnLabels.map(id => `[^${id}]`).join(' ');
                const fullFootnoteMd = dummyRefs + '\n\n' + _footnoteDefs.join('\n\n');
                let fnHtml = marked.parse(fullFootnoteMd);
                // 提取 <section class="footnotes" ...>...</section>
                const sectionMatch = fnHtml.match(/<section class="footnotes"[\s\S]*?<\/section>/);
                if (sectionMatch) {
                    const fnWrapper = document.createElement('div');
                    fnWrapper.className = 'md-block footnotes-block';
                    fnWrapper.innerHTML = sectionMatch[0];
                    container.appendChild(fnWrapper);
                }
            }
        }
    }

    function applyHighlights(html, rawBlock, annotations) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const sortedAnnotations = [...annotations].sort((a, b) => {
            if (a.type === 'insert' && b.type !== 'insert') return 1;
            if (a.type !== 'insert' && b.type === 'insert') return -1;
            return (b.startOffset || 0) - (a.startOffset || 0);
        });

        for (const ann of sortedAnnotations) {
            if (ann.type === 'insert') {
                applyInsertHighlight(temp, rawBlock, ann);
            } else {
                applyTextHighlight(temp, ann);
            }
        }

        return temp.innerHTML;
    }

    function applyTextHighlight(container, annotation) {
        const searchText = annotation.selectedText;
        if (!searchText) return;

        if (trySingleNodeHighlight(container, annotation, searchText)) return;
        if (tryCrossNodeHighlight(container, annotation, searchText)) return;
        if (tryPartialBlockHighlight(container, annotation, searchText)) return;

        console.warn(`[renderer] 高亮匹配失败，使用 fallback 标记: ann#${annotation.id}`);
        applyFallbackMarker(container, annotation);
    }

    function trySingleNodeHighlight(container, annotation, searchText) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) { textNodes.push(walker.currentNode); }

        // 先收集所有匹配候选（同一块中可能有多个相同文本）
        const candidates = [];
        let globalOffset = 0;
        for (const textNode of textNodes) {
            const content = textNode.textContent;
            let searchFrom = 0;
            while (true) {
                const idx = content.indexOf(searchText, searchFrom);
                if (idx === -1) break;
                candidates.push({ textNode, idx, globalOffset: globalOffset + idx });
                searchFrom = idx + 1;
            }
            globalOffset += content.length;
        }

        if (candidates.length === 0) return false;

        // 选择最佳匹配：如果有 startOffset 且存在多个候选，选距离 startOffset 最近的
        let best = candidates[0];
        if (candidates.length > 1 && annotation.startOffset != null) {
            let minDist = Infinity;
            for (const c of candidates) {
                const dist = Math.abs(c.globalOffset - annotation.startOffset);
                if (dist < minDist) { minDist = dist; best = c; }
            }
        }

        const textNode = best.textNode;
        const idx = best.idx;
        const before = textNode.textContent.substring(0, idx);
        const match = textNode.textContent.substring(idx, idx + searchText.length);
        const after = textNode.textContent.substring(idx + searchText.length);

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));

        const span = document.createElement('span');
        span.className = annotation.type === 'delete' ? 'highlight-delete' : 'highlight-comment';
        span.dataset.annotationId = annotation.id;
        span.textContent = match;

        const indicator = document.createElement('span');
        indicator.className = 'annotation-indicator';
        indicator.textContent = annotation.id;
        indicator.dataset.annotationId = annotation.id;
        span.appendChild(indicator);

        frag.appendChild(span);
        if (after) frag.appendChild(document.createTextNode(after));

        textNode.parentNode.replaceChild(frag, textNode);
        return true;
    }

    function tryCrossNodeHighlight(container, annotation, searchText) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) { textNodes.push(walker.currentNode); }
        if (textNodes.length === 0) return false;

        let fullText = '';
        const nodeMap = [];
        for (const tn of textNodes) {
            const start = fullText.length;
            fullText += tn.textContent;
            nodeMap.push({ node: tn, start, end: fullText.length });
        }

        // 收集所有精确匹配位置
        let allMatches = [];
        let searchFrom = 0;
        while (true) {
            const pos = fullText.indexOf(searchText, searchFrom);
            if (pos === -1) break;
            allMatches.push(pos);
            searchFrom = pos + 1;
        }

        let matchStart = allMatches.length > 0 ? allMatches[0] : -1;
        // 如果有多个匹配且有 startOffset，选最接近的
        if (allMatches.length > 1 && annotation.startOffset != null) {
            let minDist = Infinity;
            for (const pos of allMatches) {
                const dist = Math.abs(pos - annotation.startOffset);
                if (dist < minDist) { minDist = dist; matchStart = pos; }
            }
        }
        let actualMatchLen = searchText.length;

        if (matchStart === -1) {
            const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
            const normalizedFull = fullText.replace(/\s+/g, ' ');
            const nIdx = normalizedFull.indexOf(normalizedSearch);
            if (nIdx === -1) return false;

            let origPos = 0, normPos = 0;
            while (normPos < nIdx && origPos < fullText.length) {
                if (/\s/.test(fullText[origPos])) {
                    while (origPos < fullText.length && /\s/.test(fullText[origPos])) origPos++;
                    normPos++;
                } else { origPos++; normPos++; }
            }
            matchStart = origPos;

            let matchEndNorm = nIdx + normalizedSearch.length;
            normPos = nIdx; origPos = matchStart;
            while (normPos < matchEndNorm && origPos < fullText.length) {
                if (/\s/.test(fullText[origPos])) {
                    while (origPos < fullText.length && /\s/.test(fullText[origPos])) origPos++;
                    normPos++;
                } else { origPos++; normPos++; }
            }
            actualMatchLen = origPos - matchStart;
        }

        const matchEnd = matchStart + actualMatchLen;
        const affectedNodes = [];
        for (const nm of nodeMap) {
            if (nm.end <= matchStart) continue;
            if (nm.start >= matchEnd) break;
            affectedNodes.push({
                ...nm,
                highlightStart: Math.max(0, matchStart - nm.start),
                highlightEnd: Math.min(nm.node.textContent.length, matchEnd - nm.start)
            });
        }
        if (affectedNodes.length === 0) return false;

        let isFirst = true;
        for (const an of affectedNodes) {
            const textNode = an.node;
            const text = textNode.textContent;
            const hStart = an.highlightStart;
            const hEnd = an.highlightEnd;
            const before = text.substring(0, hStart);
            const match = text.substring(hStart, hEnd);
            const after = text.substring(hEnd);
            if (!match) continue;

            const frag = document.createDocumentFragment();
            if (before) frag.appendChild(document.createTextNode(before));
            const span = document.createElement('span');
            span.className = annotation.type === 'delete' ? 'highlight-delete' : 'highlight-comment';
            span.dataset.annotationId = annotation.id;
            span.textContent = match;
            if (isFirst) {
                const indicator = document.createElement('span');
                indicator.className = 'annotation-indicator';
                indicator.textContent = annotation.id;
                indicator.dataset.annotationId = annotation.id;
                span.appendChild(indicator);
                isFirst = false;
            }
            frag.appendChild(span);
            if (after) frag.appendChild(document.createTextNode(after));
            textNode.parentNode.replaceChild(frag, textNode);
        }
        return !isFirst;
    }

    function tryPartialBlockHighlight(container, annotation, searchText) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) { textNodes.push(walker.currentNode); }
        if (textNodes.length === 0) return false;

        let blockText = '';
        for (const tn of textNodes) { blockText += tn.textContent; }
        blockText = blockText.trim();
        if (!blockText) return false;

        const normBlock = blockText.replace(/\s+/g, ' ').trim();
        const normSearch = searchText.replace(/\s+/g, ' ').trim();
        const isContained = normSearch.includes(normBlock);
        let overlapStart = -1;

        if (isContained) {
            overlapStart = 0;
        } else {
            for (let len = Math.min(normSearch.length, normBlock.length); len >= 4; len--) {
                if (normSearch.substring(normSearch.length - len) === normBlock.substring(0, len)) { overlapStart = 0; break; }
            }
            if (overlapStart === -1) {
                for (let len = Math.min(normSearch.length, normBlock.length); len >= 4; len--) {
                    if (normSearch.substring(0, len) === normBlock.substring(normBlock.length - len)) { overlapStart = 0; break; }
                }
            }
        }
        if (overlapStart === -1) return false;

        let isFirst = true;
        for (const textNode of textNodes) {
            const text = textNode.textContent;
            if (!text.trim()) continue;
            const frag = document.createDocumentFragment();
            const span = document.createElement('span');
            span.className = annotation.type === 'delete' ? 'highlight-delete' : 'highlight-comment';
            span.dataset.annotationId = annotation.id;
            span.textContent = text;
            if (isFirst) {
                const indicator = document.createElement('span');
                indicator.className = 'annotation-indicator';
                indicator.textContent = annotation.id;
                indicator.dataset.annotationId = annotation.id;
                span.appendChild(indicator);
                isFirst = false;
            }
            frag.appendChild(span);
            textNode.parentNode.replaceChild(frag, textNode);
        }
        return !isFirst;
    }

    function applyFallbackMarker(container, annotation) {
        const marker = document.createElement('span');
        marker.className = 'annotation-fallback-marker';
        marker.dataset.annotationId = annotation.id;
        marker.style.display = 'none';
        container.insertBefore(marker, container.firstChild);
    }

    function applyInsertHighlight(container, rawBlock, annotation) {
        const afterText = annotation.selectedText;
        if (!afterText) return;

        const isBefore = annotation.insertPosition === 'before';

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) { textNodes.push(walker.currentNode); }

        // 收集所有候选匹配
        const candidates = [];
        let globalOffset = 0;
        for (const textNode of textNodes) {
            const content = textNode.textContent;
            let searchFrom = 0;
            while (true) {
                const idx = content.indexOf(afterText, searchFrom);
                if (idx === -1) break;
                candidates.push({ textNode, idx, globalOffset: globalOffset + idx });
                searchFrom = idx + 1;
            }
            globalOffset += content.length;
        }

        if (candidates.length === 0) return;

        // 选择最佳匹配
        let best = candidates[0];
        if (candidates.length > 1 && annotation.startOffset != null) {
            let minDist = Infinity;
            for (const c of candidates) {
                const dist = Math.abs(c.globalOffset - annotation.startOffset);
                if (dist < minDist) { minDist = dist; best = c; }
            }
        }

        const textNode = best.textNode;
        const idx = best.idx;
        const endIdx = idx + afterText.length;

        const marker = document.createElement('span');
        marker.className = 'insert-marker';
        marker.dataset.annotationId = annotation.id;

        const indicator = document.createElement('span');
        indicator.className = 'annotation-indicator';
        indicator.textContent = annotation.id;
        indicator.dataset.annotationId = annotation.id;
        marker.appendChild(indicator);
        const insertText = annotation.insertContent || (isBefore ? (typeof t === 'function' ? t('renderer.insert_before_text') : '前插内容') : (typeof t === 'function' ? t('renderer.insert_after_text') : '插入内容'));
        const displayText = insertText.length > 20 ? insertText.substring(0, 20) + '...' : insertText;
        marker.appendChild(document.createTextNode(' ' + displayText));

        const frag = document.createDocumentFragment();
        if (isBefore) {
            // 前插：标记放在匹配文本之前
            const before = textNode.textContent.substring(0, idx);
            const after = textNode.textContent.substring(idx);
            if (before) frag.appendChild(document.createTextNode(before));
            frag.appendChild(marker);
            if (after) frag.appendChild(document.createTextNode(after));
        } else {
            // 后插：标记放在匹配文本之后（原有逻辑）
            const before = textNode.textContent.substring(0, endIdx);
            const after = textNode.textContent.substring(endIdx);
            if (before) frag.appendChild(document.createTextNode(before));
            frag.appendChild(marker);
            if (after) frag.appendChild(document.createTextNode(after));
        }
        textNode.parentNode.replaceChild(frag, textNode);
    }

    function getBlockIndex(node) {
        let el = node;
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains('md-block')) {
                return parseInt(el.dataset.blockIndex, 10);
            }
            el = el.parentNode;
        }
        return -1;
    }

    /**
     * 重写 HTML 中图片的相对路径
     * 使用缓存的 webviewUri 映射，或显示占位提示
     */
    function rewriteImagePaths(html) {
        return html.replace(/<img\s+([^>]*?)src="([^"]*)"([^>]*?)>/gi, (match, before, src, after) => {
            if (/^(https?:\/\/|data:|vscode-)/i.test(src)) {
                return match;
            }

            let decodedSrc;
            try { decodedSrc = decodeURIComponent(src); } catch (e) { decodedSrc = src; }

            // Check cache
            if (_imageUriCache[decodedSrc]) {
                return `<img ${before}src="${_imageUriCache[decodedSrc]}"${after}>`;
            }

            // Placeholder with error handler
            const safeFileName = decodedSrc.replace(/&/g, '&amp;').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const errorHandler = `this.onerror=null;this.style.display='none';` +
                `var p=document.createElement('div');` +
                `p.className='img-placeholder';` +
                `p.innerHTML='🖼️ 图片加载中: ${safeFileName}';` +
                `this.parentNode.insertBefore(p,this);`;
            return `<img ${before}src="${src}"${after} onerror="${errorHandler}">`;
        });
    }

    /**
     * 设置图片 URI 缓存（从 Extension Host 批量获取后调用）
     */
    function setImageUriCache(uriMap) {
        _imageUriCache = { ..._imageUriCache, ...uriMap };
    }

    /**
     * 收集当前渲染中的所有相对路径图片
     */
    function collectRelativeImagePaths(html) {
        const paths = [];
        const regex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
        let m;
        while ((m = regex.exec(html)) !== null) {
            const src = m[1];
            if (!/^(https?:\/\/|data:|vscode-)/i.test(src)) {
                try { paths.push(decodeURIComponent(src)); } catch (e) { paths.push(src); }
            }
        }
        return [...new Set(paths)];
    }

    /**
     * 渲染所有 Mermaid 图表占位容器
     * 在 renderBlocks 之后调用
     */
    async function renderMermaid() {
        if (typeof mermaid === 'undefined') return;

        // 清理 mermaid 在 DOM 中残留的临时渲染容器
        // mermaid v10 的 render() 会在 body 中创建临时 <div id="d${id}"> 和 <svg id="${id}">，
        // 如果未被正确清理，再次渲染时可能导致 D3 选择器选中旧元素，产生错误的渲染结果
        // 注意：必须清理所有 mermaid 相关的临时元素，不仅是 "dmermaid-" 前缀的
        document.querySelectorAll('div[id^="dmermaid-"]').forEach(el => el.remove());
        document.querySelectorAll('svg[id^="mermaid-"]').forEach(el => {
            // 只清理不在 .mermaid-container 内的（即 mermaid 渲染时创建的临时 SVG）
            if (!el.closest('.mermaid-container')) el.remove();
        });
        // 清理 mermaid 可能残留的 iframe 沙箱容器
        document.querySelectorAll('iframe[id^="imermaid-"]').forEach(el => el.remove());

        // 每次渲染都重新 initialize，确保主题切换后使用正确的主题配置
        const isDark = document.body.classList.contains('theme-dark');
        mermaid.initialize({
            startOnLoad: false,
            theme: isDark ? 'dark' : 'default',
            // 使用 'loose' 而非 'strict'：
            // 'strict' 会强制将 htmlLabels 设为 false，导致节点文本中的特殊字符
            // （如 C++ 中的 +、C# 中的 #）被 Mermaid 解析器误解为语法符号，渲染失败。
            // VS Code webview 本身已是沙箱环境，安全性由宿主保证，'loose' 不会引入额外风险。
            securityLevel: 'loose',
            fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
            flowchart: {
                useMaxWidth: false,
                htmlLabels: true,
                curve: 'basis',
            },
            sequence: {
                useMaxWidth: false,
                diagramMarginX: 8,
                diagramMarginY: 8,
            },
            gantt: {
                useMaxWidth: false,
            },
            themeVariables: isDark ? {
                darkMode: true,
                background: '#1e1e2e',
                primaryColor: '#4fc3f7',
                primaryTextColor: '#e0e0e0',
                primaryBorderColor: '#4a5568',
                lineColor: '#718096',
                secondaryColor: '#2d3748',
                tertiaryColor: '#374151',
                textColor: '#e2e8f0',
                mainBkg: '#2d3748',
                nodeBorder: '#4a5568',
                clusterBkg: 'rgba(30, 41, 59, 0.5)',
                clusterBorder: '#475569',
                titleColor: '#e2e8f0',
                edgeLabelBackground: '#1e293b',
                nodeTextColor: '#e2e8f0',
            } : {},
        });
        _mermaidInitialized = true;

        const containers = document.querySelectorAll('.mermaid-container');
        for (const container of containers) {
            // 优先使用 base64 编码的源码（避免 HTML 转义问题）
            const sourceDataEl = container.querySelector('.mermaid-source-data');
            const sourceEl = container.querySelector('.mermaid-source');
            let code = '';
            if (sourceDataEl && sourceDataEl.dataset.source) {
                try {
                    code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
                } catch (e) {
                    code = sourceEl ? sourceEl.textContent : '';
                }
            } else if (sourceEl) {
                code = sourceEl.textContent;
            }
            if (!code) continue;

            // 使用唯一 ID（加入时间戳），避免 mermaid 内部 D3 缓存导致的渲染错误
            // mermaid v10 在同一页面中多次渲染时，如果复用了之前的 ID，
            // 内部的 D3.js 选择器可能选中旧的 DOM 元素，导致 SVG 内容不正确
            const id = 'mermaid-' + Date.now() + '-' + (++_mermaidCounter);

            // 每次渲染前清理上一次渲染可能残留的临时 DOM 元素
            // 这对类图等有全局解析器状态的图表类型尤为重要
            document.querySelectorAll('div[id^="dmermaid-"]').forEach(el => el.remove());
            document.querySelectorAll('svg[id^="mermaid-"]').forEach(el => {
                if (!el.closest('.mermaid-container')) el.remove();
            });

            try {
                const { svg } = await mermaid.render(id, code);
                // 渲染完成后立即清理 mermaid 创建的临时 DOM 元素
                // 防止残留元素影响后续图表的渲染（特别是类图的 D3 选择器缓存问题）
                const tempDiv = document.getElementById('d' + id);
                if (tempDiv) tempDiv.remove();
                const tempSvg = document.getElementById(id);
                if (tempSvg && !tempSvg.closest('.mermaid-container')) tempSvg.remove();
                const tempIframe = document.getElementById('i' + id);
                if (tempIframe) tempIframe.remove();
                // 渲染后用最新的源码更新 data-source（确保编辑后的内容被正确保存）
                const latestBase64 = btoa(unescape(encodeURIComponent(code)));
                container.innerHTML = `<div class="mermaid-rendered" data-source="${latestBase64}">${svg}</div>`;

                // 使 SVG 自适应容器宽度
                const svgEl = container.querySelector('svg');
                if (svgEl) {
                    const rawW = parseFloat(svgEl.getAttribute('width')) || svgEl.getBoundingClientRect().width;
                    const rawH = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
                    // 确保 viewBox 存在（用于缩放计算和弹窗预览）
                    if (!svgEl.getAttribute('viewBox') && rawW && rawH) {
                        svgEl.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
                    }
                    // 移除固定的内联 style 和宽高属性，改为 CSS 自适应
                    svgEl.removeAttribute('style');
                    svgEl.removeAttribute('width');
                    svgEl.removeAttribute('height');
                    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

                    // 根据宽高比智能设置显示尺寸
                    const containerW = container.clientWidth - 32 || 800;
                    const aspect = rawW / rawH;

                    if (aspect > 2.5) {
                        // 非常宽的横向图表（如甘特图）：宽度撑满，高度按比例计算
                        const calcH = Math.max(containerW / aspect, 300);
                        svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
                    } else if (aspect > 1.5) {
                        // 中等宽度横向图表：宽度撑满，设合理最小高度
                        const calcH = Math.max(containerW / aspect, 250);
                        svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
                    } else {
                        // 方正或纵向图表（流程图等）：宽度撑满，高度自动
                        svgEl.style.cssText = `width:100%;height:auto;max-width:100%;`;
                        if (rawH > 100) {
                            svgEl.style.minHeight = Math.min(rawH, 600) + 'px';
                        }
                    }
                }
            } catch (e) {
                console.warn('[Renderer] Mermaid 渲染失败:', e);
                container.innerHTML = `<div class="mermaid-error"><span class="mermaid-error-icon">⚠️</span> Mermaid 图表渲染失败<pre>${escapeHtml(code)}</pre></div>`;
            }
        }
    }

    /**
     * 重新初始化 Mermaid（主题切换时调用）
     * 将已渲染的图表恢复为源码状态，强制重新渲染
     */
    function reinitMermaid() {
        _mermaidInitialized = false;
        // 将已渲染的图表恢复为源码占位容器，以便重新渲染
        document.querySelectorAll('.mermaid-container').forEach(container => {
            container.removeAttribute('data-mermaid-id');
            const rendered = container.querySelector('.mermaid-rendered');
            if (rendered && rendered.dataset.source) {
                // 从 data-source 恢复 base64 编码的源码
                let code = '';
                try {
                    code = decodeURIComponent(escape(atob(rendered.dataset.source)));
                } catch (e) {
                    code = '';
                }
                if (code) {
                    container.innerHTML = `<div class="mermaid-source-data" data-source="${rendered.dataset.source}" style="display:none"></div><pre class="mermaid-source">${escapeHtml(code)}</pre>`;
                }
            }
        });
        // 重置计数器
        _mermaidCounter = 0;
    }

    /**
     * 渲染数学公式（KaTeX）
     * 使用 TreeWalker 遍历 DOM，将占位符替换为 KaTeX 渲染结果
     */
    function renderMath() {
        if (typeof katex === 'undefined') return;
        if (_mathExpressions.length === 0) return;

        const container = document.getElementById('documentContent');
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
                const expr = _mathExpressions[exprIndex];

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
     * PlantUML hex 编码：将源码转为 UTF-8 字节的十六进制表示
     * PlantUML 服务器 ~h 模式要求 UTF-8 字节 hex，而非 Unicode 码点 hex
     */
    function plantumlHexEncode(text) {
        // 先将文本编码为 UTF-8 字节序列
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        let hex = '';
        for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, '0');
        }
        return hex;
    }

    /**
     * 渲染 PlantUML 图表（通过在线服务器，延迟渲染）
     * 从 data-source 中解码源码，动态构建 <img> 标签
     * 只在 enablePlantUML 开关打开时由 app.js 调用
     */
    function renderPlantUML() {
        const containers = document.querySelectorAll('.plantuml-container');
        if (containers.length === 0) return;

        containers.forEach(container => {
            // 已渲染则跳过（只绑定 lightbox）
            if (container.querySelector('.plantuml-rendered')) {
                const img = container.querySelector('.plantuml-rendered');
                if (img && !img.dataset.lightboxBound) {
                    img.dataset.lightboxBound = 'true';
                    img.title = '点击查看大图';
                    img.style.cursor = 'pointer';
                }
                return;
            }

            const sourceDataEl = container.querySelector('.plantuml-source-data');
            if (!sourceDataEl || !sourceDataEl.dataset.source) return;

            let code = '';
            try {
                code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
            } catch (e) {
                const sourceEl = container.querySelector('.plantuml-source');
                code = sourceEl ? sourceEl.textContent : '';
            }
            if (!code) return;

            const maxLen = 4000;
            if (code.length > maxLen) {
                container.innerHTML = `<div class="plantuml-error"><span class="plantuml-error-icon">⚠️</span> 图表源码过长（${code.length} 字符），无法在线渲染</div><pre class="plantuml-source">${escapeHtml(code)}</pre>`;
                container.classList.add('plantuml-too-long');
                return;
            }

            const hexCode = plantumlHexEncode(code);
            const svgUrl = 'https://www.plantuml.com/plantuml/svg/~h' + hexCode;

            // 动态构建 <img>，保留 source-data 用于主题切换时重渲染
            container.innerHTML = `<img class="plantuml-rendered" src="${svgUrl}" alt="PlantUML Diagram" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" /><div class="plantuml-fallback" style="display:none"><div class="plantuml-error"><span class="plantuml-error-icon">⚠️</span> PlantUML 图表渲染失败（请检查网络连接）</div><pre class="plantuml-source">${escapeHtml(code)}</pre></div><pre class="plantuml-source-data" data-source="${sourceDataEl.dataset.source}" style="display:none"></pre>`;

            const img = container.querySelector('.plantuml-rendered');
            if (img) {
                img.dataset.lightboxBound = 'true';
                img.title = '点击查看大图';
                img.style.cursor = 'pointer';
            }
        });
    }

    /**
     * 渲染 Graphviz DOT 图表（使用 Viz.js）
     */
    async function renderGraphviz() {
        const containers = document.querySelectorAll('.graphviz-container');
        if (containers.length === 0) return;
        if (typeof Viz === 'undefined') {
            console.warn('[Renderer] Viz.js 未加载');
            return;
        }

        let vizInstance;
        try {
            vizInstance = await Viz.instance();
        } catch (e) {
            console.warn('[Renderer] Viz.js 初始化失败:', e);
            return;
        }

        for (const container of containers) {
            if (container.querySelector('.graphviz-rendered')) continue;

            const sourceDataEl = container.querySelector('.graphviz-source-data');
            const sourceEl = container.querySelector('.graphviz-source');
            let code = '';
            if (sourceDataEl && sourceDataEl.dataset.source) {
                try {
                    code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
                } catch (e) {
                    code = sourceEl ? sourceEl.textContent : '';
                }
            } else if (sourceEl) {
                code = sourceEl.textContent;
            }
            if (!code) continue;

            try {
                const svg = vizInstance.renderSVGElement(code);
                const wrapper = document.createElement('div');
                wrapper.className = 'graphviz-rendered';
                wrapper.dataset.source = sourceDataEl ? sourceDataEl.dataset.source : '';
                wrapper.appendChild(svg);
                container.innerHTML = '';
                container.appendChild(wrapper);

                // 确保 viewBox 存在（Lightbox 大图弹窗需要用 viewBox 来计算原始尺寸）
                const rawW = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
                const rawH = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
                if (!svg.getAttribute('viewBox') && rawW && rawH) {
                    svg.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
                }

                // SVG 自适应
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.style.cssText = 'width:100%;height:auto;max-width:100%;';
            } catch (e) {
                console.warn('[Renderer] Graphviz 渲染失败:', e);
                container.innerHTML = `<div class="graphviz-error"><span class="graphviz-error-icon">⚠️</span> Graphviz 图表渲染失败: ${escapeHtml(e.message || '')}<pre>${escapeHtml(code)}</pre></div>`;
            }
        }
    }

    /**
     * 重新初始化 Graphviz（主题切换时调用）
     */
    function reinitGraphviz() {
        document.querySelectorAll('.graphviz-container').forEach(container => {
            const rendered = container.querySelector('.graphviz-rendered');
            if (rendered && rendered.dataset.source) {
                let code = '';
                try {
                    code = decodeURIComponent(escape(atob(rendered.dataset.source)));
                } catch (e) { code = ''; }
                if (code) {
                    container.innerHTML = `<div class="graphviz-source-data" data-source="${rendered.dataset.source}" style="display:none"></div><pre class="graphviz-source">${escapeHtml(code)}</pre>`;
                }
            }
        });
    }

    /**
     * 将 DOM 中的数学公式占位符还原为原始公式文本（编辑模式专用）
     * 在编辑模式下，用户需要看到并编辑原始的 $...$ / $$...$$ 文本，而非占位符
     */
    function restoreMathPlaceholders() {
        if (_mathExpressions.length === 0) return;

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
                const expr = _mathExpressions[exprIndex];
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

    return { parseMarkdown, renderBlocks, getBlockIndex, setImageUriCache, getImageUriCache: () => _imageUriCache, collectRelativeImagePaths, configureHighlight, renderMermaid, reinitMermaid, renderMath, restoreMathPlaceholders, renderPlantUML, renderGraphviz, reinitGraphviz, postprocessHTML, preprocessMath, getRawBlocksBeforeExtract: () => _rawBlocksBeforeExtract, getOrphanedDefBlocks: () => _orphanedDefBlocks, getInlineExtractedDefs: () => _inlineExtractedDefs };
})();
