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
    let zenMode = false;
    let _ideType = 'codebuddy'; // 默认 CodeBuddy，由 Extension Host 通知实际类型

    // ===== 编辑模式快照（方向A：block-level diff，避免 turndown 全量转换） =====
    let _editSnapshotBlocks = [];  // 进入编辑模式时的原始 Markdown blocks
    let _editSnapshotHtmls = [];   // 进入编辑模式时每个 md-block 的 innerHTML 快照

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
            case 'settingsData':
                Settings.applySettings(message.payload);
                updateThemeButtonLabel(Settings.getSettings().theme);
                break;
            case 'ideType':
                _ideType = message.payload.ideType || 'codebuddy';
                break;
        }
    });

    function handleFileContentPush(data) {
        if (data.error) {
            showNotification(t('notification.load_error', { error: data.error }));
            return;
        }
        loadDocument(data.name, data.content, true, undefined, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
        requestImageUris(data.content, data.sourceDir);
    }

    // ===== 初始化 =====
    async function init() {
        bindEvents();

        // 初始化设置模块
        Settings.bindEvents();
        Renderer.configureHighlight();
        Settings.init();

        // 监听 Mermaid / 数学公式开关变化，触发文档重新渲染
        Settings.onChange((key, value) => {
            if (key === 'enableMermaid' || key === 'enableMath' || key === 'enablePlantUML' || key === 'enableGraphviz' || key === 'reset') {
                refreshCurrentView();
            }
            // 主题变更时重新渲染 Mermaid 图表（Mermaid 使用内置主题系统，需要重新渲染）
            if (key === 'themeChanged') {
                Renderer.reinitMermaid();
                Renderer.reinitGraphviz();
                renderMathAndMermaid();
            }
            // auto 模式下系统主题变化时，同步更新顶部按钮标签
            if (key === 'themeChanged' || key === 'reset') {
                updateThemeButtonLabel(Settings.getSettings().theme);
            }
        });

        // 初始化工具栏主题按钮标签
        updateThemeButtonLabel(Settings.getSettings().theme);
        // 初始化工具栏目录按钮状态
        const tocBtn = document.getElementById('btnToggleToc');
        if (tocBtn) tocBtn.classList.add('toc-active');

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
        select.innerHTML = '<option value="">' + t('toolbar.file_select_default') + '</option>';
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

        document.getElementById('btnModeToggle').addEventListener('click', () => {
            switchMode(currentMode === 'preview' ? 'edit' : 'preview');
        });

        document.getElementById('btnSaveMd').addEventListener('click', handleSaveMd);

        document.getElementById('documentContent').addEventListener('input', () => {
            if (currentMode === 'edit') {
                editorDirty = true;
                updateEditStatus('modified', t('notification.unsaved'));
                scheduleAutoSave();
                scheduleTocRefresh();
            }
        });

        // 编辑模式下点击 task checkbox 切换勾选状态
        document.getElementById('documentContent').addEventListener('click', (e) => {
            if (currentMode !== 'edit') return;
            const checkboxSpan = e.target.closest('.task-checkbox');
            if (!checkboxSpan) return;

            e.preventDefault();
            e.stopPropagation();

            const li = checkboxSpan.closest('.task-list-item');
            if (!li) return;

            const isChecked = checkboxSpan.classList.contains('checked');
            const input = checkboxSpan.querySelector('input[type="checkbox"]');

            if (isChecked) {
                // 取消勾选
                checkboxSpan.classList.remove('checked');
                li.classList.remove('checked');
                if (input) input.checked = false;
                // 移除勾选图标
                const icon = checkboxSpan.querySelector('.task-check-icon');
                if (icon) icon.remove();
            } else {
                // 勾选
                checkboxSpan.classList.add('checked');
                li.classList.add('checked');
                if (input) input.checked = true;
                // 添加勾选图标
                if (!checkboxSpan.querySelector('.task-check-icon')) {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'task-check-icon');
                    svg.setAttribute('viewBox', '0 0 16 16');
                    svg.setAttribute('width', '14');
                    svg.setAttribute('height', '14');
                    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathEl.setAttribute('fill', 'currentColor');
                    pathEl.setAttribute('d', 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z');
                    svg.appendChild(pathEl);
                    checkboxSpan.appendChild(svg);
                }
            }

            // 添加弹出动画
            checkboxSpan.style.animation = 'taskCheckPop 0.2s ease';
            setTimeout(() => { checkboxSpan.style.animation = ''; }, 200);

            // 直接在 rawMarkdown 中精确修改对应的 checkbox 状态，避免 turndown 全量转换导致内容损失
            const allTaskItems = document.querySelectorAll('#documentContent .task-list-item');
            const taskIndex = Array.prototype.indexOf.call(allTaskItems, li);
            if (taskIndex >= 0) {
                const data = Store.getData();
                const taskCheckboxRegex = /^(\s*[-*+]\s+)\[([ xX])\]/gm;
                let matchCount = 0;
                const newMarkdown = data.rawMarkdown.replace(taskCheckboxRegex, (match, prefix, checkChar, offset) => {
                    if (matchCount++ === taskIndex) {
                        // isChecked 是点击前的状态，取反后就是新状态
                        return prefix + (isChecked ? '[ ]' : '[x]');
                    }
                    return match;
                });
                if (newMarkdown !== data.rawMarkdown) {
                    data.rawMarkdown = newMarkdown;
                    Store.save();

                    // 同步更新编辑模式快照，避免后续 handleSaveMd 误判该 block 为"已变化"
                    Renderer.parseMarkdown(newMarkdown); // 重新解析以更新内部状态
                    _editSnapshotBlocks = Renderer.getRawBlocksBeforeExtract().slice();
                    _editSnapshotHtmls = Array.from(document.querySelectorAll('#documentContent .md-block:not(.footnotes-block)')).map(el => el.innerHTML);

                    // 异步保存到文件
                    const filePath = data.sourceFilePath || data.fileName;
                    callHost('saveFile', { filePath, content: newMarkdown }).catch(e => {
                        console.error('[App] checkbox 保存失败:', e);
                    });
                }
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
            const relPath = Store.getRelPath();
            Store.clearAll();
            Annotations.refreshView();
            // 同时删除磁盘上的批阅记录文件，防止重新打开时恢复
            if (fileName) {
                try {
                    await callHost('deleteReviewRecords', { fileName, relPath });
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
        // 「🚀 确定执行」按钮：关闭弹窗 + 复制AI指令到剪贴板 + 打开CodeBuddy新对话窗口粘贴执行
        document.getElementById('btnExecuteAiInstruction').addEventListener('click', () => {
            document.getElementById('applyResultModal').style.display = 'none';
            if (_lastAiCopyText) {
                navigator.clipboard.writeText(_lastAiCopyText).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = _lastAiCopyText;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                });
                vscode.postMessage({
                    type: 'openCodeBuddyChat',
                    payload: {
                        instruction: _lastAiCopyText,
                        sourceFilePath: _lastAiSourceFilePath,
                        aiInstructionFilePath: _lastAiInstructionFilePath
                    }
                });
            }
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

        // 切换批注面板（仅通过顶部按钮控制）
        document.getElementById('btnToggleAnnotations').addEventListener('click', () => {
            const panel = document.getElementById('annotationsPanel');
            const isHidden = panel.classList.contains('collapsed');
            toggleAnnotationsPanel(isHidden);
        });

        // 工具栏目录按钮（唯一的目录显隐控制）
        document.getElementById('btnToggleToc').addEventListener('click', () => {
            const tocPanel = document.getElementById('tocPanel');
            const isCollapsed = tocPanel.classList.contains('collapsed');
            toggleTocPanel(isCollapsed);
        });

        // 目录面板内隐藏按钮
        const btnHideToc = document.getElementById('btnHideToc');
        if (btnHideToc) btnHideToc.addEventListener('click', () => {
            toggleTocPanel(false);
        });

        // 批注面板内隐藏按钮
        const btnHideAnnotations = document.getElementById('btnHideAnnotations');
        if (btnHideAnnotations) btnHideAnnotations.addEventListener('click', () => {
            toggleAnnotationsPanel(false);
        });

        // 目录头部...菜单
        document.getElementById('btnTocMenu').addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('tocMenuDropdown');
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.getElementById('tocMenuCollapseAll').addEventListener('click', (e) => {
            e.stopPropagation();
            tocCollapseAll();
            document.getElementById('tocMenuDropdown').style.display = 'none';
        });
        document.getElementById('tocMenuExpandAll').addEventListener('click', (e) => {
            e.stopPropagation();
            tocExpandAll();
            document.getElementById('tocMenuDropdown').style.display = 'none';
        });
        // 点击其他区域关闭目录菜单
        document.addEventListener('click', () => {
            document.getElementById('tocMenuDropdown').style.display = 'none';
        });

        // 禅模式
        document.getElementById('btnZenMode').addEventListener('click', () => {
            toggleZenMode();
        });

        // 工具栏主题切换按钮（仅在亮色/暗色之间切换，跟随系统在设置页配置）
        document.getElementById('btnToggleTheme').addEventListener('click', () => {
            const settings = Settings.getSettings();
            // 如果当前是 auto 模式，根据实际显示的主题来决定切换方向
            let nextTheme;
            if (settings.theme === 'auto') {
                const isDark = document.body.classList.contains('theme-dark');
                nextTheme = isDark ? 'light' : 'dark';
            } else {
                nextTheme = settings.theme === 'light' ? 'dark' : 'light';
            }
            Settings.applySettings({ ...settings, theme: nextTheme });
            // 通知 Host 保存设置
            vscode.postMessage({ type: 'saveSettings', payload: { ...settings, theme: nextTheme } });
            updateThemeButtonLabel(nextTheme);
            // 重新渲染 Mermaid 图表以适配新主题（Mermaid 使用内置主题系统，需要重新渲染）
            Renderer.reinitMermaid();
            Renderer.reinitGraphviz();
            renderMathAndMermaid();
        });

        // 回到顶部悬浮按钮
        const btnScrollTop = document.getElementById('btnScrollTop');
        const docContentForScroll = document.getElementById('documentContent');
        if (btnScrollTop && docContentForScroll) {
            btnScrollTop.addEventListener('click', () => {
                docContentForScroll.scrollTo({ top: 0, behavior: 'smooth' });
            });
            // 监听文档内容滚动，控制按钮显隐
            docContentForScroll.addEventListener('scroll', () => {
                if (docContentForScroll.scrollTop > 300) {
                    btnScrollTop.classList.add('visible');
                } else {
                    btnScrollTop.classList.remove('visible');
                }
            });
        }

        // 文档内锚点链接（#hash）点击处理 — 支持中文目录跳转
        document.getElementById('documentContent').addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href^="#"]');
            if (!anchor) return;
            const hash = decodeURIComponent(anchor.getAttribute('href').slice(1));
            if (!hash) return;
            const target = document.getElementById(hash);
            if (!target) return;
            e.preventDefault();
            const container = document.getElementById('documentContent');
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            container.scrollTo({ top: targetRect.top - containerRect.top + container.scrollTop - 16, behavior: 'smooth' });
        });

        document.getElementById('documentContent').addEventListener('scroll', () => {
            if (tocScrollTimer) clearTimeout(tocScrollTimer);
            tocScrollTimer = setTimeout(() => updateTocActiveItem(), 80);
        });

        // 快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // ESC 优先退出禅模式
                if (zenMode) {
                    toggleZenMode();
                    return;
                }
                document.getElementById('commentModal').style.display = 'none';
                document.getElementById('insertModal').style.display = 'none';
                document.getElementById('contextMenu').style.display = 'none';
                document.getElementById('applyConfirmModal').style.display = 'none';
                document.getElementById('applyResultModal').style.display = 'none';
                document.getElementById('helpModal').style.display = 'none';
            }
            if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                toggleZenMode();
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

        // 面板拖拽调整宽度
        initPanelResize();
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
            // 先尝试从 .review 恢复
            const records = await callHost('getReviewRecords', { fileName: value, relPath: value });
            if (records && records.records && records.records.length > 0) {
                const fileData = await callHost('readFile', { filePath: value });
                if (fileData && !fileData.error) {
                    const matchedRecord = records.records[0];
                    if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
                        loadDocument(fileData.name, fileData.content, true, undefined, fileData.docVersion, fileData.sourceFilePath, fileData.sourceDir, fileData.relPath, fileData.pathHash);
                        requestImageUris(fileData.content, fileData.sourceDir);
                        Store.restoreFromReviewRecord(matchedRecord, fileData.name, fileData.content, fileData.docVersion);
                        const newBlocks = Renderer.parseMarkdown(fileData.content);
                        Renderer.renderBlocks(newBlocks, Store.getAnnotations());
                        renderMathAndMermaid();
                        Annotations.setBlocks(newBlocks);
                        Annotations.init(newBlocks);
                        Annotations.renderAnnotationsList();
                        Annotations.updateToolbarState();
showNotification(t('notification.restored', { count: matchedRecord.annotations.length }));
                        return;
                    }
                }
            }

            // 正常加载
            const data = await callHost('readFile', { filePath: value });
            if (data && !data.error) {
                loadDocument(data.name, data.content, true, undefined, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
                requestImageUris(data.content, data.sourceDir);
            }
        } catch (e) {
            console.error('[App] 加载文件失败:', e);
            showNotification(t('notification.load_failed'));
        }
    }

    // ===== 刷新 =====
    async function handleRefresh() {
        // 刷新时同步设置（其他面板可能已修改设置）
        vscode.postMessage({ type: 'getSettings' });

        const currentData = Store.getData();
        if (!currentData.fileName) return;

        try {
            const filePath = currentData.sourceFilePath || currentData.fileName;
            const data = await callHost('readFile', { filePath });
            if (data && !data.error) {
                const contentChanged = data.content.trim() !== currentData.rawMarkdown.trim();
                if (contentChanged) {
                    loadDocument(data.name, data.content, true, undefined, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
                    showNotification('文件已更新，已创建新的批阅版本');
                } else {
                    loadDocument(data.name, data.content, false, undefined, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
                    showNotification('文件已重新加载');

                    // 仅在内容未变化时从磁盘批阅记录恢复批注（确保批注列表与磁盘同步）
                    // 内容变化时已进入新批阅版本，不应恢复旧批阅记录，否则会覆盖新版本号
                    try {
                        const records = await callHost('getReviewRecords', { fileName: data.name, relPath: data.relPath || '' });
                        if (records && records.records && records.records.length > 0) {
                            const matchedRecord = records.records[0];
                            if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
                                Store.restoreFromReviewRecord(matchedRecord, data.name, data.content, data.docVersion);
                                const newBlocks = Renderer.parseMarkdown(data.content);
                                Renderer.renderBlocks(newBlocks, Store.getAnnotations());
                                renderMathAndMermaid();
                                Annotations.setBlocks(newBlocks);
                                Annotations.init(newBlocks);
                                Annotations.renderAnnotationsList();
                                Annotations.updateToolbarState();
                            }
                        }
                    } catch (e) {
                        console.warn('[App] 刷新时恢复批阅记录失败:', e);
                    }
                }
                requestImageUris(data.content, data.sourceDir);
                hideFileChangeBadge();

                // 刷新文件列表
                loadFileList();
            }
        } catch (e) {
            showNotification('刷新失败: ' + e.message);
        }
    }

    // ===== 加载文档 =====
    function loadDocument(fileName, markdown, isNew, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash) {
        if (isNew) {
            Store.setFile(fileName, markdown, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash);
        }

        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('editorContainer').style.display = 'flex';
        const storeData = Store.getData();
        const versionLabel = storeData.docVersion ? ` (${storeData.docVersion})` : '';
        const fileNameEl = document.getElementById('fileName');
        fileNameEl.textContent = fileName + versionLabel;
        // 设置 tooltip 为相对路径+文件名
        const fileRelPath = storeData.relPath || storeData.sourceFilePath || fileName;
        fileNameEl.title = fileRelPath;

        updateFileSelectHighlight(fileName);

        blocks = Renderer.parseMarkdown(markdown);
        const data = Store.getData();
        Renderer.renderBlocks(blocks, data.annotations);

        // 渲染数学公式和 Mermaid 图表
        renderMathAndMermaid();

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

        // 渲染数学公式和 Mermaid 图表
        renderMathAndMermaid();

        Annotations.setBlocks(blocks);
        Annotations.init(blocks);
        Annotations.renderAnnotationsList();
        Annotations.updateToolbarState();
        refreshToc();
    }

    /**
     * 根据设置状态渲染数学公式和 Mermaid 图表，并绑定代码块事件
     */
    function renderMathAndMermaid() {
        const settings = Settings.getSettings();
        if (settings.enableMath) {
            Renderer.renderMath();
        }
        if (settings.enableMermaid) {
            Renderer.renderMermaid();
            // 渲染完成后绑定大图弹窗事件
            setTimeout(bindMermaidLightbox, 200);
        }
        if (settings.enablePlantUML) {
            Renderer.renderPlantUML();
        }
        if (settings.enableGraphviz) {
            // renderGraphviz 是 async，等渲染完成后再绑定大图弹窗事件
            Renderer.renderGraphviz().then(() => {
                bindGraphvizLightbox();
            });
        }
        // 绑定代码块复制按钮事件
        bindCodeCopyButtons();
        // 绑定图片点击放大事件
        bindImageLightbox();
    }

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
            // 排除编辑模式
            if (contentEl.getAttribute('contenteditable') === 'true') return;

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
    function bindCodeCopyButtons() {
        const copyBtns = document.querySelectorAll('.code-copy-btn');
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
        const toggleBtn = document.getElementById('btnToggleAnnotations');
        if (show) {
            panel.classList.remove('collapsed');
            if (toggleBtn) toggleBtn.classList.remove('panel-hidden');
        } else {
            // 清除拖拽设置的内联宽度，让 CSS collapsed 的 width:0 生效
            panel.style.width = '';
            panel.classList.add('collapsed');
            if (toggleBtn) toggleBtn.classList.add('panel-hidden');
        }
        // 同步设置中的 showAnnotations 状态
        const settings = Settings.getSettings();
        if (settings.showAnnotations !== show) {
            Settings.applySettings({ ...settings, showAnnotations: show });
            vscode.postMessage({ type: 'saveSettings', payload: { ...settings, showAnnotations: show } });
        }
    }

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

    // ===== 编辑模式 Tips 提示 =====
    function showEditModeTips() {
        let tips = document.getElementById('_editModeTips');
        if (!tips) {
            tips = document.createElement('div');
            tips.id = '_editModeTips';
            tips.className = 'mode-edit-tips';
            tips.innerHTML = `
                <div class="edit-tips-header">
                    <span>⚠️ ${t('editor.tips_title')}</span>
                    <button class="edit-tips-close" onclick="this.parentElement.parentElement.classList.remove('show')" title="${t('editor.tips_close')}">✕</button>
                </div>
                <div class="edit-tips-body">
                    <div class="edit-tips-item">${t('editor.tips_warning1')}</div>
                    <div class="edit-tips-item">${t('editor.tips_warning2')}</div>
                </div>
            `;
            document.body.appendChild(tips);
        }
        // 重新触发动画
        tips.classList.remove('show');
        void tips.offsetWidth;
        tips.classList.add('show');
        // 8秒后自动消失
        setTimeout(() => { tips.classList.remove('show'); }, 8000);
    }

    // ===== 一键AI修复 =====
    async function handleApplyReview() {
        // 如果在编辑模式且有未保存内容，先立即保存
        if (currentMode === 'edit' && editorDirty) {
            clearAutoSaveTimer();
            await handleSaveMd();
        }

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
            <div class="summary-file">📄 源文件：<code>${data.fileName}</code></div>
            <div class="summary-total">📝 共 <span class="stat-count">${data.annotations.length}</span> 条批注</div>
            ${deleteCount > 0 ? `<div class="summary-stat"><span class="stat-icon">🗑️</span> 删除操作：<span class="stat-count">${deleteCount}</span> 条</div>` : ''}
            ${insertCount > 0 ? `<div class="summary-stat"><span class="stat-icon">➕</span> 插入操作：<span class="stat-count">${insertCount}</span> 条</div>` : ''}
            ${commentCount > 0 ? `<div class="summary-stat"><span class="stat-icon">💬</span> 评论操作：<span class="stat-count">${commentCount}</span> 条</div>` : ''}
            <div class="summary-hint">
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
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/></circle></svg> ' + t('notification.updating');

        const data = Store.getData();

        try {
            const result = await callHost('applyReview', {
                fileName: data.fileName,
                annotations: data.annotations,
                sourceFile: data.sourceFilePath || '',
                relPath: data.relPath || ''
            });

            if (!result || !result.success) {
                showNotification(t('notification.update_failed', { error: result?.error || 'unknown' }));
                return;
            }

            showApplyResult(result, data);
        } catch (e) {
            showNotification(t('notification.request_failed', { error: e.message }));
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = originalText;
        }
    }

    // 保存最近一次生成的AI指令文本，供确定按钮使用
    let _lastAiCopyText = '';
    let _lastAiSourceFilePath = '';
    let _lastAiInstructionFilePath = '';

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
<span class="ai-hint-label">📄 源文件：<code class="ai-hint-path">${escapeHtml(sourceFilePath || '')}</code></span><br>
                        <span class="ai-hint-label">📝 指令文件：<code class="ai-hint-path">${escapeHtml(aiInstructionFilePath || '')}</code></span>
                    </div>
                    <button class="btn btn-copy-ai-instruction" id="btnCopyAiInstruction">📋 一键复制指令</button>
                </div>`;
            }
        } else {
            html += `<div class="result-header">⚠️ 无有效指令</div>`;
        }

        contentEl.innerHTML = html;
        document.getElementById('applyResultModal').style.display = 'flex';

        // 控制「🚀 确定执行」按钮的显示
        const executeBtn = document.getElementById('btnExecuteAiInstruction');

        const copyBtn = document.getElementById('btnCopyAiInstruction');
        if (copyBtn) {
            const copyText = '请根据评审指令文件修改源文件。\n\n'
                + '源文件路径：' + (sourceFilePath || '') + '\n'
                + '评审指令文件：' + (aiInstructionFilePath || '') + '\n\n'
                + '请先读取评审指令文件了解需要修改的内容，然后按指令逐条修改源文件。';
            // 保存到模块级变量，供确定按钮使用
            _lastAiCopyText = copyText;
            _lastAiSourceFilePath = sourceFilePath || '';
            _lastAiInstructionFilePath = aiInstructionFilePath || '';

            // 有AI指令时显示「🚀 确定执行」按钮
            if (executeBtn) {
                executeBtn.style.display = '';
            }
            // VSCode 模式下显示剪贴板粘贴提示
            const vscodeHint = document.getElementById('vscodeAiHint');
            if (vscodeHint) {
                vscodeHint.style.display = (_ideType === 'vscode') ? 'inline' : 'none';
            }

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
        } else {
            _lastAiCopyText = '';
            _lastAiSourceFilePath = '';
            _lastAiInstructionFilePath = '';
            // 无AI指令时隐藏「🚀 确定执行」按钮
            if (executeBtn) {
                executeBtn.style.display = 'none';
            }
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
        updateEditStatus('modified', t('notification.unsaved'));
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

    async function switchMode(mode) {
        if (mode === currentMode) return;
        const data = Store.getData();
        if (!data.fileName) { showNotification('请先打开一个 MD 文件'); return; }

        if (currentMode === 'edit' && mode === 'preview' && editorDirty) {
            clearAutoSaveTimer();
            await handleSaveMd();
        }

        const scrollAnchor = getScrollAnchor();
        currentMode = mode;

        // 更新切换按钮状态
        const toggleBtn = document.getElementById('btnModeToggle');
        const previewIcon = toggleBtn.querySelector('.mode-icon-preview');
        const editIcon = toggleBtn.querySelector('.mode-icon-edit');
        const modeLabel = toggleBtn.querySelector('.mode-toggle-label');
        if (mode === 'edit') {
            toggleBtn.classList.add('mode-edit');
            previewIcon.style.display = 'none';
            editIcon.style.display = '';
            modeLabel.textContent = '编辑';
        } else {
            toggleBtn.classList.remove('mode-edit');
            previewIcon.style.display = '';
            editIcon.style.display = 'none';
            modeLabel.textContent = '预览';
        }

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

            // 保存编辑模式快照：原始 Markdown blocks（含脚注定义） + 每个 md-block 的 HTML 快照
            _editSnapshotBlocks = Renderer.getRawBlocksBeforeExtract().slice();
            _editSnapshotHtmls = Array.from(docContent.querySelectorAll('.md-block:not(.footnotes-block)')).map(el => el.innerHTML);

            refreshToc();
            restoreScrollAnchor(scrollAnchor);
            // 弹出编辑模式提示
            showEditModeTips();
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

            // 渲染数学公式和 Mermaid 图表
            renderMathAndMermaid();

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

    // ===== 主题按钮标签更新 =====
    function updateThemeButtonLabel(theme) {
        const btn = document.getElementById('btnToggleTheme');
        if (!btn) return;
        const labels = { light: t('theme.light'), dark: t('theme.dark') };
        const icons = {
            light: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
            dark: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 9.2A6.5 6.5 0 016.8 2 6 6 0 1014 9.2z" stroke="currentColor" stroke-width="1.3"/></svg>'
        };
        // auto 模式下，根据实际显示的主题来决定图标和标签
        let displayTheme = theme;
        if (theme === 'auto') {
            displayTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
        }
        btn.innerHTML = (icons[displayTheme] || icons.light) + ' ' + (labels[displayTheme] || '主题');
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

    // ===== 保存 MD 源文件（方向A：block-level diff，仅对变化的 block 使用 turndown） =====
    async function handleSaveMd() {
        const data = Store.getData();
        if (!data.fileName) { showNotification(t('notification.no_open_file')); return; }

        const docContent = document.getElementById('documentContent');
        // 排除脚注 block（footnotes-block），脚注定义已包含在 _editSnapshotBlocks 的原始 blocks 中
        const currentMdBlocks = docContent.querySelectorAll('.md-block:not(.footnotes-block)');

        // 构建 turndown 服务（仅用于变化的 block）
        function createTurndownService() {
            const ts = new TurndownService({
                headingStyle: 'atx', hr: '---', bulletListMarker: '-',
                codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**', linkStyle: 'inlined',
            });

            ts.addRule('blockquote', {
                filter: 'blockquote',
                replacement: function(content) {
                    const lines = content.replace(/^\n+|\n+$/g, '').split('\n');
                    return '\n' + lines.map(line => '> ' + line).join('\n') + '\n';
                }
            });

            ts.addRule('table', {
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

            ts.addRule('imgPlaceholder', {
                filter: function(node) { return node.classList && node.classList.contains('img-placeholder'); },
                replacement: function() { return ''; }
            });

            ts.addRule('taskListItem', {
                filter: function(node) {
                    return node.nodeName === 'LI' && node.classList.contains('task-list-item');
                },
                replacement: function(content, node, options) {
                    const isChecked = node.classList.contains('checked');
                    const checkbox = isChecked ? '[x]' : '[ ]';
                    const taskText = node.querySelector('.task-text');
                    const text = taskText ? ts.turndown(taskText.innerHTML).trim() : content.trim();
                    var prefix = options.bulletListMarker + ' ';
                    var parent = node.parentNode;
                    if (parent && parent.nodeName === 'OL') {
                        var start = parent.getAttribute('start');
                        var index = Array.prototype.indexOf.call(parent.children, node);
                        prefix = (start ? Number(start) + index : index + 1) + '. ';
                    }
                    return prefix + checkbox + ' ' + text + (node.nextSibling ? '\n' : '');
                }
            });

            return ts;
        }

        // 将单个 md-block 的 HTML 转为 Markdown（用于变化的 block）
        function blockHtmlToMarkdown(blockEl, turndownService) {
            const cleanHtml = blockEl.innerHTML
                .replace(/<span class="annotation-indicator"[^>]*>.*?<\/span>/gi, '')
                .replace(/<span class="annotation-fallback-marker"[^>]*>.*?<\/span>/gi, '');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanHtml;

            // 移除代码块的 code-header
            tempDiv.querySelectorAll('.code-header').forEach(header => header.remove());

            // 还原图片路径
            tempDiv.querySelectorAll('img').forEach(img => {
                img.removeAttribute('onerror');
            });

            let md = turndownService.turndown(tempDiv.innerHTML);
            return md.trim();
        }

        // 规范化 HTML 用于对比（去除批注标记等不影响内容的差异）
        function normalizeHtmlForCompare(html) {
            return html
                .replace(/<span class="annotation-indicator"[^>]*>.*?<\/span>/gi, '')
                .replace(/<span class="annotation-fallback-marker"[^>]*>.*?<\/span>/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Block-level diff：逐块对比，未变化的保持原始 Markdown
        const resultParts = [];
        let hasChanges = false;
        const turndownService = createTurndownService();
        const inlineExtractedDefs = Renderer.getInlineExtractedDefs();

        for (let i = 0; i < currentMdBlocks.length; i++) {
            const blockEl = currentMdBlocks[i];
            const currentHtml = normalizeHtmlForCompare(blockEl.innerHTML);
            const snapshotHtml = i < _editSnapshotHtmls.length ? normalizeHtmlForCompare(_editSnapshotHtmls[i]) : null;

            if (snapshotHtml !== null && currentHtml === snapshotHtml && i < _editSnapshotBlocks.length) {
                // Block 未变化 → 保持原始 Markdown（含被提取的定义行）
                resultParts.push(_editSnapshotBlocks[i]);
            } else {
                // Block 有变化 → 优先尝试行级精确替换，fallback 到 turndown
                hasChanges = true;
                let converted = null;

                // 尝试行级 diff：如果原始 Markdown 存在且行数相同，逐行对比纯文本
                if (i < _editSnapshotBlocks.length) {
                    const origMd = _editSnapshotBlocks[i];
                    const origLines = origMd.split('\n');

                    // 从当前 DOM 提取纯文本行（用 innerText 保持换行）
                    const currentText = blockEl.innerText || blockEl.textContent || '';
                    const currentLines = currentText.split('\n').filter(l => l.trim() !== '' || true);

                    // 从原始 Markdown 提取纯文本（去掉 Markdown 标记）
                    function stripMdMarkers(line) {
                        return line
                            .replace(/^(\s*)([-*+]|\d+\.)\s+(\[[ xX]\]\s*)?/, '') // 列表标记+checkbox
                            .replace(/^#+\s+/, '')  // 标题
                            .replace(/^>\s*/, '')    // 引用
                            .trim();
                    }

                    // 只在行数相同时尝试行级替换（结构未变）
                    if (origLines.length === currentLines.length) {
                        const patchedLines = [];
                        let canPatch = true;
                        for (let j = 0; j < origLines.length; j++) {
                            const origStripped = stripMdMarkers(origLines[j]);
                            const currStripped = currentLines[j].trim();
                            if (origStripped === currStripped) {
                                // 行内容未变 → 保持原始 Markdown 行
                                patchedLines.push(origLines[j]);
                            } else {
                                // 行内容变化 → 替换原始行中的文本部分，保留 Markdown 标记和缩进
                                const mdPrefix = origLines[j].match(/^(\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s*)?|#+\s+|>\s*)/);
                                if (mdPrefix) {
                                    patchedLines.push(mdPrefix[0] + currStripped);
                                } else {
                                    // 纯文本行，直接用原始缩进+新文本
                                    const indent = origLines[j].match(/^(\s*)/)[0];
                                    patchedLines.push(indent + currStripped);
                                }
                            }
                        }
                        if (canPatch) {
                            converted = patchedLines.join('\n');
                        }
                    }
                }

                // 行级 diff 失败时 fallback 到 turndown
                if (converted === null) {
                    converted = blockHtmlToMarkdown(blockEl, turndownService);
                }

                // 将该 block 中被提取的内联定义行（引用式链接/脚注）追加回去
                if (i < inlineExtractedDefs.length && inlineExtractedDefs[i].length > 0) {
                    converted = converted + '\n\n' + inlineExtractedDefs[i].join('\n');
                }
                resultParts.push(converted);
            }
        }

        // 处理新增的 block（用户在编辑模式下新增了内容导致 block 数量增加的情况已在上面循环中处理）
        // 处理删除的 block（当前 block 数量少于快照时，多余的快照 block 自然被忽略）

        // 将被过滤掉的引用式链接/脚注定义块插入到正确的位置
        const orphanedDefs = Renderer.getOrphanedDefBlocks();
        const finalParts = [];
        for (let i = 0; i <= resultParts.length; i++) {
            // 在索引 i 之前插入所有 insertBeforeIndex === i 的 orphaned def blocks
            for (const orphan of orphanedDefs) {
                if (orphan.insertBeforeIndex === i) {
                    finalParts.push(orphan.rawText);
                }
            }
            if (i < resultParts.length) {
                finalParts.push(resultParts[i]);
            }
        }

        let newContent = finalParts.join('\n\n') + '\n';

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
                throw new Error(result?.error || t('notification.save_failed'));
            }

            editorDirty = false;
            if (result.changed) {
                data.rawMarkdown = newContent;
                if (result.docVersion) data.docVersion = result.docVersion;
                Store.save();

                // 更新内部状态和快照（不重新渲染 DOM，避免破坏编辑模式）
                Renderer.parseMarkdown(newContent);
                _editSnapshotBlocks = Renderer.getRawBlocksBeforeExtract().slice();
                _editSnapshotHtmls = Array.from(docContent.querySelectorAll('.md-block:not(.footnotes-block)')).map(el => el.innerHTML);

                updateEditStatus('saved', t('notification.saved'));
                setTimeout(() => updateEditStatus('', t('notification.edit_mode')), 3000);
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

    // ===== 面板拖拽调整宽度 =====
    const PANEL_MIN_WIDTH = 160;
    const PANEL_MAX_WIDTH_RATIO = 0.45; // 最大占窗口宽度比例

    function initPanelResize() {
        setupResize('tocResizeHandle', 'tocPanel');
        setupResize('annotationsResizeHandle', 'annotationsPanel');
    }

    /**
     * @param {string} handleId  拖拽手柄元素 ID
     * @param {string} panelId   面板元素 ID
     */
    function setupResize(handleId, panelId) {
        const handle = document.getElementById(handleId);
        const panel = document.getElementById(panelId);
        if (!handle || !panel) return;

        let startX = 0;
        let startWidth = 0;
        let dragging = false;

        /**
         * 动态判断拖拽方向：
         * 根据手柄相对面板的位置决定拖拽变宽方向。
         * 手柄在面板右侧 → 向右拖变宽 → side='right'
         * 手柄在面板左侧 → 向左拖变宽 → side='left'
         */
        function getResizeSide() {
            const panelRect = panel.getBoundingClientRect();
            const handleRect = handle.getBoundingClientRect();
            // 手柄中心在面板中心右侧 → 手柄在右边 → 向右拖变宽
            return handleRect.left > panelRect.left + panelRect.width / 2 ? 'right' : 'left';
        }

        function onMouseDown(e) {
            // 面板折叠时不允许拖拽
            if (panel.classList.contains('collapsed')) return;
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            startWidth = panel.getBoundingClientRect().width;
            handle.classList.add('dragging');
            panel.classList.add('resizing');
            document.body.classList.add('resizing-panel');
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function onMouseMove(e) {
            if (!dragging) return;
            const maxWidth = window.innerWidth * PANEL_MAX_WIDTH_RATIO;
            const side = getResizeSide();
            let delta;
            if (side === 'right') {
                // 面板在左侧：手柄在右边，向右拖 = 变宽
                delta = e.clientX - startX;
            } else {
                // 面板在右侧：手柄在左边，向左拖 = 变宽
                delta = startX - e.clientX;
            }
            const newWidth = Math.min(Math.max(startWidth + delta, PANEL_MIN_WIDTH), maxWidth);
            panel.style.width = newWidth + 'px';
        }

        function onMouseUp() {
            if (!dragging) return;
            dragging = false;
            handle.classList.remove('dragging');
            panel.classList.remove('resizing');
            document.body.classList.remove('resizing-panel');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        handle.addEventListener('mousedown', onMouseDown);
    }

    // ===== 目录导航 =====
    function scheduleTocRefresh() {
        if (tocRefreshTimer) clearTimeout(tocRefreshTimer);
        tocRefreshTimer = setTimeout(() => { tocRefreshTimer = null; refreshToc(); }, TOC_REFRESH_DELAY);
    }

    // ===== 禅模式 =====
    function toggleZenMode() {
        zenMode = !zenMode;
        const body = document.body;
        const zenBtn = document.getElementById('btnZenMode');

        if (zenMode) {
            // 记住进入禅模式前的面板状态
            zenBtn._prevTocCollapsed = tocCollapsed;
            zenBtn._prevAnnotationsCollapsed = document.getElementById('annotationsPanel').classList.contains('collapsed');

            body.classList.add('zen-mode');
            zenBtn.classList.add('zen-active');
            zenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4 4h8v8H4z" fill="currentColor" opacity="0.3"/><path d="M1.5 1.5l13 13M14.5 1.5l-13 13" stroke="currentColor" stroke-width="0.6" opacity="0.4"/></svg> ' + t('toolbar.exit_zen');

            // 通知 Extension Host 隐藏 IDE 侧边栏
            vscode.postMessage({ type: 'zenModeChanged', payload: { entering: true } });
        } else {
            body.classList.remove('zen-mode');
            zenBtn.classList.remove('zen-active');
            zenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.3"/><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="0.8"/></svg> ' + t('toolbar.zen');

            // 通知 Extension Host 恢复 IDE 侧边栏
            vscode.postMessage({ type: 'zenModeChanged', payload: { entering: false } });

            // 恢复进入禅模式前的面板状态
            if (!zenBtn._prevTocCollapsed) {
                toggleTocPanel(true);
            }
            if (!zenBtn._prevAnnotationsCollapsed) {
                toggleAnnotationsPanel(true);
            }
        }
    }

    function toggleTocPanel(show) {
        const tocPanel = document.getElementById('tocPanel');
        const tocToolbarBtn = document.getElementById('btnToggleToc');
        if (show) {
            tocPanel.classList.remove('collapsed');
            tocCollapsed = false;
        } else {
            // 清除拖拽设置的内联宽度，让 CSS collapsed 的 width:0 生效
            tocPanel.style.width = '';
            tocPanel.classList.add('collapsed');
            tocCollapsed = true;
        }
        if (tocToolbarBtn) {
            tocToolbarBtn.classList.toggle('toc-active', show);
            tocToolbarBtn.classList.toggle('toc-inactive', !show);
        }
        // 同步设置中的 showToc 状态
        const settings = Settings.getSettings();
        if (settings.showToc !== show) {
            Settings.applySettings({ ...settings, showToc: show });
            vscode.postMessage({ type: 'saveSettings', payload: { ...settings, showToc: show } });
        }
    }

    function refreshToc() {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        const docContent = document.getElementById('documentContent');
        const headings = docContent.querySelectorAll('h1, h2, h3, h4, h5, h6');

        if (headings.length === 0) { tocList.innerHTML = '<div class="toc-empty">当前文档没有标题</div>'; return; }

        // 保存之前折叠状态
        const prevCollapsedSet = new Set();
        tocList.querySelectorAll('.toc-item.toc-collapsed').forEach(item => {
            prevCollapsedSet.add(item.dataset.headingId);
        });

        tocList.innerHTML = '';

        // 收集所有标题信息
        const tocData = [];
        headings.forEach((heading, idx) => {
            const level = parseInt(heading.tagName.charAt(1), 10);
            const text = heading.textContent.trim();
            if (!text) return;
            if (!heading.id) heading.id = 'toc-heading-' + idx;
            tocData.push({ level, text, id: heading.id });
        });

        // 判断每个标题是否有子标题（后面紧跟的更深层级标题）
        tocData.forEach((item, idx) => {
            const hasChildren = idx < tocData.length - 1 && tocData[idx + 1].level > item.level;
            item.hasChildren = hasChildren;
        });

        tocData.forEach((item, idx) => {
            const tocItem = document.createElement('div');
            tocItem.className = 'toc-item';
            tocItem.dataset.level = item.level;
            tocItem.dataset.headingId = item.id;
            tocItem.dataset.index = idx;

            // 折叠箭头（仅有子项的标题显示）
            if (item.hasChildren) {
                const arrow = document.createElement('span');
                arrow.className = 'toc-arrow';
                arrow.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                arrow.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleTocItemCollapse(tocItem, idx, tocData);
                });
                tocItem.appendChild(arrow);
            } else {
                // 占位，保持文字对齐
                const spacer = document.createElement('span');
                spacer.className = 'toc-arrow-spacer';
                tocItem.appendChild(spacer);
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'toc-item-text';
            textSpan.textContent = item.text;
            textSpan.title = item.text;
            tocItem.appendChild(textSpan);

            // 恢复之前的折叠状态
            if (prevCollapsedSet.has(item.id)) {
                tocItem.classList.add('toc-collapsed');
            }

            tocItem.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetHeading = document.getElementById(item.id);
                if (!targetHeading) return;
                const container = document.getElementById('documentContent');
                const containerRect = container.getBoundingClientRect();
                const headingRect = targetHeading.getBoundingClientRect();
                container.scrollTo({ top: headingRect.top - containerRect.top + container.scrollTop - 16, behavior: 'smooth' });
                setTocActive(tocItem);
            });

            tocList.appendChild(tocItem);
        });

        // 应用折叠状态（隐藏被折叠的子项）
        applyTocCollapseState(tocList, tocData);
        updateTocActiveItem();
    }

    function toggleTocItemCollapse(tocItem, idx, tocData) {
        const isCollapsed = tocItem.classList.contains('toc-collapsed');
        if (isCollapsed) {
            tocItem.classList.remove('toc-collapsed');
        } else {
            tocItem.classList.add('toc-collapsed');
        }
        const tocList = document.getElementById('tocList');
        applyTocCollapseState(tocList, tocData);
    }

    function applyTocCollapseState(tocList, tocData) {
        const items = tocList.querySelectorAll('.toc-item');
        // 先全部显示
        items.forEach(item => { item.style.display = ''; });

        // 找出所有折叠的项，隐藏其子项
        const collapsedIndices = [];
        items.forEach((item, i) => {
            if (item.classList.contains('toc-collapsed')) {
                collapsedIndices.push(i);
            }
        });

        // 对每个折叠项，隐藏它的所有子项（层级更深的后续项）
        collapsedIndices.forEach(ci => {
            const parentLevel = tocData[ci].level;
            for (let j = ci + 1; j < tocData.length; j++) {
                if (tocData[j].level <= parentLevel) break;
                items[j].style.display = 'none';
            }
        });
    }

    function tocCollapseAll() {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        const items = tocList.querySelectorAll('.toc-item');
        const tocData = getTocDataFromItems(items);
        items.forEach((item, i) => {
            if (tocData[i] && tocData[i].hasChildren) {
                item.classList.add('toc-collapsed');
            }
        });
        applyTocCollapseState(tocList, tocData);
    }

    function tocExpandAll() {
        const tocList = document.getElementById('tocList');
        if (!tocList) return;
        const items = tocList.querySelectorAll('.toc-item');
        const tocData = getTocDataFromItems(items);
        items.forEach(item => {
            item.classList.remove('toc-collapsed');
        });
        applyTocCollapseState(tocList, tocData);
    }

    function getTocDataFromItems(items) {
        const tocData = [];
        items.forEach((item, i) => {
            const level = parseInt(item.dataset.level, 10);
            const hasChildren = i < items.length - 1 && parseInt(items[i + 1].dataset.level, 10) > level;
            tocData.push({ level, hasChildren, id: item.dataset.headingId });
        });
        return tocData;
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
