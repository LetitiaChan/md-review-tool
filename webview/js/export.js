/**
 * export.js - 导出模块（VSCode 插件版）
 * 将批阅操作导出为 AI 可读的结构化文档
 * 通过 postMessage 保存到 Extension Host
 */
const Exporter = (() => {

    let autoSaveEnabled = false;
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1500;

    async function exportReviewDocument() {
        const data = Store.getData();
        if (!data.annotations.length) {
            alert('暂无批注可导出');
            return;
        }

        const blocks = Renderer.parseMarkdown(data.rawMarkdown);
        const doc = generateReviewDoc(data, blocks);
        const baseName = data.fileName.replace(/\.(mdc|md)$/, '');
        const version = data.reviewVersion || 1;
        const mdFileName = `批阅记录_${baseName}_v${version}.md`;

        // 通过 Extension Host 保存
        const saved = await saveViaHost(mdFileName, doc);
        if (saved) {
            showExportSuccess(`已保存到批阅文件夹：${mdFileName}`);
            if (data.annotations.some(a => a.images && a.images.length > 0)) {
                const jsonFileName = `批阅数据_${baseName}_v${version}.json`;
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
        const docVersion = data.docVersion || '未知';

        lines.push(`# 批阅记录`);
        lines.push(``);
        lines.push(`- **源文件**：${data.fileName}`);
        if (data.sourceFilePath) {
            lines.push(`- **源文件路径**：${data.sourceFilePath}`);
        }
        lines.push(`- **源文件版本**：${docVersion}`);
        lines.push(`- **批阅时间**：${formatDate()}`);
        lines.push(`- **批阅版本**：v${data.reviewVersion || 1}`);
        lines.push(`- **批注数量**：${data.annotations.length} 条`);
        lines.push(`  - 评论：${data.annotations.filter(a => a.type === 'comment').length} 条`);
        lines.push(`  - 删除：${data.annotations.filter(a => a.type === 'delete').length} 条`);
        lines.push(`  - 插入：${data.annotations.filter(a => a.type === 'insert').length} 条`);
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
        lines.push(`## 操作指令`);
        lines.push(``);
        lines.push(`> 请按以下指令逐条修改源文件 \`${data.fileName}\`。每条指令包含操作类型、定位信息和具体内容。`);
        lines.push(``);

        data.annotations.forEach((ann, i) => {
            const num = i + 1;
            const blockContent = blocks[ann.blockIndex] || '';
            const blockPreview = blockContent.substring(0, 80).replace(/\n/g, ' ');

            lines.push(`### 指令 ${num}${ann.type === 'comment' ? '（修改）' : ann.type === 'delete' ? '（删除）' : '（插入）'}`);
            lines.push(``);

            if (ann.type === 'comment') {
                lines.push(`- **操作**：根据评论修改内容`);
                lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块（"${blockPreview}..."）`);
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
                lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块（"${blockPreview}..."）`);
                lines.push(`- **要删除的文本**：`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
            } else if (ann.type === 'insert') {
                lines.push(`- **操作**：在指定位置后插入新内容`);
                lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块（"${blockPreview}..."）`);
                lines.push(`- **插入位置（在此文本之后）**：`);
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
        lines.push(`> 如需精确操作，可使用以下 JSON 数据。其中 \`blockIndex\` 是基于空行分割的块索引（从0开始）。`);
        lines.push(``);
        lines.push(`\`\`\`json`);

        const exportAnnotations = data.annotations.map(a => ({ ...a }));
        lines.push(JSON.stringify({
            fileName: data.fileName,
            docVersion: data.docVersion || '未知',
            reviewVersion: data.reviewVersion || 1,
            annotationCount: data.annotations.length,
            annotations: exportAnnotations
        }, null, 2));
        lines.push(`\`\`\``);

        if (data.annotations.some(a => a.images && a.images.length > 0)) {
            lines.push(``);
            lines.push(`> **注意**：批注中包含图片附件。完整图片数据已同时导出为 JSON 文件，请一并发送给 AI。`);
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

        // 批注为空时，删除磁盘上的批阅记录文件
        if (!data.annotations.length) {
            try {
                const requestId = 'delete_review_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                vscode.postMessage({ type: 'deleteReviewRecords', payload: { fileName: data.fileName }, requestId });
                updateAutoSaveStatus('saved');
            } catch (e) {
                console.warn('[AutoSave] 删除空批阅记录失败:', e);
            }
            return;
        }

        try {
            const blocks = Renderer.parseMarkdown(data.rawMarkdown);
            const doc = generateReviewDoc(data, blocks);
            const baseName = data.fileName.replace(/\.(mdc|md)$/, '');
            const version = data.reviewVersion || 1;
            const mdFileName = `批阅记录_${baseName}_v${version}.md`;

            const saved = await saveViaHost(mdFileName, doc);
            if (saved) {
                updateAutoSaveStatus('saved');
                if (data.annotations.some(a => a.images && a.images.length > 0)) {
                    const jsonFileName = `批阅数据_${baseName}_v${version}.json`;
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
            indicator.textContent = '✗ 保存失败';
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
