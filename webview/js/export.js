/**
 * export.js - 导出模块（VSCode 插件版）
 * 将批阅操作导出为 AI 可读的结构化文档
 * 通过 postMessage 保存到 Extension Host
 */
const Exporter = (() => {

    let autoSaveEnabled = false;
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1500;
    // 历史版本归档策略：
    // 1. doAutoSave 发现批注为空时，仅更新 UI 状态，不删除磁盘批阅记录（保留历史版本供日后回溯）
    // 2. 磁盘记录删除仅通过用户显式操作触发（见 app.js btnConfirmClearAll）
    // 3. 刷新/文件内容变化时会创建新版本号（reviewVersion + 1），旧版本自然保留为历史版本
    // 4. 新版本号（v>1）即使批注为空也会写入空占位记录到磁盘，
    //    否则下次打开文件会把上一版旧批注错误恢复（Bug: AI 修复后重开仍见旧批注）

    /**
     * 构建用于文件名的 reviewBaseName。
     * pathHash 由 Extension Host 计算（md5）后缓存在 Store 中，确保前后端一致。
     */
    function _reviewBaseName(data) {
        const baseName = data.fileName.replace(/\.(mdc|md)$/, '');
        const hash = data.pathHash || '';
        return hash ? `${hash}_${baseName}` : baseName;
    }

    /**
     * 判断是否为 Base64 图片数据
     */
    function _isBase64Image(str) {
        return str && str.startsWith('data:image/');
    }

    /**
     * 判断批注中是否包含 Base64 图片（需要额外导出 JSON）
     */
    function _hasBase64Images(annotations) {
        return annotations.some(a => a.images && a.images.some(img => _isBase64Image(img)));
    }

    async function exportReviewDocument() {
        const data = Store.getData();
        if (!data.annotations.length) {
            alert(t('notification.export_empty'));
            return;
        }

        const blocks = Renderer.parseMarkdown(data.rawMarkdown);
        const doc = generateReviewDoc(data, blocks);
        const rbaseName = _reviewBaseName(data);
        const version = data.reviewVersion || 1;
        const mdFileName = `${rbaseName}_v${version}_record.md`;

        // 通过 Extension Host 保存
        const saved = await saveViaHost(mdFileName, doc);
        if (saved) {
showExportSuccess(`已保存到 .review 目录：${mdFileName}`);
            // 只有包含 Base64 图片时才需要额外导出 JSON（路径引用的图片已在文件系统中）
            if (_hasBase64Images(data.annotations)) {
                const jsonFileName = `${rbaseName}_v${version}_data.json`;
                const json = JSON.stringify({
                    fileName: data.fileName,
                    rawMarkdown: data.rawMarkdown,
                    reviewVersion: version,
                    annotations: data.annotations
                }, null, 2);
                await saveViaHost(jsonFileName, json);
            }
            return;
        }

        showExportSuccess('导出失败，请检查工作区设置');
    }

    function showExportSuccess(msg) {
        let toast = document.getElementById('_toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = '_toast';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    function generateReviewDoc(data, blocks) {
        const lines = [];
        const docVersion = data.docVersion || t('export.unknown');

        lines.push(`# ${t('export.title')}`);
        lines.push(``);
        lines.push(`- **${t('export.source_file')}**：${data.fileName}`);
        if (data.sourceFilePath) {
            lines.push(`- **${t('export.source_path')}**：${data.sourceFilePath}`);
        }
        lines.push(`- **${t('export.source_version')}**：${docVersion}`);
        lines.push(`- **${t('export.review_time')}**：${formatDate()}`);
        lines.push(`- **${t('export.review_version')}**：v${data.reviewVersion || 1}`);
        lines.push(`- **${t('export.annotation_count')}**：${data.annotations.length}`);
        lines.push(`  - ${t('export.type_comment')}：${data.annotations.filter(a => a.type === 'comment').length}`);
        lines.push(`  - ${t('export.type_delete')}：${data.annotations.filter(a => a.type === 'delete').length}`);
        lines.push(`  - ${t('export.type_insert_after')}：${data.annotations.filter(a => a.type === 'insert' && a.insertPosition !== 'before').length}`);
        lines.push(`  - ${t('export.type_insert_before')}：${data.annotations.filter(a => a.type === 'insert' && a.insertPosition === 'before').length}`);
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
        lines.push(`## ${t('export.section_instructions')}`);
        lines.push(``);
        lines.push(`> ${t('export.instruction_order_hint')}`);
        lines.push(`> ${t('export.instruction_anchor_hint')}`);
        lines.push(``);

        // 按 blockIndex 倒序排列（从文档末尾到开头），同一块内按 startOffset 倒序
        // 这样 AI 从后往前执行修改时，不会影响前面块的序号和偏移
        const sortedAnnotations = [...data.annotations].sort((a, b) => {
            if (a.blockIndex !== b.blockIndex) { return b.blockIndex - a.blockIndex; }
            return (b.startOffset || 0) - (a.startOffset || 0);
        });

        sortedAnnotations.forEach((ann, i) => {
            const num = i + 1;
            const blockContent = blocks[ann.blockIndex] || '';
            const blockFingerprint = blockContent.substring(0, 80).replace(/\n/g, ' ');

            const insertLabel = ann.type === 'insert' ? (ann.insertPosition === 'before' ? '（前插）' : '（后插）') : '';
            lines.push(`### 指令 ${num}${ann.type === 'comment' ? '（修改）' : ann.type === 'delete' ? '（删除）' : insertLabel}`);
            lines.push(``);

            if (ann.type === 'comment') {
                lines.push(`- **操作**：根据评论修改内容`);
                lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                if (blockFingerprint) {
                    lines.push(`- **文本锚点**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **块内偏移**：第 ${ann.startOffset} 个字符处（startOffset=${ann.startOffset}）`);
                }
                lines.push(`- **目标文本**：`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
                lines.push(`- **评论内容**：${ann.comment}`);
                if (ann.images && ann.images.length > 0) {
                    lines.push(`- **附图**：共 ${ann.images.length} 张`);
                    ann.images.forEach((img, j) => {
                        lines.push(`  - 图片${j + 1}：`);
                        lines.push(`  ![附图${j + 1}](${img})`);
                    });
                }
            } else if (ann.type === 'delete') {
                lines.push(`- **操作**：删除以下文本`);
                lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                if (blockFingerprint) {
                    lines.push(`- **文本锚点**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **块内偏移**：第 ${ann.startOffset} 个字符处（startOffset=${ann.startOffset}）`);
                }
                lines.push(`- **要删除的文本**：`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
            } else if (ann.type === 'insert') {
                const isBefore = ann.insertPosition === 'before';
                lines.push(`- **操作**：在指定位置${isBefore ? '前' : '后'}插入新内容`);
                lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                if (blockFingerprint) {
                    lines.push(`- **文本锚点**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **块内偏移**：第 ${ann.startOffset} 个字符处（startOffset=${ann.startOffset}）`);
                }
                lines.push(`- **插入位置（在此文本之${isBefore ? '前' : '后'}）**：`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
                lines.push(`- **要插入的内容**：`);
                lines.push(`\`\`\``);
                lines.push(ann.insertContent);
                lines.push(`\`\`\``);
                if (ann.comment) {
                    lines.push(`- **插入说明**：${ann.comment}`);
                }
            }
            lines.push(``);
        });

        lines.push(`---`);
        lines.push(``);
        lines.push(`## 原始数据（JSON）`);
        lines.push(``);
        lines.push(`> 如需精确操作，可使用以下 JSON 数据。其中 \`blockIndex\` 是基于空行分割的块索引（从0开始），\`startOffset\` 是目标文本在块内的字符偏移量（从0开始），可用于区分同一块内的重复文本。`);
        lines.push(``);
        lines.push(`\`\`\`json`);

        const exportAnnotations = data.annotations.map(a => ({ ...a }));
        lines.push(JSON.stringify({
            fileName: data.fileName,
            docVersion: data.docVersion || '未知',
            reviewVersion: data.reviewVersion || 1,
            annotationCount: data.annotations.length,
            rawMarkdown: data.rawMarkdown || '',
            annotations: exportAnnotations
        }, null, 2));
        lines.push(`\`\`\``);

        if (data.annotations.some(a => a.images && a.images.length > 0)) {
            const hasBase64 = _hasBase64Images(data.annotations);
            const hasPathImages = data.annotations.some(a => a.images && a.images.some(img => !_isBase64Image(img)));
            lines.push(``);
            if (hasPathImages) {
lines.push(`> **注意**：批注中包含图片附件，图片文件存储在 .review 目录的 images 子目录中。`);
            }
            if (hasBase64) {
                lines.push(`> **注意**：部分批注包含 Base64 图片数据，完整图片数据已同时导出为 JSON 文件，请一并发送给 AI。`);
            }
        }

        return lines.join('\n');
    }

    function formatDate() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    }

    // ===== 通过 Extension Host 保存 =====

    function saveViaHost(fileName, content) {
        return new Promise((resolve) => {
            const requestId = 'save_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const handler = (event) => {
                const msg = event.data;
                if (msg.type === 'reviewSaved' && msg.requestId === requestId) {
                    window.removeEventListener('message', handler);
                    resolve(msg.payload && msg.payload.success);
                }
            };
            window.addEventListener('message', handler);
            vscode.postMessage({ type: 'saveReview', payload: { fileName, content }, requestId });
            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve(false);
            }, 5000);
        });
    }

    // ===== 自动保存 =====

    function enableAutoSave() {
        autoSaveEnabled = true;
        doAutoSave();
        return true;
    }

    function disableAutoSave() {
        autoSaveEnabled = false;
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        }
    }

    function triggerAutoSave() {
        if (!autoSaveEnabled) {
            autoSaveEnabled = true;
        }
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = setTimeout(() => doAutoSave(), AUTO_SAVE_DELAY);
    }

    async function doAutoSave() {
        const data = Store.getData();
        if (!data.fileName) return;

        // 批注为空时：仅更新 UI 状态，不删除磁盘记录
        // 理由：磁盘记录作为历史版本保留，方便用户回溯之前的批阅成果；
        // 只有用户显式点击"清除全部批注"时，才会主动删除磁盘文件。
        // 这样可以避免 handleRefresh 内容变化分支、setFile 清空 annotations 等场景
        // 误删用户已保存的历史批阅记录。
        //
        // 特殊情况：刷新后 reviewVersion 自增到 >1 且批注为空时，必须落盘一条
        // 空占位记录（v{N}_record.md），否则磁盘上只有上一版 v{N-1} 记录，
        // 下次打开文件时 getReviewRecords 返回最新为 v{N-1}，会把已处理过的
        // 旧批注错误地恢复给用户（Bug: AI 修复后重开仍见旧批注）。
        if (!data.annotations.length) {
            const version = data.reviewVersion || 1;
            if (version > 1) {
                try {
                    const blocks = Renderer.parseMarkdown(data.rawMarkdown);
                    const doc = generateReviewDoc(data, blocks);
                    const rbaseName = _reviewBaseName(data);
                    const mdFileName = `${rbaseName}_v${version}_record.md`;
                    const saved = await saveViaHost(mdFileName, doc);
                    updateAutoSaveStatus(saved ? 'saved' : 'error');
                } catch (e) {
                    console.error('[AutoSave] 空版本占位记录保存失败:', e);
                    updateAutoSaveStatus('error');
                }
                return;
            }
            updateAutoSaveStatus('saved');
            return;
        }

        try {
            const blocks = Renderer.parseMarkdown(data.rawMarkdown);
            const doc = generateReviewDoc(data, blocks);
            const rbaseName = _reviewBaseName(data);
            const version = data.reviewVersion || 1;
            const mdFileName = `${rbaseName}_v${version}_record.md`;

            const saved = await saveViaHost(mdFileName, doc);
            if (saved) {
                updateAutoSaveStatus('saved');
                // 只有包含 Base64 图片时才需要额外保存 JSON（路径引用的图片已在文件系统中）
                if (_hasBase64Images(data.annotations)) {
                    const jsonFileName = `${rbaseName}_v${version}_data.json`;
                    const json = JSON.stringify({
                        fileName: data.fileName,
                        rawMarkdown: data.rawMarkdown,
                        reviewVersion: version,
                        annotations: data.annotations
                    }, null, 2);
                    await saveViaHost(jsonFileName, json);
                }
            } else {
                updateAutoSaveStatus('error');
            }
        } catch (e) {
            console.error('[AutoSave] 自动保存异常:', e);
            updateAutoSaveStatus('error');
        }
    }

    function updateAutoSaveStatus(status) {
        const indicator = document.getElementById('autoSaveStatus');
        if (!indicator) return;
        if (status === 'saved') {
            indicator.textContent = '✓ 已自动保存';
            indicator.className = 'auto-save-status saved';
        } else if (status === 'error') {
            indicator.textContent = t('notification.auto_save_failed');
            indicator.className = 'auto-save-status error';
        }
        setTimeout(() => {
            if (indicator.textContent !== '✗ 保存失败') {
                indicator.className = 'auto-save-status';
            }
        }, 5000);
    }

    function isAutoSaveEnabled() {
        return autoSaveEnabled;
    }

    return {
        exportReviewDocument, generateReviewDoc,
        enableAutoSave, disableAutoSave, triggerAutoSave, isAutoSaveEnabled
    };
})();
