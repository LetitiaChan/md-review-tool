/**
 * export.js - 导出模块（VSCode 插件版）
 * 将批阅操作导出为 AI 可读的结构化文档
 * 通过 postMessage 保存到 Extension Host
 */
const Exporter = (() => {

    let autoSaveEnabled = false;
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1500;
    // 实际使用的延迟，可由设置（mdReview.autoSaveDelay）覆盖
    let autoSaveDelay = AUTO_SAVE_DELAY;
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
            showExportSuccess(t('notification.export_saved', { name: mdFileName }));
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

        showExportSuccess(t('notification.export_failed'));
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
        const sep = t('export.field_separator');
        const lines = [];
        const docVersion = data.docVersion || t('export.unknown');

        lines.push(`# ${t('export.title')}`);
        lines.push(``);
        lines.push(`- **${t('export.source_file')}**${sep}${data.fileName}`);
        if (data.sourceFilePath) {
            lines.push(`- **${t('export.source_path')}**${sep}${data.sourceFilePath}`);
        }
        lines.push(`- **${t('export.source_version')}**${sep}${docVersion}`);
        lines.push(`- **${t('export.review_time')}**${sep}${formatDate()}`);
        lines.push(`- **${t('export.review_version')}**${sep}v${data.reviewVersion || 1}`);
        lines.push(`- **${t('export.annotation_count')}**${sep}${data.annotations.length}`);
        lines.push(`  - ${t('export.type_comment')}${sep}${data.annotations.filter(a => a.type === 'comment').length}`);
        lines.push(`  - ${t('export.type_delete')}${sep}${data.annotations.filter(a => a.type === 'delete').length}`);
        lines.push(`  - ${t('export.type_insert_after')}${sep}${data.annotations.filter(a => a.type === 'insert' && a.insertPosition !== 'before').length}`);
        lines.push(`  - ${t('export.type_insert_before')}${sep}${data.annotations.filter(a => a.type === 'insert' && a.insertPosition === 'before').length}`);
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

            const insertLabel = ann.type === 'insert'
                ? (ann.insertPosition === 'before' ? t('export.label_insert_before') : t('export.label_insert_after'))
                : '';
            const typeLabel = ann.type === 'comment' ? t('export.label_modify')
                : ann.type === 'delete' ? t('export.label_delete')
                    : insertLabel;
            lines.push(`### ${t('export.instruction_num', { num })}${typeLabel}`);
            lines.push(``);

            if (ann.orphaned) {
                lines.push(`- **${t('export.field_locate_status')}**${sep}${t('export.orphaned_note')}`);
            }

            if (ann.type === 'comment') {
                lines.push(`- **${t('export.field_operation')}**${sep}${t('export.op_modify')}`);
                if (!ann.orphaned) lines.push(`- **${t('export.field_block')}**${sep}${t('export.field_block_value', { n: ann.blockIndex + 1 })}`);
                if (!ann.orphaned && blockFingerprint) {
                    lines.push(`- **${t('export.field_anchor')}**${sep}\`${blockFingerprint}\``);
                }
                if (!ann.orphaned && ann.startOffset != null) {
                    lines.push(`- **${t('export.field_offset')}**${sep}${t('export.field_offset_value', { n: ann.startOffset })}`);
                }
                lines.push(`- **${t('export.field_target_text')}**${sep}`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
                lines.push(`- **${t('export.field_comment')}**${sep}${ann.comment}`);
                if (ann.images && ann.images.length > 0) {
                    lines.push(`- **${t('export.field_images')}**${sep}${t('export.field_images_count', { count: ann.images.length })}`);
                    ann.images.forEach((img, j) => {
                        lines.push(`  - ${t('export.field_image_n', { n: j + 1 })}`);
                        lines.push(`  ![${t('export.image_alt', { n: j + 1 })}](${img})`);
                    });
                }
            } else if (ann.type === 'delete') {
                lines.push(`- **${t('export.field_operation')}**${sep}${t('export.op_delete')}`);
                if (!ann.orphaned) lines.push(`- **${t('export.field_block')}**${sep}${t('export.field_block_value', { n: ann.blockIndex + 1 })}`);
                if (!ann.orphaned && blockFingerprint) {
                    lines.push(`- **${t('export.field_anchor')}**${sep}\`${blockFingerprint}\``);
                }
                if (!ann.orphaned && ann.startOffset != null) {
                    lines.push(`- **${t('export.field_offset')}**${sep}${t('export.field_offset_value', { n: ann.startOffset })}`);
                }
                lines.push(`- **${t('export.field_delete_text')}**${sep}`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
            } else if (ann.type === 'insert') {
                const isBefore = ann.insertPosition === 'before';
                lines.push(`- **${t('export.field_operation')}**${sep}${isBefore ? t('export.op_insert_before') : t('export.op_insert_after')}`);
                if (!ann.orphaned) lines.push(`- **${t('export.field_block')}**${sep}${t('export.field_block_value', { n: ann.blockIndex + 1 })}`);
                if (!ann.orphaned && blockFingerprint) {
                    lines.push(`- **${t('export.field_anchor')}**${sep}\`${blockFingerprint}\``);
                }
                if (!ann.orphaned && ann.startOffset != null) {
                    lines.push(`- **${t('export.field_offset')}**${sep}${t('export.field_offset_value', { n: ann.startOffset })}`);
                }
                lines.push(`- **${isBefore ? t('export.field_insert_position_before') : t('export.field_insert_position_after')}**${sep}`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
                lines.push(`- **${t('export.field_insert_content')}**${sep}`);
                lines.push(`\`\`\``);
                lines.push(ann.insertContent);
                lines.push(`\`\`\``);
                if (ann.comment) {
                    lines.push(`- **${t('export.field_insert_reason')}**${sep}${ann.comment}`);
                }
            }
            lines.push(``);
        });

        lines.push(`---`);
        lines.push(``);
        lines.push(`## ${t('export.section_json')}`);
        lines.push(``);
        lines.push(`> ${t('export.json_hint')}`);
        lines.push(``);
        lines.push(`\`\`\`json`);

        const exportAnnotations = data.annotations.map(a => ({ ...a }));
        lines.push(JSON.stringify({
            fileName: data.fileName,
            docVersion: data.docVersion || t('export.unknown'),
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
                lines.push(`> ${t('export.image_note')}`);
            }
            if (hasBase64) {
                lines.push(`> ${t('export.base64_note')}`);
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
        // 用户关闭自动保存后不再静默重新打开；只有显式调用 enableAutoSave() 才能开启
        if (!autoSaveEnabled) return;
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = setTimeout(() => doAutoSave(), autoSaveDelay);
    }

    /**
     * 应用设置中的自动保存延迟（毫秒）
     */
    function setAutoSaveDelay(ms) {
        const value = parseInt(ms, 10);
        if (Number.isFinite(value) && value > 0) {
            autoSaveDelay = value;
        }
    }

    /**
     * 立即执行一次自动保存（绕过 AUTO_SAVE_DELAY 防抖）。
     *
     * 用于手动保存（Ctrl+S）之后：.md 文件已更新，但 .review 里的
     * rawMarkdown 快照还是旧的，下次打开会被 _isRecordStaleOnOpen 误判为
     * 外部修改并错误地升版、把批注归档（issue #4）。
     */
    function doAutoSaveNow() {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = null;
        }
        return doAutoSave();
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
            // 无论版本号是多少，只要磁盘上可能存在旧记录（有批注的版本），
            // 都必须落盘一条空批注记录来覆盖/更新，否则下次打开文件时
            // getReviewRecords 返回的旧记录仍包含已删除的批注，会被错误恢复。
            // 典型场景：v1 添加批注 → 逐个删除 → 最后一个删除后 annotations 为空，
            // 但磁盘上 v1_record.md 仍包含旧批注 → 重开文件时旧批注被恢复。
            try {
                const blocks = Renderer.parseMarkdown(data.rawMarkdown);
                const doc = generateReviewDoc(data, blocks);
                const rbaseName = _reviewBaseName(data);
                const mdFileName = `${rbaseName}_v${version}_record.md`;
                const saved = await saveViaHost(mdFileName, doc);
                updateAutoSaveStatus(saved ? 'saved' : 'error');
                if (saved && Store.setHasReviewRecord) Store.setHasReviewRecord(true);
            } catch (e) {
                console.error('[AutoSave] 空版本占位记录保存失败:', e);
                updateAutoSaveStatus('error');
            }
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
                if (Store.setHasReviewRecord) Store.setHasReviewRecord(true);
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
            indicator.textContent = t('notification.auto_saved');
            indicator.className = 'auto-save-status saved';
        } else if (status === 'error') {
            indicator.textContent = t('notification.auto_save_failed');
            indicator.className = 'auto-save-status error';
        }
        setTimeout(() => {
            if (indicator.textContent !== t('notification.auto_save_failed')) {
                indicator.className = 'auto-save-status';
            }
        }, 5000);
    }

    function isAutoSaveEnabled() {
        return autoSaveEnabled;
    }

    return {
        exportReviewDocument, generateReviewDoc,
        enableAutoSave, disableAutoSave, triggerAutoSave, isAutoSaveEnabled, setAutoSaveDelay,
        doAutoSaveNow
    };
})();

// ===== ESM export (for webview bundler) =====
export { Exporter };
