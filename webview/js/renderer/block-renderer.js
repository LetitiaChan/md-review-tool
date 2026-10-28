/**
 * block-renderer.js — 全量渲染、增量批注更新与渲染完成回调
 */

import { RenderContext as ctx } from './context.js';
import { escapeHtml } from './utils.js';
import { applyHighlights } from './highlight.js';
import { rewriteImagePaths, bindImageFallbacks } from './images.js';
import { preprocessMarkdown, postprocessHTML } from './marked-setup.js';
import { preprocessMath } from './math.js';

// 渲染完成回调列表

function renderBlocks(blocks, annotations) {
    annotations = annotations || [];
    const container = document.getElementById('documentContent');
    container.innerHTML = '';

    // 每次整篇重渲染都重新计数标题 slug，保证 id 唯一且稳定
    ctx.slugCounts = Object.create(null);
    // 重置增量渲染缓存与图片路径收集
    ctx.blockBaseHtml = [];
    ctx.blockRaw = [];
    ctx.collectedImagePaths = new Set();

    // 统一清空数学公式缓存，后续逐块 preprocessMath 会累积填充
    ctx.mathExpressions = [];

    // 建立脚注标签 → 全局序号的映射（按定义顺序编号 1, 2, 3, ...）
    const fnLabelToGlobalIndex = {};
    if (ctx.footnoteDefs.length > 0) {
        const fnLabelRegex = /^\s{0,3}\[\^([^\]\n]+)\]:/;
        let globalIdx = 1;
        for (const def of ctx.footnoteDefs) {
            const m = fnLabelRegex.exec(def);
            if (m) {
                fnLabelToGlobalIndex[encodeURIComponent(m[1])] = globalIdx++;
            }
        }
    }

    // 循环外预计算注入片段，避免每个块重复 join（O(块数 × 定义数)）
    const refSuffix = ctx.refLinkDefs.length > 0 ? '\n\n' + ctx.refLinkDefs.join('\n') : '';
    const fnSuffix = ctx.footnoteDefs.length > 0 ? '\n\n' + ctx.footnoteDefs.join('\n\n') : '';
    const hasFnMap = Object.keys(fnLabelToGlobalIndex).length > 0;

    blocks.forEach((block, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'md-block';
        wrapper.dataset.blockIndex = index;

        // YAML Front Matter 专属渲染：生成卡片式 UI，不走 marked 解析
        if (block.startsWith('%%FRONTMATTER%%\n')) {
            const fmRaw = block.slice('%%FRONTMATTER%%\n'.length);
            // 解析 frontmatter 内容行（去掉 --- 分隔符）
            const fmLines = fmRaw.split('\n').filter(l => l.trim() !== '---');
            let propsHtml = '';
            for (const line of fmLines) {
                const colonIdx = line.indexOf(':');
                if (colonIdx > 0) {
                    const key = escapeHtml(line.slice(0, colonIdx).trim());
                    const val = escapeHtml(line.slice(colonIdx + 1).trim());
                    propsHtml += `<div class="fm-prop"><span class="fm-key">${key}</span><span class="fm-colon">:</span> <span class="fm-value">${val}</span></div>`;
                } else if (line.trim()) {
                    propsHtml += `<div class="fm-prop"><span class="fm-value">${escapeHtml(line.trim())}</span></div>`;
                }
            }
            // 同一篇文档重渲染时保持展开状态；文档内容变了则回到折叠
            if (fmRaw !== ctx.frontmatterKey) {
                ctx.frontmatterKey = fmRaw;
                ctx.frontmatterExpanded = false;
            }
            const collapsedClass = ctx.frontmatterExpanded ? '' : ' fm-collapsed';
            wrapper.innerHTML = `<div class="frontmatter-card${collapsedClass}"><div class="fm-header"><span class="fm-toggle-arrow">▶</span><span class="fm-icon">⚙️</span><span class="fm-title">YAML Front Matter</span></div><div class="fm-body">${propsHtml}</div></div>`;
            const fmCard = wrapper.querySelector('.frontmatter-card');
            const fmHeader = wrapper.querySelector('.fm-header');
            fmHeader.addEventListener('click', () => {
                // classList.toggle 返回 true 表示现在带上了 fm-collapsed（即折叠）
                ctx.frontmatterExpanded = !fmCard.classList.toggle('fm-collapsed');
            });
            container.appendChild(wrapper);
            return; // 跳过后续 marked 解析流程
        }

        // 预处理 → 数学公式占位 → marked 解析 → 后处理
        let preprocessed = preprocessMarkdown(block);
        preprocessed = preprocessMath(preprocessed);
        // 注入引用式链接定义，使 marked 能跨块解析 [text][ref] 语法
        if (refSuffix && block.includes('][')) {
            preprocessed = preprocessed + refSuffix;
        }
        // 注入脚注定义，使 marked-footnote 能跨块解析 [^id] 引用
        if (fnSuffix && block.includes('[^')) {
            preprocessed = preprocessed + fnSuffix;
        }
        let html = marked.parse(preprocessed);
        html = postprocessHTML(html, block);
        // 修正脚注引用的上标序号为全局序号
        if (hasFnMap) {
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

        // 缓存「无批注」HTML：增量渲染时直接复用，跳过 marked + highlight.js
        ctx.blockBaseHtml[index] = html;
        ctx.blockRaw[index] = block;

        const allAnnotations = collectAnnotationsForBlock(block, index, annotations);
        if (allAnnotations.length > 0) {
            html = applyHighlights(html, block, allAnnotations);
        }

        wrapper.innerHTML = html;
        container.appendChild(wrapper);
    });

    // 所有块渲染完成后，统一在文档末尾渲染脚注区域
    // 用 marked-footnote 对所有脚注引用+定义做一次完整解析
    if (ctx.footnoteDefs.length > 0) {
        // 构造包含虚拟引用和所有脚注定义的 Markdown，让 marked-footnote 生成完整脚注 section
        // 提取所有脚注标签
        const fnLabels = [];
        const fnLabelRegex = /^\s{0,3}\[\^([^\]\n]+)\]:/;
        for (const def of ctx.footnoteDefs) {
            const m = fnLabelRegex.exec(def);
            if (m) fnLabels.push(m[1]);
        }
        if (fnLabels.length > 0) {
            const dummyRefs = fnLabels.map(id => `[^${id}]`).join(' ');
            const fullFootnoteMd = dummyRefs + '\n\n' + ctx.footnoteDefs.join('\n\n');
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

    // 图片加载失败兜底（CSP 禁止内联 onerror，必须在 DOM 就绪后绑定）
    bindImageFallbacks(container);

    // 记录本次批注快照，供 updateAnnotations 计算受影响块
    ctx.lastAnnotations = snapshotAnnotations(annotations);

    // 渲染完成后调用所有注册的回调（如重新应用代码字体内联样式）
    for (const cb of ctx.renderCompleteCallbacks) {
        try { cb({ incremental: false, roots: null }); } catch (e) { console.warn('[Renderer] onRenderComplete callback error:', e); }
    }
}

/**
 * 注册渲染完成回调
 * @param {Function} callback - renderBlocks 完成后调用的回调函数
 */
function onRenderComplete(callback) {
    if (typeof callback === 'function') {
        ctx.renderCompleteCallbacks.push(callback);
    }
}

/**
 * 复制批注数组（浅拷贝），用于保存上次渲染快照。
 */
function snapshotAnnotations(annotations) {
    return (annotations || []).map(a => ({ ...a }));
}

/**
 * 收集某个块需要应用的全部批注：
 * 起止块包含当前块，或（旧格式）选中文本包含整块内容。
 */
function collectAnnotationsForBlock(block, index, annotations) {
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
    return [...blockAnnotations, ...crossBlockAnnotations];
}

/**
 * 批注中影响正文高亮的字段签名。只改 comment/images 不应触发正文重渲染。
 */
function annotationSignature(ann) {
    return [
        ann.type, ann.selectedText, ann.blockIndex, ann.endBlockIndex,
        ann.startOffset, ann.endOffset, ann.insertContent, ann.insertPosition,
    ].join('\u0001');
}

/**
 * 计算批注变化影响到的块集合。
 * 返回 null 表示无法安全增量（旧批注缺少 endBlockIndex），调用方应回退全量渲染。
 */
function computeAffectedBlocks(prev, next) {
    const prevMap = new Map((prev || []).map(a => [a.id, a]));
    const nextMap = new Map((next || []).map(a => [a.id, a]));
    const ids = new Set([...prevMap.keys(), ...nextMap.keys()]);
    const affected = new Set();

    for (const id of ids) {
        const a = prevMap.get(id);
        const b = nextMap.get(id);
        if (a && b && annotationSignature(a) === annotationSignature(b)) continue;

        for (const ann of [a, b]) {
            if (!ann) continue;
            if (ann.blockIndex == null || ann.blockIndex < 0) return null;
            if (ann.endBlockIndex === undefined || ann.endBlockIndex === null) return null;
            const start = Math.max(0, Math.min(ann.blockIndex, ann.endBlockIndex));
            const end = Math.max(ann.blockIndex, ann.endBlockIndex);
            for (let i = start; i <= end; i++) affected.add(i);
        }
    }
    return affected;
}

/**
 * 增量更新批注：只重建受影响的块，跳过 marked / highlight.js。
 * @returns {boolean} false 表示调用方应回退到 renderBlocks 全量渲染
 */
function updateAnnotations(annotations) {
    const container = document.getElementById('documentContent');
    if (!container || ctx.blockBaseHtml.length === 0) return false;

    const next = annotations || [];
    const affected = computeAffectedBlocks(ctx.lastAnnotations, next);
    if (affected === null) return false;

    const wrappers = container.querySelectorAll(':scope > .md-block');
    const roots = [];

    for (const idx of affected) {
        const wrapper = wrappers[idx];
        const block = ctx.blockRaw[idx];
        if (!wrapper || block === undefined) continue;

        let html = ctx.blockBaseHtml[idx];
        // frontmatter 卡片的展开状态不属于基础 HTML，按当前状态恢复
        if (block.startsWith('%%FRONTMATTER%%')) {
            html = html.replace(
                /class="frontmatter-card[^"]*"/,
                `class="frontmatter-card${ctx.frontmatterExpanded ? '' : ' fm-collapsed'}"`
            );
        }

        const blockAnns = collectAnnotationsForBlock(block, idx, next);
        if (blockAnns.length > 0) {
            html = applyHighlights(html, block, blockAnns);
        }
        wrapper.innerHTML = html;
        bindImageFallbacks(wrapper);
        roots.push(wrapper);
    }

    ctx.lastAnnotations = snapshotAnnotations(next);

    // 只对受影响块补跑公式/图表/按钮绑定
    if (roots.length > 0) {
        for (const cb of ctx.renderCompleteCallbacks) {
            try { cb({ incremental: true, roots }); } catch (e) {
                console.warn('[Renderer] onRenderComplete callback error:', e);
            }
        }
    }
    return true;
}

export { renderBlocks, updateAnnotations, onRenderComplete };
