/**
 * annotations.js - 批注交互模块
 * 处理文本选择、右键菜单、评论弹窗、批注管理
 * 修复：删除功能中 currentSelection 被意外清除的问题
 */
const Annotations = (() => {
    let currentSelection = null; // { text, blockIndex, startOffset, endOffset, range }
    let pendingImages = [];
    let selectionTooltip = null;
    let blocks = [];
    let editingAnnotationId = null;
    let currentSortMode = 'time'; // 'position' | 'time'

    function init(parsedBlocks) {
        blocks = parsedBlocks;
        setupTextSelection();
        setupContextMenu();
        setupCommentModal();
        setupInsertModal();
        setupAnnotationClicks();
        setupSortSelect();
    }

    // ===== 排序选择器 =====
    function setupSortSelect() {
        const sortSelect = document.getElementById('sortSelect');
        if (!sortSelect) return;
        // 恢复之前选择的排序方式
        sortSelect.value = currentSortMode;
        // 移除旧监听器（防止 init 多次调用时重复绑定）
        sortSelect.onchange = null;
        sortSelect.onchange = (e) => {
            currentSortMode = e.target.value;
            renderAnnotationsList();
        };
    }

    /**
     * 检查当前是否处于 WYSIWYG 编辑模式
     * 编辑模式下应禁用批注选区
     */
    function isWysiwygEditing() {
        const docContent = document.getElementById('documentContent');
        return docContent && docContent.contentEditable === 'true';
    }

    /**
     * 计算选区在块内的全局文本偏移量
     * 遍历块（.md-block）内所有文本节点，累加到目标节点之前的文本长度 + 节点内偏移
     */
    function computeGlobalOffset(container, targetNode, localOffset) {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        let globalOffset = 0;
        while (walker.nextNode()) {
            if (walker.currentNode === targetNode) {
                return globalOffset + localOffset;
            }
            globalOffset += walker.currentNode.textContent.length;
        }
        // fallback：如果没找到精确节点，返回 localOffset
        return localOffset;
    }

    /**
     * 找到 Range 端点所属的 .md-block 容器
     */
    function findBlockContainer(node) {
        let el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains('md-block')) return el;
            el = el.parentNode;
        }
        return null;
    }

    // ===== 文本选择 =====
    function setupTextSelection() {
        const content = document.getElementById('documentContent');

        content.addEventListener('mouseup', (e) => {
            // WYSIWYG 编辑模式下不触发批注选区
            if (isWysiwygEditing()) return;
            if (e.target.classList.contains('annotation-indicator') ||
                e.target.classList.contains('highlight-comment') ||
                e.target.classList.contains('highlight-delete') ||
                e.target.classList.contains('insert-marker')) {
                return;
            }

            setTimeout(() => {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed) {
                    hideSelectionTooltip();
                    return;
                }
                // 允许选中空行/空列表项：原始文本不 trim，只检查 isCollapsed
                const rawText = selection.toString();
                // 完全无内容（长度为0）才跳过
                if (rawText.length === 0) {
                    hideSelectionTooltip();
                    return;
                }
                const text = rawText.trim() || rawText; // trim 后为空则保留原始文本（含空白）
                const range = selection.getRangeAt(0);
                const blockIndex = Renderer.getBlockIndex(range.startContainer);
                const endBlockIndex = Renderer.getBlockIndex(range.endContainer);

                if (blockIndex < 0) {
                    hideSelectionTooltip();
                    return;
                }

                // 计算块内全局偏移量（而非仅文本节点内偏移）
                const startBlock = findBlockContainer(range.startContainer);
                const endBlock = findBlockContainer(range.endContainer);
                const globalStartOffset = startBlock
                    ? computeGlobalOffset(startBlock, range.startContainer, range.startOffset)
                    : range.startOffset;
                const globalEndOffset = endBlock
                    ? computeGlobalOffset(endBlock, range.endContainer, range.endOffset)
                    : range.endOffset;

                currentSelection = {
                    text,
                    blockIndex,
                    endBlockIndex: endBlockIndex >= 0 ? endBlockIndex : blockIndex,
                    startOffset: globalStartOffset,
                    endOffset: globalEndOffset,
                    range: range.cloneRange()
                };

                showSelectionTooltip(e.clientX, e.clientY);
            }, 10);
        });

        document.addEventListener('mousedown', (e) => {
            if (selectionTooltip && !selectionTooltip.contains(e.target)) {
                hideSelectionTooltip();
            }
        });
    }

    function showSelectionTooltip(x, y) {
        hideSelectionTooltip();

        selectionTooltip = document.createElement('div');
        selectionTooltip.className = 'selection-tooltip';
        selectionTooltip.innerHTML = `
            <button data-action="comment">💬 评论</button>
            <button data-action="delete">🗑️ 删除</button>
            <button data-action="insert">➕ 插入</button>
        `;

        selectionTooltip.style.left = Math.min(x, window.innerWidth - 250) + 'px';
        selectionTooltip.style.top = (y - 45) + 'px';

        // 使用 mousedown + preventDefault 防止点击按钮时清除选区
        selectionTooltip.addEventListener('mousedown', (e) => {
            e.preventDefault(); // 阻止默认行为，保留当前选区
        });

        selectionTooltip.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();
            const action = btn.dataset.action;
            // 先保存 selection 引用，因为后续操作可能改变它
            const savedSelection = currentSelection ? { ...currentSelection } : null;
            if (action === 'comment') {
                openCommentModal();
            } else if (action === 'delete') {
                // 确保 currentSelection 存在
                if (!currentSelection && savedSelection) {
                    currentSelection = savedSelection;
                }
                markDelete();
            } else if (action === 'insert') {
                openInsertModal();
            }
            hideSelectionTooltip();
        });

        document.body.appendChild(selectionTooltip);
    }

    function hideSelectionTooltip() {
        if (selectionTooltip) {
            selectionTooltip.remove();
            selectionTooltip = null;
        }
    }

    // ===== 右键菜单 =====
    function setupContextMenu() {
        const content = document.getElementById('documentContent');
        const menu = document.getElementById('contextMenu');

        content.addEventListener('contextmenu', (e) => {
            // WYSIWYG 编辑模式下不触发批注右键菜单
            if (isWysiwygEditing()) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                return;
            }
            const rawText = selection.toString();
            if (rawText.length === 0) return;

            e.preventDefault();

            const text = rawText.trim() || rawText;
            const range = selection.getRangeAt(0);
            const blockIndex = Renderer.getBlockIndex(range.startContainer);
            const endBlockIndex = Renderer.getBlockIndex(range.endContainer);

            if (blockIndex < 0) return;

            // 计算块内全局偏移量
            const startBlock = findBlockContainer(range.startContainer);
            const endBlock = findBlockContainer(range.endContainer);
            const globalStartOffset = startBlock
                ? computeGlobalOffset(startBlock, range.startContainer, range.startOffset)
                : range.startOffset;
            const globalEndOffset = endBlock
                ? computeGlobalOffset(endBlock, range.endContainer, range.endOffset)
                : range.endOffset;

            currentSelection = {
                text,
                blockIndex,
                endBlockIndex: endBlockIndex >= 0 ? endBlockIndex : blockIndex,
                startOffset: globalStartOffset,
                endOffset: globalEndOffset,
                range: range.cloneRange()
            };

            menu.style.display = 'block';
            menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
            menu.style.top = Math.min(e.clientY, window.innerHeight - 150) + 'px';
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        document.getElementById('menuAddComment').addEventListener('click', () => {
            menu.style.display = 'none';
            openCommentModal();
        });

        document.getElementById('menuMarkDelete').addEventListener('click', () => {
            menu.style.display = 'none';
            markDelete();
        });

        document.getElementById('menuAddInsert').addEventListener('click', () => {
            menu.style.display = 'none';
            openInsertModal();
        });
    }

    // ===== 评论弹窗 =====
    function setupCommentModal() {
        const modal = document.getElementById('commentModal');
        const uploadZone = document.getElementById('imageUploadZone');
        const imageInput = document.getElementById('imageInput');

        document.getElementById('btnCloseModal').addEventListener('click', closeCommentModal);
        document.getElementById('btnCancelComment').addEventListener('click', closeCommentModal);
        document.getElementById('btnSubmitComment').addEventListener('click', submitComment);

        uploadZone.addEventListener('click', () => imageInput.click());
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            handleImageFiles(e.dataTransfer.files);
        });
        imageInput.addEventListener('change', () => {
            handleImageFiles(imageInput.files);
            imageInput.value = '';
        });

        // ===== 粘贴图片支持 =====
        // 在整个弹窗范围内监听 paste 事件，支持 Ctrl+V 粘贴图片
        modal.addEventListener('paste', (e) => {
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;

            const imageFiles = [];
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault(); // 阻止默认粘贴行为（避免图片被粘贴到 textarea）
                handleImageFiles(imageFiles);
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCommentModal();
        });
    }

    function openCommentModal(editId) {
        editingAnnotationId = editId || null;

        if (editingAnnotationId) {
            const ann = Store.getAnnotations().find(a => a.id === editingAnnotationId);
            if (!ann) return;
            pendingImages = ann.images ? [...ann.images] : [];
            document.getElementById('selectedTextPreview').textContent = ann.selectedText;
            document.getElementById('commentText').value = ann.comment || '';
            document.getElementById('commentModalTitle').textContent = '编辑评论';
        } else {
            if (!currentSelection) return;
            pendingImages = [];
            document.getElementById('selectedTextPreview').textContent = currentSelection.text;
            document.getElementById('commentText').value = '';
            document.getElementById('commentModalTitle').textContent = '添加评论';
        }

        renderImagePreviews();
        document.getElementById('commentModal').style.display = 'flex';

        setTimeout(() => document.getElementById('commentText').focus(), 100);
    }

    function closeCommentModal() {
        document.getElementById('commentModal').style.display = 'none';
        pendingImages = [];
        currentSelection = null;
        editingAnnotationId = null;
    }

    function submitComment() {
        const comment = document.getElementById('commentText').value.trim();
        if (!comment && pendingImages.length === 0) {
            document.getElementById('commentText').focus();
            return;
        }

        if (editingAnnotationId) {
            Store.updateAnnotation(editingAnnotationId, {
                comment: comment,
                images: [...pendingImages]
            });
        } else {
            if (!currentSelection) return;
            Store.addAnnotation({
                type: 'comment',
                selectedText: currentSelection.text,
                blockIndex: currentSelection.blockIndex,
                endBlockIndex: currentSelection.endBlockIndex || currentSelection.blockIndex,
                startOffset: currentSelection.startOffset,
                endOffset: currentSelection.endOffset,
                comment: comment,
                images: [...pendingImages]
            });
        }

        closeCommentModal();
        refreshView();
    }

    function handleImageFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                pendingImages.push(e.target.result);
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderImagePreviews() {
        const container = document.getElementById('imagePreviews');
        container.innerHTML = pendingImages.map((img, i) => `
            <div class="image-preview-item">
                <img src="${img}" alt="预览${i}">
                <button class="remove-image" data-index="${i}">&times;</button>
            </div>
        `).join('');

        container.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                pendingImages.splice(parseInt(btn.dataset.index), 1);
                renderImagePreviews();
            });
        });
    }

    // ===== 标记删除 =====
    function markDelete() {
        if (!currentSelection) {
            console.warn('[annotations] markDelete: currentSelection 为空，无法标记删除');
            return;
        }

        Store.addAnnotation({
            type: 'delete',
            selectedText: currentSelection.text,
            blockIndex: currentSelection.blockIndex,
            endBlockIndex: currentSelection.endBlockIndex || currentSelection.blockIndex,
            startOffset: currentSelection.startOffset,
            endOffset: currentSelection.endOffset,
            comment: '',
            images: []
        });

        currentSelection = null;
        window.getSelection().removeAllRanges();
        refreshView();
    }

    // ===== 插入内容弹窗 =====
    function setupInsertModal() {
        const modal = document.getElementById('insertModal');

        document.getElementById('btnCloseInsertModal').addEventListener('click', closeInsertModal);
        document.getElementById('btnCancelInsert').addEventListener('click', closeInsertModal);
        document.getElementById('btnSubmitInsert').addEventListener('click', submitInsert);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeInsertModal();
        });
    }

    let editingInsertId = null;

    function openInsertModal() {
        if (!currentSelection) return;
        editingInsertId = null;

        document.getElementById('insertPositionPreview').textContent = currentSelection.text;
        document.getElementById('insertText').value = '';
        document.getElementById('insertReason').value = '';
        document.getElementById('insertModal').style.display = 'flex';

        setTimeout(() => document.getElementById('insertText').focus(), 100);
    }

    function openInsertModalForEdit(id) {
        const ann = Store.getAnnotations().find(a => a.id === id);
        if (!ann) return;
        editingInsertId = id;

        document.getElementById('insertPositionPreview').textContent = ann.selectedText;
        document.getElementById('insertText').value = ann.insertContent || '';
        document.getElementById('insertReason').value = ann.comment || '';
        document.getElementById('insertModal').style.display = 'flex';

        setTimeout(() => document.getElementById('insertText').focus(), 100);
    }

    function closeInsertModal() {
        document.getElementById('insertModal').style.display = 'none';
        currentSelection = null;
        editingInsertId = null;
    }

    function submitInsert() {
        const insertContent = document.getElementById('insertText').value.trim();
        const insertReason = document.getElementById('insertReason').value.trim();
        if (!insertContent) {
            document.getElementById('insertText').focus();
            return;
        }

        if (editingInsertId) {
            Store.updateAnnotation(editingInsertId, {
                insertContent: insertContent,
                comment: insertReason
            });
        } else {
            if (!currentSelection) return;
            Store.addAnnotation({
                type: 'insert',
                selectedText: currentSelection.text,
                blockIndex: currentSelection.blockIndex,
                endBlockIndex: currentSelection.endBlockIndex || currentSelection.blockIndex,
                startOffset: currentSelection.endOffset,
                endOffset: currentSelection.endOffset,
                comment: insertReason,
                insertContent: insertContent,
                images: []
            });
        }

        closeInsertModal();
        refreshView();
    }

    // ===== 批注点击 =====
    function setupAnnotationClicks() {
        document.getElementById('documentContent').addEventListener('click', (e) => {
            const indicator = e.target.closest('[data-annotation-id]');
            if (!indicator) return;
            const id = parseInt(indicator.dataset.annotationId);
            scrollToAnnotationCard(id);
        });
    }

    function scrollToAnnotationCard(id) {
        const card = document.querySelector(`.annotation-card[data-id="${id}"]`);
        if (card) {
            document.querySelectorAll('.annotation-card.active').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ===== 渲染批注列表 =====
    function renderAnnotationsList() {
        const list = document.getElementById('annotationsList');
        const annotations = Store.getAnnotations();

        // 根据当前排序模式排序
        let sortedAnnotations;
        if (currentSortMode === 'time') {
            // 按批阅时间逆序（最新的在前）
            sortedAnnotations = [...annotations].sort((a, b) => {
                const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return timeB - timeA;
            });
        } else {
            // 按文档位置排序：blockIndex 升序 → startOffset 升序
            sortedAnnotations = [...annotations].sort((a, b) => {
                if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
                return (a.startOffset || 0) - (b.startOffset || 0);
            });
        }

        if (sortedAnnotations.length === 0) {
            list.innerHTML = `
                <div class="empty-annotations">
                    <p>暂无批注</p>
                    <p class="hint">选中文本后即可添加批注</p>
                </div>
            `;
            document.getElementById('annotationCount').textContent = '0 条批注';
            return;
        }

        document.getElementById('annotationCount').textContent = `${sortedAnnotations.length} 条批注`;

        list.innerHTML = sortedAnnotations.map(ann => {
            const typeLabel = ann.type === 'comment' ? '评论' : ann.type === 'delete' ? '删除' : '插入';
            const imagesHtml = (ann.images && ann.images.length > 0)
                ? `<div class="annotation-images">${ann.images.map(img => `<img src="${img}" alt="附图" data-lightbox>`).join('')}</div>`
                : '';
            const commentHtml = ann.comment
                ? `<div class="annotation-comment">${escapeHtml(ann.comment)}</div>`
                : '';
            const insertHtml = (ann.type === 'insert' && ann.insertContent)
                ? `<div class="annotation-insert-content">📝 ${escapeHtml(ann.insertContent)}</div>`
                : '';
            const time = new Date(ann.timestamp).toLocaleString('zh-CN', {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="annotation-card type-${ann.type}" data-id="${ann.id}">
                    <div class="annotation-card-header">
                        <span class="annotation-type ${ann.type}">#${ann.id} ${typeLabel}</span>
                        <span class="annotation-index">块 ${ann.blockIndex + 1}</span>
                    </div>
                    <div class="annotation-selected-text">${ann.type === 'insert' ? '📍 在此之后插入：' : ''}${escapeHtml(ann.selectedText)}</div>
                    ${commentHtml}
                    ${insertHtml}
                    ${imagesHtml}
                    <div class="annotation-card-footer">
                        <span class="annotation-time">${time}</span>
                        <div class="annotation-actions">
                            ${ann.type !== 'delete' ? `<button data-edit="${ann.id}">编辑</button>` : ''}
                            <button data-remove="${ann.id}">删除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 绑定编辑
        list.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.edit);
                const ann = Store.getAnnotations().find(a => a.id === id);
                if (!ann) return;
                if (ann.type === 'insert') {
                    openInsertModalForEdit(id);
                } else {
                    openCommentModal(id);
                }
            });
        });

        // 绑定删除批注
        list.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const id = parseInt(btn.dataset.remove);
                if (isNaN(id)) return;
                Store.removeAnnotation(id);
                refreshView();
            });
        });

        // 绑定卡片点击 → 滚动到文档对应位置
        list.querySelectorAll('.annotation-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('[data-remove]') || e.target.closest('[data-edit]') || e.target.closest('[data-lightbox]')) return;
                const id = parseInt(card.dataset.id);
                // 优先查找高亮 span（含 fallback marker）
                let highlight = document.querySelector(`span.highlight-comment[data-annotation-id="${id}"], span.highlight-delete[data-annotation-id="${id}"], span.insert-marker[data-annotation-id="${id}"]`);

                if (!highlight) {
                    // 查找 fallback marker
                    highlight = document.querySelector(`span.annotation-fallback-marker[data-annotation-id="${id}"]`);
                }

                if (!highlight) {
                    // 最终 fallback：定位到对应的 md-block
                    const ann = Store.getAnnotations().find(a => a.id === id);
                    if (ann) {
                        const block = document.querySelector(`.md-block[data-block-index="${ann.blockIndex}"]`);
                        if (block) {
                            block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            block.style.transition = 'background 0.3s';
                            block.style.background = 'rgba(79, 70, 229, 0.12)';
                            setTimeout(() => { block.style.background = ''; }, 1500);
                        }
                    }
                } else {
                    // 定位到 highlight 元素（如果是 fallback marker 则定位其父元素）
                    const target = highlight.style.display === 'none' ? highlight.parentElement : highlight;
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.style.transition = 'background 0.3s';
                        target.style.background = 'rgba(79, 70, 229, 0.4)';
                        setTimeout(() => { target.style.background = ''; }, 1500);
                    }
                }
                document.querySelectorAll('.annotation-card.active').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });

        // 图片大图查看
        list.querySelectorAll('[data-lightbox]').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                showLightbox(img.src);
            });
        });
    }

    function showLightbox(src) {
        const lb = document.createElement('div');
        lb.className = 'image-lightbox';
        lb.innerHTML = `<img src="${src}" alt="大图">`;
        lb.addEventListener('click', () => lb.remove());
        document.body.appendChild(lb);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function refreshView() {
        const data = Store.getData();
        Renderer.renderBlocks(blocks, data.annotations);
        renderAnnotationsList();
        updateToolbarState();
        if (typeof window._updateExpandBadge === 'function') {
            window._updateExpandBadge();
        }
    }

    function setBlocks(b) {
        blocks = b;
    }

    function updateToolbarState() {
        const hasAnnotations = Store.getAnnotations().length > 0;
        document.getElementById('btnExport').disabled = !hasAnnotations;
        document.getElementById('btnClearAll').disabled = !hasAnnotations;
        const applyBtn = document.getElementById('btnApplyReview');
        if (applyBtn) applyBtn.disabled = !hasAnnotations;
    }

    return {
        init, renderAnnotationsList, refreshView, setBlocks, updateToolbarState
    };
})();
