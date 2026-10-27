/**
 * lightbox.js — 图片 / Mermaid / Graphviz 大图预览与代码块复制
 *
 * 从 app.js 抽出：只依赖 DOM 与浏览器 API，不引用 app 的闭包状态。
 */

// ===== 图片点击放大（lightbox） =====
function bindImageLightbox() {
    const contentEl = document.getElementById('documentContent');
    if (!contentEl || contentEl.dataset.imageLightboxBound) return;
    contentEl.dataset.imageLightboxBound = 'true';

    contentEl.addEventListener('click', (e) => {
        const img = e.target.closest('img');
        if (!img) return;
        // 排除已经在 lightbox / mermaid 弹窗内的图片
        if (img.closest('.image-lightbox-overlay') || img.closest('.mermaid-lightbox-overlay')) return;
        // 排除占位符和失败提示图
        if (img.classList.contains('img-placeholder')) return;

        openImageLightbox(img.src);
    });
}

function openImageLightbox(src) {
    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.className = 'image-lightbox-overlay';

    const img = document.createElement('img');
    img.src = src;
    img.draggable = false; // 禁用原生拖拽

    const closeBtn = document.createElement('button');
    closeBtn.className = 'image-lightbox-close';
    closeBtn.innerHTML = '&times;';

    // 缩放百分比提示
    const zoomTip = document.createElement('div');
    zoomTip.className = 'image-lightbox-zoom-tip';

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    overlay.appendChild(zoomTip);
    document.body.appendChild(overlay);

    // ===== 缩放 & 拖拽状态 =====
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTX = 0;
    let dragStartTY = 0;
    let zoomTipTimer = null;

    const MIN_SCALE = 0.1;
    const MAX_SCALE = 20;

    function applyTransform() {
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    function showZoomTip() {
        zoomTip.textContent = `${Math.round(scale * 100)}%`;
        zoomTip.classList.add('visible');
        if (zoomTipTimer) clearTimeout(zoomTipTimer);
        zoomTipTimer = setTimeout(() => {
            zoomTip.classList.remove('visible');
        }, 800);
    }

    function updateCursor() {
        if (scale > 1) {
            img.style.cursor = isDragging ? 'grabbing' : 'grab';
            overlay.style.cursor = isDragging ? 'grabbing' : 'zoom-out';
        } else {
            img.style.cursor = 'default';
            overlay.style.cursor = 'zoom-out';
        }
    }

    // ===== 鼠标滚轮缩放 =====
    overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        // 根据当前缩放比例动态计算步长，小缩放时步长小，大缩放时步长大
        const factor = delta > 0 ? 1.15 : 1 / 1.15;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));

        // 以鼠标位置为中心缩放
        const rect = img.getBoundingClientRect();
        const imgCenterX = rect.left + rect.width / 2;
        const imgCenterY = rect.top + rect.height / 2;
        const mouseOffsetX = e.clientX - imgCenterX;
        const mouseOffsetY = e.clientY - imgCenterY;

        const ratio = newScale / scale;
        translateX = translateX - mouseOffsetX * (ratio - 1);
        translateY = translateY - mouseOffsetY * (ratio - 1);
        scale = newScale;

        applyTransform();
        showZoomTip();
        updateCursor();
    }, { passive: false });

    // ===== 拖拽移动 =====
    img.addEventListener('mousedown', (e) => {
        if (scale <= 1) return; // 未缩放时不允许拖拽
        e.preventDefault();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartTX = translateX;
        dragStartTY = translateY;
        updateCursor();
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        translateX = dragStartTX + (e.clientX - dragStartX);
        translateY = dragStartTY + (e.clientY - dragStartY);
        applyTransform();
    }

    function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;
        updateCursor();
    }

    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
    overlay.addEventListener('mouseleave', onMouseUp);

    // ===== 双击还原 =====
    img.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        scale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
        showZoomTip();
        updateCursor();
    });

    // ===== 关闭 =====
    function closeLightbox() {
        overlay.style.animation = 'none';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.15s ease';
        document.removeEventListener('keydown', onKeyDown);
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 150);
    }

    overlay.addEventListener('click', (e) => {
        // 拖拽结束时不触发关闭（判断鼠标是否有明显移动）
        if (e.target === overlay && !isDragging) closeLightbox();
    });
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    // ESC 关闭 / 双击恢复的键盘支持
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === '0') {
            // 按 0 恢复原始大小
            scale = 1;
            translateX = 0;
            translateY = 0;
            applyTransform();
            showZoomTip();
            updateCursor();
        }
    }
    document.addEventListener('keydown', onKeyDown);
}

// ===== 代码块复制按钮 =====
function bindCodeCopyButtons(root) {
    const scope = root || document;
    const copyBtns = scope.querySelectorAll ? scope.querySelectorAll('.code-copy-btn') : [];
    copyBtns.forEach(btn => {
        if (btn.dataset.copyBound) return;
        btn.dataset.copyBound = 'true';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const codeBlock = btn.closest('.code-block');
            if (!codeBlock) return;
            const codeEl = codeBlock.querySelector('code');
            if (!codeEl) return;
            const text = codeEl.textContent;
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '✅ 已复制';
                setTimeout(() => { btn.textContent = '📋 复制'; }, 2000);
            }).catch(() => {
                // fallback
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.textContent = '✅ 已复制';
                setTimeout(() => { btn.textContent = '📋 复制'; }, 2000);
            });
        });
    });
}

// ===== Mermaid 大图弹窗（缩放+拖拽） =====
function bindMermaidLightbox() {
    const rendered = document.querySelectorAll('.mermaid-rendered');
    rendered.forEach(el => {
        if (el.dataset.lightboxBound) return;
        el.dataset.lightboxBound = 'true';
        el.title = '点击查看大图';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openMermaidLightbox(el);
        });
    });
}

// ===== Graphviz 大图弹窗（复用 Mermaid lightbox） =====
function bindGraphvizLightbox() {
    const rendered = document.querySelectorAll('.graphviz-rendered');
    rendered.forEach(el => {
        if (el.dataset.lightboxBound) return;
        el.dataset.lightboxBound = 'true';
        el.title = '点击查看大图';
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openMermaidLightbox(el);
        });
    });
}

function openMermaidLightbox(mermaidEl) {
    const svgEl = mermaidEl.querySelector('svg');
    if (!svgEl) return;

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTranslateX = 0;
    let dragStartTranslateY = 0;
    const minScale = 0.1;
    const maxScale = 10;
    const scaleStep = 0.15;

    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'mermaid-lightbox-overlay';

    const container = document.createElement('div');
    container.className = 'mermaid-lightbox-container';

    const content = document.createElement('div');
    content.className = 'mermaid-lightbox-content';

    // 克隆 SVG 并恢复原始尺寸（从 viewBox 读取，确保缩放计算准确）
    const clonedSvg = svgEl.cloneNode(true);
    const viewBox = clonedSvg.getAttribute('viewBox');
    if (viewBox) {
        const parts = viewBox.split(/[\s,]+/);
        const vbW = parseFloat(parts[2]);
        const vbH = parseFloat(parts[3]);
        if (vbW && vbH) {
            clonedSvg.setAttribute('width', vbW);
            clonedSvg.setAttribute('height', vbH);
        }
    }
    clonedSvg.style.cssText = 'width: auto; height: auto;';
    content.appendChild(clonedSvg);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mermaid-lightbox-close';
    closeBtn.innerHTML = '&times;';

    // 缩放控制条
    const zoomBar = document.createElement('div');
    zoomBar.className = 'mermaid-lightbox-zoombar';
    zoomBar.innerHTML = `
        <button class="zoom-btn zoom-out" title="缩小 (-)">−</button>
        <span class="zoom-level">100%</span>
        <button class="zoom-btn zoom-in" title="放大 (+)">+</button>
        <button class="zoom-btn zoom-fit" title="适应窗口 (0)">⊡</button>
        <button class="zoom-btn zoom-reset" title="重置 (R)">1:1</button>
    `;

    const hint = document.createElement('div');
    hint.className = 'mermaid-lightbox-hint';
    hint.textContent = '滚轮缩放 · 拖拽移动 · +/-/0 快捷键 · ESC 关闭';

    container.appendChild(content);
    overlay.appendChild(container);
    overlay.appendChild(closeBtn);
    overlay.appendChild(zoomBar);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    const zoomLevelEl = zoomBar.querySelector('.zoom-level');

    function updateTransform() {
        content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        zoomLevelEl.textContent = Math.round(scale * 100) + '%';
    }

    function setScale(newScale, centerX, centerY) {
        const oldScale = scale;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        if (newScale === oldScale) return;

        // 以 centerX/centerY 为中心缩放
        if (centerX !== undefined && centerY !== undefined) {
            const rect = container.getBoundingClientRect();
            const cx = centerX - rect.left - rect.width / 2;
            const cy = centerY - rect.top - rect.height / 2;
            translateX = cx - (cx - translateX) * newScale / oldScale;
            translateY = cy - (cy - translateY) * newScale / oldScale;
        }

        scale = newScale;
        updateTransform();
    }

    function fitToWindow() {
        const svgInLightbox = content.querySelector('svg');
        if (!svgInLightbox) return;
        const containerRect = container.getBoundingClientRect();
        // 使用 SVG 属性或 viewBox 获取原始尺寸（比 getBoundingClientRect 更准确）
        let svgW = parseFloat(svgInLightbox.getAttribute('width')) || 0;
        let svgH = parseFloat(svgInLightbox.getAttribute('height')) || 0;
        if (!svgW || !svgH) {
            const vb = svgInLightbox.getAttribute('viewBox');
            if (vb) {
                const p = vb.split(/[\s,]+/);
                svgW = parseFloat(p[2]) || 0;
                svgH = parseFloat(p[3]) || 0;
            }
        }
        if (!svgW || !svgH) {
            // 最终回退：用 BoundingClientRect 除以当前 scale
            svgW = svgInLightbox.getBoundingClientRect().width / scale;
            svgH = svgInLightbox.getBoundingClientRect().height / scale;
        }
        const padding = 80;
        const fitScale = Math.min(
            (containerRect.width - padding) / svgW,
            (containerRect.height - padding) / svgH,
            2 // 最大不超过 200%
        );
        scale = fitScale;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }

    // 滚轮缩放（以光标为中心）
    function onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
        setScale(scale * (1 + delta), e.clientX, e.clientY);
    }

    // 拖拽
    function onMouseDown(e) {
        if (e.target.closest('.zoom-btn') || e.target === closeBtn || e.target === closeBtn.firstChild) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartTranslateX = translateX;
        dragStartTranslateY = translateY;
        container.classList.add('grabbing');
    }

    function onMouseMove(e) {
        if (!isDragging) return;
        translateX = dragStartTranslateX + (e.clientX - dragStartX);
        translateY = dragStartTranslateY + (e.clientY - dragStartY);
        updateTransform();
    }

    function onMouseUp() {
        if (isDragging) {
            isDragging = false;
            container.classList.remove('grabbing');
        }
    }

    // 关闭
    function closeLightbox() {
        overlay.removeEventListener('wheel', onWheel);
        overlay.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('keydown', onKeyDown);
        overlay.remove();
    }

    // 键盘快捷键
    function onKeyDown(e) {
        if (e.key === 'Escape') { closeLightbox(); return; }
        if (e.key === '+' || e.key === '=') {
            const rect = container.getBoundingClientRect();
            setScale(scale * (1 + scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
            return;
        }
        if (e.key === '-' || e.key === '_') {
            const rect = container.getBoundingClientRect();
            setScale(scale * (1 - scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
            return;
        }
        if (e.key === '0') { fitToWindow(); return; }
        if (e.key === 'r' || e.key === 'R') { scale = 1; translateX = 0; translateY = 0; updateTransform(); return; }
    }

    // 缩放控制条事件
    zoomBar.querySelector('.zoom-out').addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        setScale(scale * (1 - scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    zoomBar.querySelector('.zoom-in').addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        setScale(scale * (1 + scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    zoomBar.querySelector('.zoom-fit').addEventListener('click', (e) => { e.stopPropagation(); fitToWindow(); });
    zoomBar.querySelector('.zoom-reset').addEventListener('click', (e) => { e.stopPropagation(); scale = 1; translateX = 0; translateY = 0; updateTransform(); });

    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
    overlay.addEventListener('dblclick', (e) => {
        if (e.target === overlay) closeLightbox();
    });
    // 单击空白区域关闭（区分拖拽和点击）
    let clickStartX = 0, clickStartY = 0;
    overlay.addEventListener('mousedown', (e) => { clickStartX = e.clientX; clickStartY = e.clientY; });
    overlay.addEventListener('click', (e) => {
        const dx = Math.abs(e.clientX - clickStartX);
        const dy = Math.abs(e.clientY - clickStartY);
        if (dx < 5 && dy < 5 && e.target === overlay) closeLightbox();
    });

    overlay.addEventListener('wheel', onWheel, { passive: false });
    overlay.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);

    // 打开后自动适应窗口
    requestAnimationFrame(() => fitToWindow());
}


export {
    bindImageLightbox, openImageLightbox, bindCodeCopyButtons,
    bindMermaidLightbox, bindGraphvizLightbox, openMermaidLightbox,
};
