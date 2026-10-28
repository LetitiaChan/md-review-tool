/**
 * highlight.js — 批注高亮匹配（单节点 / 跨节点 / 部分块 / 插入标记）
 */

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

/**
 * 按文档顺序收集容器内的文本片段。
 * marked 的 breaks:true 会把软换行渲染为 <br>，它不产生文本节点，
 * 但 Selection.toString() 会把换行产出为 '\n'。为了让批注文本匹配
 * 与选区/源文本保持一致，这里把 <br> 视为长度为 1 的 '\n' 片段。
 *
 * @returns {{ fullText: string, segments: Array<{node: Node, start: number, end: number, isBreak: boolean}> }}
 */
function collectTextSegments(container) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
                return node.nodeName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        },
        false
    );
    let fullText = '';
    const segments = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const isBreak = node.nodeType === Node.ELEMENT_NODE;
        const text = isBreak ? '\n' : node.textContent;
        if (!text) continue;
        segments.push({ node, start: fullText.length, end: fullText.length + text.length, isBreak });
        fullText += text;
    }
    return { fullText, segments };
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
    // 偏移量必须包含 <br>（软换行），否则多个候选的排序会错
    const { segments } = collectTextSegments(container);
    const textSegments = segments.filter(s => !s.isBreak);

    // 先收集所有匹配候选（同一块中可能有多个相同文本）
    const candidates = [];
    for (const seg of textSegments) {
        const content = seg.node.textContent;
        let searchFrom = 0;
        while (true) {
            const idx = content.indexOf(searchText, searchFrom);
            if (idx === -1) break;
            candidates.push({ textNode: seg.node, idx, globalOffset: seg.start + idx });
            searchFrom = idx + 1;
        }
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
    // 用 collectTextSegments 而不是纯文本节点：软换行（<br>）要计入 fullText，
    // 否则跨行的批注文本（含 '\n'）永远匹配不上
    const { fullText, segments } = collectTextSegments(container);
    if (segments.length === 0 || !fullText) return false;
    const nodeMap = segments;

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
    // 包含软换行（<br>）后的块文本，与选区的 toString() 保持一致
    const { fullText, segments } = collectTextSegments(container);
    const textNodes = segments.filter(s => !s.isBreak).map(s => s.node);
    if (textNodes.length === 0) return false;

    let blockText = fullText.trim();
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

    // 偏移量需包含软换行（<br>），与选区/源文本保持一致
    const { segments } = collectTextSegments(container);
    const textNodes = segments.filter(s => !s.isBreak);

    // 收集所有候选匹配
    const candidates = [];
    for (const seg of textNodes) {
        const content = seg.node.textContent;
        let searchFrom = 0;
        while (true) {
            const idx = content.indexOf(afterText, searchFrom);
            if (idx === -1) break;
            candidates.push({ textNode: seg.node, idx, globalOffset: seg.start + idx });
            searchFrom = idx + 1;
        }
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

export {
    applyHighlights, collectTextSegments, applyTextHighlight, trySingleNodeHighlight,
    tryCrossNodeHighlight, tryPartialBlockHighlight, applyFallbackMarker,
    applyInsertHighlight, getBlockIndex,
};
