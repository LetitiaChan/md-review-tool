/**
 * images.js — 图片路径重写、URI 缓存、加载失败兜底
 */

import { RenderContext as ctx } from './context.js';
import { escapeHtml } from './utils.js';

/**
 * 取出本轮渲染收集到的相对图片路径（并清空集合）
 */
function takeCollectedImagePaths() {
    const paths = Array.from(ctx.collectedImagePaths);
    ctx.collectedImagePaths = new Set();
    return paths;
}

/**
 * 从 Markdown 源文本粗略收集相对图片路径（兜底用，线性复杂度）
 */
function collectRelativeImagePathsFromMarkdown(markdown) {
    const paths = new Set();
    if (!markdown) return [];
    const mdImg = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g;
    let m;
    while ((m = mdImg.exec(markdown)) !== null) {
        const src = m[1];
        if (!/^(https?:\/\/|data:|vscode-)/i.test(src)) paths.add(src);
    }
    const htmlImg = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
    while ((m = htmlImg.exec(markdown)) !== null) {
        const src = m[1];
        if (!/^(https?:\/\/|data:|vscode-)/i.test(src)) paths.add(src);
    }
    return Array.from(paths);
}

/**
 * 图片 URI 回包后就地替换 src，避免整篇重渲染
 */
function patchImageUris(uriMap) {
    if (!uriMap) return;
    const container = document.getElementById('documentContent');
    if (!container) return;

    container.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (!src || /^(https?:\/\/|data:|vscode-)/i.test(src)) return;
        let decoded = src;
        try { decoded = decodeURIComponent(src); } catch (e) { /* keep */ }
        const uri = uriMap[decoded] || uriMap[src];
        if (!uri) return;

        img.setAttribute('src', uri);
        img.style.display = '';
        img.dataset.fallbackApplied = 'false';
        const parent = img.parentNode;
        if (parent) {
            const ph = parent.querySelector(':scope > .img-placeholder');
            if (ph) ph.remove();
        }
    });
}


/**
 * 为图片绑定加载失败兜底。
 * webview 的 CSP 没有 'unsafe-inline'，内联 onerror 会被浏览器拒绝执行，
 * 因此改为渲染完成后统一用 JS 绑定；绑定前已经失败的图片用
 * complete && naturalWidth === 0 补一次判断。
 */
function bindImageFallbacks(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('img').forEach(img => {
        if (img.dataset.fallbackBound === 'true') return;
        // PlantUML 图有自己的失败兜底
        if (img.classList.contains('plantuml-rendered')) return;
        img.dataset.fallbackBound = 'true';

        const applyFallback = () => {
            if (img.dataset.fallbackApplied === 'true') return;
            img.dataset.fallbackApplied = 'true';
            img.style.display = 'none';
            const parent = img.parentNode;
            if (!parent) return;
            const placeholder = document.createElement('div');
            placeholder.className = 'img-placeholder';
            placeholder.textContent = img.dataset.loadingHint
                || ('🖼️ 图片加载失败: ' + (img.getAttribute('alt') || img.getAttribute('src') || ''));
            parent.insertBefore(placeholder, img);
            const caption = parent.querySelector ? parent.querySelector('.md-image-caption') : null;
            if (caption) caption.style.display = '';
        };

        img.addEventListener('error', applyFallback);
        if (img.complete && img.naturalWidth === 0) applyFallback();
    });
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

        // 收集相对图片路径，供 requestImageUris 批量解析（避免再对全文跑 marked.parse）
        ctx.collectedImagePaths.add(decodedSrc);

        // Check cache
        if (ctx.imageUriCache[decodedSrc]) {
            return `<img ${before}src="${ctx.imageUriCache[decodedSrc]}"${after}>`;
        }

        // 占位提示：加载失败时由 bindImageFallbacks() 读取 data-loading-hint 展示
        // （不能使用内联 onerror，CSP 会拦截）
        const hint = escapeHtml('🖼️ 图片加载中: ' + decodedSrc);
        return `<img ${before}src="${src}"${after} data-loading-hint="${hint}">`;
    });
}

/**
 * 设置图片 URI 缓存（从 Extension Host 批量获取后调用）
 */
function setImageUriCache(uriMap) {
    ctx.imageUriCache = { ...ctx.imageUriCache, ...uriMap };
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

export {
    takeCollectedImagePaths, collectRelativeImagePathsFromMarkdown, patchImageUris,
    bindImageFallbacks, rewriteImagePaths, setImageUriCache, collectRelativeImagePaths,
};
