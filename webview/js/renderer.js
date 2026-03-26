/**
 * renderer.js - Markdown 渲染模块（VSCode 插件版）
 * 将 Markdown 解析为带有块级索引的 HTML，支持批注高亮
 * 图片路径通过 Extension Host 转换为 webviewUri
 */
const Renderer = (() => {

    // 缓存图片 URI 映射
    let _imageUriCache = {};

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

        // 将 frontmatter 作为第一个块（以代码块样式保留展示）
        if (frontmatterBlock) {
            blocks.push('```yaml\n' + frontmatterBlock + '\n```');
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    current.push(line);
                    blocks.push(current.join('\n'));
                    current = [];
                    inCodeBlock = false;
                    continue;
                } else {
                    if (current.length > 0) {
                        blocks.push(current.join('\n'));
                        current = [];
                    }
                    inCodeBlock = true;
                    current.push(line);
                    continue;
                }
            }

            if (inCodeBlock) {
                current.push(line);
                continue;
            }

            if (line.trim() === '') {
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                    current = [];
                }
            } else {
                current.push(line);
            }
        }
        if (current.length > 0) {
            blocks.push(current.join('\n'));
        }

        return blocks;
    }

    function renderBlocks(blocks, annotations) {
        const container = document.getElementById('documentContent');
        container.innerHTML = '';

        blocks.forEach((block, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'md-block';
            wrapper.dataset.blockIndex = index;

            let html = marked.parse(block);
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
        const before = textNode.textContent.substring(0, endIdx);
        const after = textNode.textContent.substring(endIdx);

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));

        const marker = document.createElement('span');
        marker.className = 'insert-marker';
        marker.dataset.annotationId = annotation.id;

        const indicator = document.createElement('span');
        indicator.className = 'annotation-indicator';
        indicator.textContent = annotation.id;
        indicator.dataset.annotationId = annotation.id;
        marker.appendChild(indicator);
        marker.appendChild(document.createTextNode(' 插入内容'));
        frag.appendChild(marker);

        if (after) frag.appendChild(document.createTextNode(after));
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

    return { parseMarkdown, renderBlocks, getBlockIndex, setImageUriCache, collectRelativeImagePaths };
})();
