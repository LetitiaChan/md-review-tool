/**
 * app.js - 应用主控模块（VSCode 插件版）
 * 初始化、事件绑定、流程控制
 * 通过 postMessage 与 Extension Host 通信
 */
(() => {
    let blocks = [];
    let serverFileList = [];
    let currentMode = 'preview';
    let editorDirty = false;
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1500;
    let tocScrollTimer = null;
    let tocCollapsed = false;
    let tocRefreshTimer = null;
    const TOC_REFRESH_DELAY = 800;

    // ===== postMessage 通信辅助 =====
    const _pendingRequests = new Map();

    function callHost(type, payload) {
        return new Promise((resolve, reject) => {
            const requestId = type + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            _pendingRequests.set(requestId, { resolve, reject });
            vscode.postMessage({ type, payload, requestId });
            setTimeout(() => {
                if (_pendingRequests.has(requestId)) {
                    _pendingRequests.delete(requestId);
                    reject(new Error('请求超时: ' + type));
                }
            }, 15000);
        });
    }

    // ===== 消息监听 =====
    window.addEventListener('message', event => {
        const message = event.data;
        if (!message || !message.type) return;

        // 处理带 requestId 的响应
        if (message.requestId && _pendingRequests.has(message.requestId)) {
            const { resolve } = _pendingRequests.get(message.requestId);
            _pendingRequests.delete(message.requestId);
            resolve(message.payload);
            return;
        }

        // 处理推送消息
        switch (message.type) {
            case 'fileContent':
                handleFileContentPush(message.payload);
                break;
            case 'fileChanged':
                showFileChangeBadge();
                break;
            case 'triggerExport':
                if (Store.getAnnotations().length > 0) {
                    Exporter.exportReviewDocument();
                }
                break;
            case 'imageUris':
                Renderer.setImageUriCache(message.payload);
                refreshCurrentView();
                break;
        }
    });

    function handleFileContentPush(data) {
        if (data.error) {
            showNotification('❌ 加载文件失败: ' + data.error);
            return;
        }
        loadDocument(data.name, data.content, true, undefined, data.docVersion, data.sourceFilePath, data.sourceDir);
        requestImageUris(data.content, data.sourceDir);
    }

    // ===== 初始化 =====
    async function init() {
        bindEvents();

        // 从 Webview state 恢复数据
        const data = Store.load();
        if (data.rawMarkdown) {
            loadDocument(data.fileName, data.rawMarkdown, false);
            if (data.annotations && data.annotations.length > 0) {
                Exporter.triggerAutoSave();
            }
        }

        // 通知 Extension Host webview 已就绪
        vscode.postMessage({ type: 'ready' });

        // 异步从 Host 加载文件列表
        loadFileList();

        // 启用自动保存
        Exporter.enableAutoSave();
    }

    async function loadFileList() {
        try {
            const result = await callHost('getFiles', {});
            if (result && result.files && result.files.length > 0) {
                serverFileList = result.files;
                updateServerFileSelect();
                document.getElementById('fileSelectorGroup').style.display = 'flex';
            }
        } catch (e) {
            console.warn('[App] 加载文件列表失败:', e);
        }
    }

    // ===== 请求图片 URI 批量转换 =====
    function requestImageUris(markdown, sourceDir) {
        const html = marked.parse(markdown);
        const paths = Renderer.collectRelativeImagePaths(html);
        if (paths.length > 0 && sourceDir) {
            vscode.postMessage({
                type: 'resolveImageUris',
                payload: { imagePaths: paths, basePath: sourceDir }
            });
        }
    }

    // ===== 文件选择下拉框 =====
    function updateServerFileSelect() {
        const select = document.getElementById('fileSelect');
        select.innerHTML = '<option value="">-- 选择文件 --</option>';
        serverFileList.forEach((name) => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    }

    // ===== 事件绑定 =====
    function bindEvents() {
        document.getElementById('fileSelect').addEventListener('change', handleFileSelectChange);
        document.getElementById('btnRefresh').addEventListener('click', handleRefresh);

        document.getElementById('btnPreviewMode').addEventListener('click', () => switchMode('preview'));
        document.getElementById('btnEditMode').addEventListener('click', () => switchMode('edit'));

        document.getElementById('btnSaveMd').addEventListener('click', handleSaveMd);

        document.getElementById('documentContent').addEventListener('input', () => {
            if (currentMode === 'edit') {
                editorDirty = true;
                updateEditStatus('modified', '● 未保存');
                scheduleAutoSave();
                scheduleTocRefresh();
            }
        });

        // WYSIWYG 工具栏
        document.getElementById('wysiwygToolbar').addEventListener('click', (e) => {
            const btn = e.target.closest('.wysiwyg-btn');
            if (!btn) return;
            e.preventDefault();
            const command = btn.dataset.command;
            const value = btn.dataset.value || null;
            if (command === 'heading' || command === 'formatBlock') {
                document.execCommand('formatBlock', false, value);
            } else {
                document.execCommand(command, false, value);
            }
            document.getElementById('documentContent').focus();
        });

        setupTableContextMenu();

        // 导出
        document.getElementById('btnExport').addEventListener('click', async () => {
            await Exporter.exportReviewDocument();
        });

        // 清除所有 — 弹出自定义确认弹窗
        document.getElementById('btnClearAll').addEventListener('click', () => {
            document.getElementById('clearAllModal').style.display = 'flex';
        });
        document.getElementById('btnCloseClearAll').addEventListener('click', () => {
            document.getElementById('clearAllModal').style.display = 'none';
        });
        document.getElementById('btnCancelClearAll').addEventListener('click', () => {
            document.getElementById('clearAllModal').style.display = 'none';
        });
        document.getElementById('btnConfirmClearAll').addEventListener('click', async () => {
            document.getElementById('clearAllModal').style.display = 'none';
            const fileName = Store.getData().fileName;
            Store.clearAll();
            Annotations.refreshView();
            // 同时删除磁盘上的批阅记录文件，防止重新打开时恢复
            if (fileName) {
                try {
                    await callHost('deleteReviewRecords', { fileName });
                } catch (e) {
                    console.warn('[App] 删除批阅记录文件失败:', e);
                }
            }
        });

        // 一键AI修复
        document.getElementById('btnApplyReview').addEventListener('click', handleApplyReview);
        document.getElementById('btnCancelApply').addEventListener('click', () => {
            document.getElementById('applyConfirmModal').style.display = 'none';
        });
        document.getElementById('btnCloseApplyConfirm').addEventListener('click', () => {
            document.getElementById('applyConfirmModal').style.display = 'none';
        });
        document.getElementById('btnConfirmApply').addEventListener('click', executeApplyReview);
        document.getElementById('btnCloseApplyResult').addEventListener('click', () => {
            document.getElementById('applyResultModal').style.display = 'none';
        });
        document.getElementById('btnCloseResultOk').addEventListener('click', () => {
            document.getElementById('applyResultModal').style.display = 'none';
        });

        // 帮助
        document.getElementById('btnHelp').addEventListener('click', () => {
            document.getElementById('helpModal').style.display = 'flex';
        });
        document.getElementById('btnCloseHelp').addEventListener('click', () => {
            document.getElementById('helpModal').style.display = 'none';
        });
        document.getElementById('btnCloseHelpOk').addEventListener('click', () => {
            document.getElementById('helpModal').style.display = 'none';
        });

        // 收起/展开侧边栏
        document.getElementById('btnCollapsePanel').addEventListener('click', () => toggleAnnotationsPanel(false));
        document.getElementById('btnExpandPanel').addEventListener('click', () => toggleAnnotationsPanel(true));

        // 目录面板
        document.getElementById('btnCollapseToc').addEventListener('click', () => toggleTocPanel(false));
        document.getElementById('btnExpandToc').addEventListener('click', () => toggleTocPanel(true));

        document.getElementById('documentContent').addEventListener('scroll', () => {
            if (tocScrollTimer) clearTimeout(tocScrollTimer);
            tocScrollTimer = setTimeout(() => updateTocActiveItem(), 80);
        });

        // 快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('commentModal').style.display = 'none';
                document.getElementById('insertModal').style.display = 'none';
                document.getElementById('contextMenu').style.display = 'none';
                document.getElementById('applyConfirmModal').style.display = 'none';
                document.getElementById('applyResultModal').style.display = 'none';
                document.getElementById('helpModal').style.display = 'none';
            }
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                if (Store.getAnnotations().length > 0) {
                    Exporter.exportReviewDocument();
                }
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (currentMode === 'edit' && editorDirty) {
                    clearAutoSaveTimer();
                    handleSaveMd();
                }
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
                e.preventDefault();
                const data = Store.getData();
                if (data.rawMarkdown) {
                    switchMode(currentMode === 'preview' ? 'edit' : 'preview');
                }
            }
        });
    }


    // ===== 文件选择变更 =====
    async function handleFileSelectChange(e) {
        const value = e.target.value;
        if (!value) return;

        if (currentMode === 'edit' && editorDirty) {
            clearAutoSaveTimer();
            await handleSaveMd();
        }
        if (currentMode === 'edit') {
            editorDirty = false;
            switchMode('preview');
        }

        try {
            // 先尝试从批阅文件恢复
            const records = await callHost('getReviewRecords', { fileName: value });
            if (records && records.records && records.records.length > 0) {
                const fileData = await callHost('readFile', { filePath: value });
                if (fileData && !fileData.error) {
                    const matchedRecord = records.records[0];
                    if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
                        loadDocument(fileData.name, fileData.content, true, undefined, fileData.docVersion, fileData.sourceFilePath, fileData.sourceDir);
                        requestImageUris(fileData.content, fileData.sourceDir);
                        Store.restoreFromReviewRecord(matchedRecord, fileData.name, fileData.content, fileData.docVersion);
                        const newBlocks = Renderer.parseMarkdown(fileData.content);
                        Renderer.renderBlocks(newBlocks, Store.getAnnotations());
                        Annotations.setBlocks(newBlocks);
                        Annotations.init(newBlocks);
                        Annotations.renderAnnotationsList();
                        Annotations.updateToolbarState();
                        showNotification(`📂 已从批阅文件恢复 ${matchedRecord.annotations.length} 条批注`);
                        return;
                    }
                }
            }

            // 正常加载
            const data = await callHost('readFile', { filePath: value });
            if (data && !data.error) {
                loadDocument(data.name, data.content, true, undefined, data.docVersion, data.sourceFilePath, data.sourceDir);
                requestImageUris(data.content, data.sourceDir);
            }
        } catch (e) {
            console.error('[App] 加载文件失败:', e);
            showNotification('加载文件失败');
        }
    }

    // ===== 刷新 =====
    async function handleRefresh() {
        const currentData = Store.getData();
        if (!currentData.fileName) return;

        try {
            const filePath = currentData.sourceFilePath || currentData.fileName;
            const data = await callHost('readFile', { filePath });
            if (data && !data.error) {
                const contentChanged = data.content.trim() !== currentData.rawMarkdown.trim();
                if (contentChanged) {
                    loadDocument(data.name, data.content, true, undefined, data.docVersion, data.sourceFilePath, data.sourceDir);
                    showNotification('文件已更新，已创建新的批阅版本');
                } else {
                    loadDocument(data.name, data.content, false, undefined, data.docVersion, data.sourceFilePath, data.sourceDir);
                    showNotification('文件已重新加载');
                }
                requestImageUris(data.content, data.sourceDir);
                hideFileChangeBadge();

                // 从磁盘批阅记录恢复批注（确保批注列表与磁盘同步）
                try {
                    const records = await callHost('getReviewRecords', { fileName: data.name });
                    if (records && records.records && records.records.length > 0) {
                        const matchedRecord = records.records[0];
                        if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
                            Store.restoreFromReviewRecord(matchedRecord, data.name, data.content, data.docVersion);
                            const newBlocks = Renderer.parseMarkdown(data.content);
                            Renderer.renderBlocks(newBlocks, Store.getAnnotations());
                            Annotations.setBlocks(newBlocks);
                            Annotations.init(newBlocks);
                            Annotations.renderAnnotationsList();
                            Annotations.updateToolbarState();
                        }
                    }
                } catch (e) {
                    console.warn('[App] 刷新时恢复批阅记录失败:', e);
                }

                // 刷新文件列表
                loadFileList();
            }
        } catch (e) {
            showNotification('刷新失败: ' + e.message);
        }
    }

    // ===== 加载文档 =====
    function loadDocument(fileName, markdown, isNew, fileHash, docVersion, sourceFilePath, sourceDir) {
        if (isNew) {
            Store.setFile(fileName, markdown, fileHash, docVersion, sourceFilePath, sourceDir);
        }

        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('editorContainer').style.display = 'flex';
        const storeData = Store.getData();
        const versionLabel = storeData.docVersion ? ` (${storeData.docVersion})` : '';
        document.getElementById('fileName').textContent = fileName + versionLabel;

        updateFileSelectHighlight(fileName);

        blocks = Renderer.parseMarkdown(markdown);
        const data = Store.getData();
        Renderer.renderBlocks(blocks, data.annotations);

        Annotations.setBlocks(blocks);
        Annotations.init(blocks);
        Annotations.renderAnnotationsList();
        Annotations.updateToolbarState();

        refreshToc();
    }

    function refreshCurrentView() {
        const data = Store.getData();
        if (!data.rawMarkdown) return;
        blocks = Renderer.parseMarkdown(data.rawMarkdown);
        Renderer.renderBlocks(blocks, data.annotations);
        Annotations.setBlocks(blocks);
        Annotations.init(blocks);
        Annotations.renderAnnotationsList();
        Annotations.updateToolbarState();
        refreshToc();
    }

    // ===== 文件选择下拉框高亮 =====
    function updateFileSelectHighlight(fileName) {
        const select = document.getElementById('fileSelect');
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === fileName || select.options[i].textContent === fileName) {
                select.value = select.options[i].value;
                return;
            }
        }
    }

    // ===== 切换批注面板 =====
    function toggleAnnotationsPanel(show) {
        const panel = document.getElementById('annotationsPanel');
        const expandBtn = document.getElementById('btnExpandPanel');
        if (show) {
            panel.classList.remove('collapsed');
            expandBtn.style.display = 'none';
        } else {
            panel.classList.add('collapsed');
            expandBtn.style.display = 'flex';
            updateExpandBadge();
        }
    }

    function updateExpandBadge() {
        const badge = document.getElementById('expandBadge');
        const count = Store.getAnnotations().length;
        badge.textContent = count > 0 ? count : '';
    }

    window._updateExpandBadge = updateExpandBadge;

    // ===== 文件变更提示 =====
    function showFileChangeBadge() {
        document.getElementById('fileChangeBadge').style.display = 'inline-block';
    }

    function hideFileChangeBadge() {
        document.getElementById('fileChangeBadge').style.display = 'none';
    }

    // ===== 通知 =====
    function showNotification(msg) {
        let toast = document.getElementById('_toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = '_toast';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 2500);
    }

    // ===== 一键AI修复 =====
    function handleApplyReview() {
        const data = Store.getData();
        if (!data.annotations || data.annotations.length === 0) {
            showNotification('暂无批注');
            return;
        }

        const deleteCount = data.annotations.filter(a => a.type === 'delete').length;
        const insertCount = data.annotations.filter(a => a.type === 'insert').length;
        const commentCount = data.annotations.filter(a => a.type === 'comment').length;

        const summaryEl = document.getElementById('applySummary');
        summaryEl.innerHTML = `
            <div style="font-weight:600;margin-bottom:8px;">📄 源文件：<code>${data.fileName}</code></div>
            <div style="font-weight:600;margin-bottom:12px;">📝 共 <span style="color:var(--primary);font-size:16px;">${data.annotations.length}</span> 条批注</div>
            ${deleteCount > 0 ? `<div class="summary-stat"><span class="stat-icon">🗑️</span> 删除操作：<span class="stat-count">${deleteCount}</span> 条</div>` : ''}
            ${insertCount > 0 ? `<div class="summary-stat"><span class="stat-icon">➕</span> 插入操作：<span class="stat-count">${insertCount}</span> 条</div>` : ''}
            ${commentCount > 0 ? `<div class="summary-stat"><span class="stat-icon">💬</span> 评论操作：<span class="stat-count">${commentCount}</span> 条</div>` : ''}
            <div style="margin-top:10px;padding:8px 12px;background:#f0f9ff;border-left:3px solid #6366f1;border-radius:4px;font-size:12px;color:#555;">
                💡 所有批注将统一生成 AI 修改指令文件，由 AI 按指令逐条执行修改。
            </div>
        `;

        document.getElementById('applyConfirmModal').style.display = 'flex';
    }

    async function executeApplyReview() {
        document.getElementById('applyConfirmModal').style.display = 'none';

        const btn = document.getElementById('btnApplyReview');
        const originalText = btn.innerHTML;
        btn.classList.add('loading');
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/></circle></svg> 更新中...';

        const data = Store.getData();

        try {
            const result = await callHost('applyReview', {
                fileName: data.fileName,
                annotations: data.annotations,
                sourceFile: data.sourceFilePath || ''
            });

            if (!result || !result.success) {
                showNotification('❌ 更新失败: ' + (result?.error || '未知错误'));
                return;
            }

            showApplyResult(result, data);
        } catch (e) {
            showNotification('❌ 请求失败: ' + e.message);
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    }

    function showApplyResult(result, data) {
        const contentEl = document.getElementById('applyResultContent');
        const { needsAi, aiInstructionFile, sourceFilePath, aiInstructionFilePath } = result;

        let html = '';
        if (needsAi > 0) {
            html += `<div class="result-header">✅ AI 指令已生成</div>`;
            html += `<div style="margin-bottom:12px;">共 ${needsAi} 条指令已生成</div>`;

            if (aiInstructionFile) {
                function escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
                html += `<div class="result-ai-hint">
                    🤖 <strong>${needsAi} 条批注</strong>已生成 AI 修改指令文件。<br>
                    <div style="margin-top:6px;">
                        <span style="font-size:12px;color:#6366f1;">📄 源文件：<code>${escapeHtml(sourceFilePath || '')}</code></span><br>
                        <span style="font-size:12px;color:#6366f1;">📝 指令文件：<code>${escapeHtml(aiInstructionFilePath || '')}</code></span>
                    </div>
                    <button class="btn btn-copy-ai-instruction" id="btnCopyAiInstruction">📋 一键复制指令</button>
                </div>`;
            }
        } else {
            html += `<div class="result-header">⚠️ 无有效指令</div>`;
        }

        contentEl.innerHTML = html;
        document.getElementById('applyResultModal').style.display = 'flex';

        const copyBtn = document.getElementById('btnCopyAiInstruction');
        if (copyBtn) {
            const copyText = '请根据评审指令文件修改源文件。\n\n'
                + '源文件路径：' + (sourceFilePath || '') + '\n'
                + '评审指令文件：' + (aiInstructionFilePath || '') + '\n\n'
                + '请先读取评审指令文件了解需要修改的内容，然后按指令逐条修改源文件。';
            copyBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(copyText).then(() => {
                    this.innerHTML = '✅ 已复制';
                    this.classList.add('copied');
                    setTimeout(() => { this.innerHTML = '📋 一键复制指令'; this.classList.remove('copied'); }, 2000);
                }).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = copyText;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    this.innerHTML = '✅ 已复制';
                    this.classList.add('copied');
                    setTimeout(() => { this.innerHTML = '📋 一键复制指令'; this.classList.remove('copied'); }, 2000);
                });
            });
        }
    }

    // ===== 表格右键菜单 =====
    let tableMenuTarget = { table: null, row: null, cell: null, rowIndex: -1, colIndex: -1 };

    function setupTableContextMenu() {
        const docContent = document.getElementById('documentContent');
        const tableMenu = document.getElementById('tableContextMenu');

        docContent.addEventListener('contextmenu', (e) => {
            if (currentMode !== 'edit') return;
            const cell = e.target.closest('td, th');
            if (!cell) return;
            const row = cell.parentElement;
            const table = cell.closest('table');
            if (!table || !row) return;

            e.preventDefault();
            const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row);
            const colIndex = Array.from(row.children).indexOf(cell);
            tableMenuTarget = { table, row, cell, rowIndex, colIndex };

            tableMenu.style.display = 'block';
            tableMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
            tableMenu.style.top = Math.min(e.clientY, window.innerHeight - 320) + 'px';

            const totalRows = table.querySelectorAll('tr').length;
            const totalCols = row.children.length;
            document.getElementById('tableMenuDeleteRow').style.opacity = totalRows <= 1 ? '0.4' : '1';
            document.getElementById('tableMenuDeleteRow').style.pointerEvents = totalRows <= 1 ? 'none' : 'auto';
            document.getElementById('tableMenuDeleteCol').style.opacity = totalCols <= 1 ? '0.4' : '1';
            document.getElementById('tableMenuDeleteCol').style.pointerEvents = totalCols <= 1 ? 'none' : 'auto';
        });

        document.addEventListener('click', (e) => {
            if (!tableMenu.contains(e.target)) tableMenu.style.display = 'none';
        });

        document.getElementById('tableMenuInsertRowAbove').addEventListener('click', () => { tableMenu.style.display = 'none'; tableInsertRow('above'); });
        document.getElementById('tableMenuInsertRowBelow').addEventListener('click', () => { tableMenu.style.display = 'none'; tableInsertRow('below'); });
        document.getElementById('tableMenuInsertColLeft').addEventListener('click', () => { tableMenu.style.display = 'none'; tableInsertCol('left'); });
        document.getElementById('tableMenuInsertColRight').addEventListener('click', () => { tableMenu.style.display = 'none'; tableInsertCol('right'); });
        document.getElementById('tableMenuDeleteRow').addEventListener('click', () => { tableMenu.style.display = 'none'; tableDeleteRow(); });
        document.getElementById('tableMenuDeleteCol').addEventListener('click', () => { tableMenu.style.display = 'none'; tableDeleteCol(); });
    }

    function tableInsertRow(position) {
        const { table, row } = tableMenuTarget;
        if (!table || !row) return;
        const colCount = row.children.length;
        const newRow = document.createElement('tr');
        const isHeaderRow = row.querySelector('th') !== null;
        const cellTag = (position === 'above' && isHeaderRow) ? 'th' : 'td';
        for (let i = 0; i < colCount; i++) {
            const cell = document.createElement(cellTag);
            cell.innerHTML = '<br>';
            newRow.appendChild(cell);
        }
        if (position === 'above') row.parentNode.insertBefore(newRow, row);
        else row.parentNode.insertBefore(newRow, row.nextSibling);
        markTableEdited();
    }

    function tableInsertCol(position) {
        const { table, colIndex } = tableMenuTarget;
        if (!table || colIndex < 0) return;
        table.querySelectorAll('tr').forEach((row) => {
            const cells = Array.from(row.children);
            const refCell = cells[colIndex];
            if (!refCell) return;
            const newCell = document.createElement(refCell.tagName === 'TH' ? 'th' : 'td');
            newCell.innerHTML = '<br>';
            if (position === 'left') row.insertBefore(newCell, refCell);
            else row.insertBefore(newCell, refCell.nextSibling);
        });
        markTableEdited();
    }

    function tableDeleteRow() {
        const { table, row } = tableMenuTarget;
        if (!table || !row || table.querySelectorAll('tr').length <= 1) return;
        row.remove();
        markTableEdited();
    }

    function tableDeleteCol() {
        const { table, colIndex } = tableMenuTarget;
        if (!table || colIndex < 0) return;
        const rows = table.querySelectorAll('tr');
        if (rows[0] && rows[0].children.length <= 1) return;
        rows.forEach(row => {
            const cells = Array.from(row.children);
            if (cells[colIndex]) cells[colIndex].remove();
        });
        markTableEdited();
    }

    function markTableEdited() {
        editorDirty = true;
        updateEditStatus('modified', '● 未保存');
        scheduleAutoSave();
    }

    // ===== 编辑/预览模式切换 =====
    function getScrollAnchor() {
        const docContent = document.getElementById('documentContent');
        const mdBlocks = docContent.querySelectorAll('.md-block');
        if (mdBlocks.length === 0) return null;
        const containerRect = docContent.getBoundingClientRect();
        const viewportTop = containerRect.top;
        for (const block of mdBlocks) {
            const rect = block.getBoundingClientRect();
            if (rect.bottom > viewportTop) {
                return { blockIndex: parseInt(block.dataset.blockIndex, 10), offsetInView: rect.top - viewportTop };
            }
        }
        return null;
    }

    function restoreScrollAnchor(anchor) {
        if (!anchor) return;
        const docContent = document.getElementById('documentContent');
        const targetBlock = docContent.querySelector(`.md-block[data-block-index="${anchor.blockIndex}"]`);
        if (!targetBlock) return;
        const containerRect = docContent.getBoundingClientRect();
        const blockRect = targetBlock.getBoundingClientRect();
        docContent.scrollTop += (blockRect.top - containerRect.top) - anchor.offsetInView;
    }

    function switchMode(mode) {
        if (mode === currentMode) return;
        const data = Store.getData();
        if (!data.fileName) { showNotification('请先打开一个 MD 文件'); return; }

        if (currentMode === 'edit' && mode === 'preview' && editorDirty) {
            clearAutoSaveTimer();
            handleSaveMd();
        }

        const scrollAnchor = getScrollAnchor();
        currentMode = mode;

        document.getElementById('btnPreviewMode').classList.toggle('active', mode === 'preview');
        document.getElementById('btnEditMode').classList.toggle('active', mode === 'edit');

        const docContent = document.getElementById('documentContent');
        const saveBtn = document.getElementById('btnSaveMd');
        const wysiwygToolbar = document.getElementById('wysiwygToolbar');

        if (mode === 'edit') {
            saveBtn.style.display = 'none';
            wysiwygToolbar.classList.add('visible');
            const cleanBlocks = Renderer.parseMarkdown(data.rawMarkdown);
            Renderer.renderBlocks(cleanBlocks, []);
            docContent.contentEditable = 'true';
            docContent.classList.add('wysiwyg-editing');
            editorDirty = false;
            updateEditStatus('', '编辑模式');
            refreshToc();
            restoreScrollAnchor(scrollAnchor);
            setTimeout(() => {
                restoreScrollAnchor(scrollAnchor);
                docContent.focus({ preventScroll: true });
                restoreScrollAnchor(scrollAnchor);
            }, 100);
            setTimeout(() => restoreScrollAnchor(scrollAnchor), 250);
        } else {
            saveBtn.style.display = 'none';
            wysiwygToolbar.classList.remove('visible');
            clearAutoSaveTimer();
            document.getElementById('tableContextMenu').style.display = 'none';
            docContent.contentEditable = 'false';
            docContent.classList.remove('wysiwyg-editing');
            editorDirty = false;
            updateEditStatus('', '');

            const latestData = Store.getData();
            blocks = Renderer.parseMarkdown(latestData.rawMarkdown);
            Renderer.renderBlocks(blocks, latestData.annotations);
            Annotations.setBlocks(blocks);
            Annotations.init(blocks);
            Annotations.renderAnnotationsList();
            Annotations.updateToolbarState();
            refreshToc();
            restoreScrollAnchor(scrollAnchor);
            setTimeout(() => restoreScrollAnchor(scrollAnchor), 100);
        }
    }

    function updateEditStatus(className, text) {
        const el = document.getElementById('editStatus');
        el.className = 'edit-status' + (className ? ' ' + className : '');
        el.textContent = text;
    }

    // ===== 自动保存调度 =====
    function scheduleAutoSave() {
        clearAutoSaveTimer();
        autoSaveTimer = setTimeout(() => {
            if (currentMode === 'edit' && editorDirty) handleSaveMd();
        }, AUTO_SAVE_DELAY);
    }

    function clearAutoSaveTimer() {
        if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
    }

    // ===== 保存 MD 源文件 =====
    async function handleSaveMd() {
        const data = Store.getData();
        if (!data.fileName) { showNotification('没有打开的文件'); return; }

        const docContent = document.getElementById('documentContent');

        const turndownService = new TurndownService({
            headingStyle: 'atx', hr: '---', bulletListMarker: '-',
            codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**', linkStyle: 'inlined',
        });

        turndownService.addRule('blockquote', {
            filter: 'blockquote',
            replacement: function(content) {
                const lines = content.replace(/^\n+|\n+$/g, '').split('\n');
                return '\n' + lines.map(line => '> ' + line).join('\n') + '\n';
            }
        });

        turndownService.addRule('table', {
            filter: 'table',
            replacement: function(content, node) {
                const rows = node.querySelectorAll('tr');
                if (rows.length === 0) return content;
                const lines = [];
                rows.forEach((row, rowIdx) => {
                    const cells = row.querySelectorAll('th, td');
                    const cellTexts = Array.from(cells).map(c => c.textContent.trim());
                    lines.push('| ' + cellTexts.join(' | ') + ' |');
                    if (rowIdx === 0) lines.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |');
                });
                return '\n' + lines.join('\n') + '\n';
            }
        });

        turndownService.addRule('imgPlaceholder', {
            filter: function(node) { return node.classList && node.classList.contains('img-placeholder'); },
            replacement: function() { return ''; }
        });

        const cleanHtml = docContent.innerHTML
            .replace(/<span class="annotation-indicator"[^>]*>.*?<\/span>/gi, '')
            .replace(/<span class="annotation-fallback-marker"[^>]*>.*?<\/span>/gi, '');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cleanHtml;

        tempDiv.querySelectorAll('.md-block').forEach(block => {
            while (block.firstChild) block.parentNode.insertBefore(block.firstChild, block);
            block.remove();
        });

        // 还原图片路径
        tempDiv.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || '';
            // vscode-webview URIs 需要还原为相对路径（由缓存映射反查）
            img.removeAttribute('onerror');
        });

        let newContent = turndownService.turndown(tempDiv.innerHTML);
        if (!newContent.endsWith('\n')) newContent += '\n';

        if (newContent.trim() === data.rawMarkdown.trim()) {
            editorDirty = false;
            updateEditStatus('saved', '✓ 已保存');
            setTimeout(() => updateEditStatus('', '编辑模式'), 2000);
            return;
        }

        updateEditStatus('', '⏳ 保存中...');

        try {
            const filePath = data.sourceFilePath || data.fileName;
            const result = await callHost('saveFile', { filePath, content: newContent });

            if (!result || !result.success) {
                throw new Error(result?.error || '保存失败');
            }

            editorDirty = false;
            if (result.changed) {
                data.rawMarkdown = newContent;
                if (result.docVersion) data.docVersion = result.docVersion;
                Store.save();
                updateEditStatus('saved', '✓ 已保存');
                setTimeout(() => updateEditStatus('', '编辑模式'), 3000);
                const versionLabel = data.docVersion ? ` (${data.docVersion})` : '';
                document.getElementById('fileName').textContent = data.fileName + versionLabel;
            } else {
                updateEditStatus('saved', '✓ 已保存');
                setTimeout(() => updateEditStatus('', '编辑模式'), 2000);
            }
        } catch (e) {
            updateEditStatus('error', '✗ 保存失败');
            console.error('[App] 保存失败:', e);
        }
    }

    // ===== 目录导航 =====
    function scheduleTocRefresh() {
        if (tocRefreshTimer) clearTimeout(tocRefreshTimer);
        tocRefreshTimer = setTimeout(() => { tocRefreshTimer = null; refreshToc(); }, TOC_REFRESH_DELAY);
    }

    function toggleTocPanel(show) {
        const tocPanel = document.getElementById('tocPanel');
        const expandBtn = document.getElementById('btnExpandToc');
        if (show) { tocPanel.classList.remove('collapsed'); expandBtn.style.display = 'none'; tocCollapsed = false; }
        else { tocPanel.classList.add('collapsed'); expandBtn.style.display = 'flex'; tocCollapsed = true; }
    }

    function refreshToc() {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        const docContent = document.getElementById('documentContent');
        const headings = docContent.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (headings.length === 0) { tocList.innerHTML = '<div class="toc-empty">当前文档没有标题</div>'; return; }

        tocList.innerHTML = '';
        headings.forEach((heading, idx) => {
            const level = parseInt(heading.tagName.charAt(1), 10);
            const text = heading.textContent.trim();
            if (!text) return;
            if (!heading.id) heading.id = 'toc-heading-' + idx;

            const tocItem = document.createElement('div');
            tocItem.className = 'toc-item';
            tocItem.dataset.level = level;
            tocItem.dataset.headingId = heading.id;
            tocItem.textContent = text;
            tocItem.title = text;

            tocItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetHeading = document.getElementById(tocItem.dataset.headingId);
                if (!targetHeading) return;
                const container = document.getElementById('documentContent');
                const containerRect = container.getBoundingClientRect();
                const headingRect = targetHeading.getBoundingClientRect();
                container.scrollTo({ top: headingRect.top - containerRect.top + container.scrollTop - 16, behavior: 'smooth' });
                setTocActive(tocItem);
            });

            tocList.appendChild(tocItem);
        });
        updateTocActiveItem();
    }

    function setTocActive(activeTocItem) {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        tocList.querySelectorAll('.toc-item').forEach(item => item.classList.remove('active'));
        if (activeTocItem) {
            activeTocItem.classList.add('active');
            tocScrollToItem(activeTocItem);
        }
    }

    function updateTocActiveItem() {
        if (tocCollapsed) return;
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        const tocItems = tocList.querySelectorAll('.toc-item');
        if (tocItems.length === 0) return;
        const docContent = document.getElementById('documentContent');
        const containerRect = docContent.getBoundingClientRect();
        const topThreshold = containerRect.top + 20;
        let activeItem = null;
        for (let i = tocItems.length - 1; i >= 0; i--) {
            const heading = document.getElementById(tocItems[i].dataset.headingId);
            if (!heading) continue;
            if (heading.getBoundingClientRect().top <= topThreshold) { activeItem = tocItems[i]; break; }
        }
        if (!activeItem && tocItems.length > 0) activeItem = tocItems[0];
        setTocActive(activeItem);
    }

    function tocScrollToItem(tocItem) {
        const tocList = document.getElementById('tocList');
        if (!tocList || !tocItem) return;
        const listRect = tocList.getBoundingClientRect();
        const itemRect = tocItem.getBoundingClientRect();
        if (itemRect.top < listRect.top) tocList.scrollTop -= (listRect.top - itemRect.top) + 10;
        else if (itemRect.bottom > listRect.bottom) tocList.scrollTop += (itemRect.bottom - listRect.bottom) + 10;
    }

    // DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
