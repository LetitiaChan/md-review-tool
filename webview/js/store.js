/**
 * store.js - 数据存储模块（VSCode 插件版）
 * 管理所有批注数据，通过 postMessage 桥接到 Extension Host 的 workspaceState
 * 同时使用 vscode.setState/getState 作为 Webview 内部快速缓存
 */
const Store = (() => {
    const STORAGE_KEY = 'md_review_data';

    let data = {
        fileName: '',
        rawMarkdown: '',
        fileHash: '',
        docVersion: '',
        sourceFilePath: '',
        sourceDir: '',
        relPath: '',
        pathHash: '',
        annotations: [],
        nextId: 1,
        reviewVersion: 1,
        createdAt: '',
        // 是否已经落盘过批阅记录。首次打开且无批注时不必生成空记录（issue #3）
        hasReviewRecord: false
    };

    function save() {
        try {
            // 快速缓存到 Webview state（面板隐藏后恢复用）
            vscode.setState({ [STORAGE_KEY]: data });
            // 持久化到 Extension Host workspaceState
            vscode.postMessage({ type: 'setState', payload: { key: STORAGE_KEY, value: data } });
        } catch (e) {
            console.warn('[Store] 存储失败:', e);
        }
        if (typeof Exporter !== 'undefined' && Exporter.triggerAutoSave) {
            // issue #3：首次打开文件时不生成「没有任何改动」的空记录。
            // 只有已经存在记录、有批注，或内容变化导致版本自增时才需要落盘。
            const hasAnnotations = data.annotations.length > 0;
            const versionBumped = (data.reviewVersion || 1) > 1;
            if (hasAnnotations || versionBumped || data.hasReviewRecord) {
                Exporter.triggerAutoSave();
            }
        }
    }

    function load() {
        try {
            // 优先从 Webview state 恢复（同步，快速）
            const state = vscode.getState();
            if (state && state[STORAGE_KEY]) {
                data = state[STORAGE_KEY];
                if (!data.fileHash) data.fileHash = '';
                if (!data.docVersion) data.docVersion = '';
                if (!data.sourceFilePath) data.sourceFilePath = '';
                if (!data.sourceDir) data.sourceDir = '';
                if (!data.relPath) data.relPath = '';
                if (!data.pathHash) data.pathHash = '';
                if (!data.reviewVersion) data.reviewVersion = 1;
                if (!data.createdAt) data.createdAt = new Date().toISOString();
            }
        } catch (e) {
            console.warn('读取存储失败:', e);
        }
        return data;
    }

    /**
     * 从 Extension Host workspaceState 异步恢复数据
     */
    function loadFromHost() {
        return new Promise((resolve) => {
            const requestId = 'state_load_' + Date.now();
            const handler = (event) => {
                const msg = event.data;
                if (msg.type === 'stateValue' && msg.requestId === requestId) {
                    window.removeEventListener('message', handler);
                    if (msg.payload && msg.payload.value) {
                        data = msg.payload.value;
                        if (!data.fileHash) data.fileHash = '';
                        if (!data.docVersion) data.docVersion = '';
                        if (!data.sourceFilePath) data.sourceFilePath = '';
                        if (!data.sourceDir) data.sourceDir = '';
                        if (!data.relPath) data.relPath = '';
                        if (!data.pathHash) data.pathHash = '';
                        if (!data.reviewVersion) data.reviewVersion = 1;
                        if (!data.createdAt) data.createdAt = new Date().toISOString();
                        vscode.setState({ [STORAGE_KEY]: data });
                    }
                    resolve(data);
                }
            };
            window.addEventListener('message', handler);
            vscode.postMessage({ type: 'getState', payload: { key: STORAGE_KEY }, requestId });
            // Timeout fallback
            setTimeout(() => {
                window.removeEventListener('message', handler);
                resolve(data);
            }, 3000);
        });
    }

    function reset() {
        data = {
            fileName: '',
            rawMarkdown: '',
            fileHash: '',
            docVersion: '',
            sourceFilePath: '',
            sourceDir: '',
            relPath: '',
            pathHash: '',
            annotations: [],
            nextId: 1,
            reviewVersion: 1,
            createdAt: new Date().toISOString(),
            hasReviewRecord: false
        };
        save();
    }

    function setFile(name, markdown, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash) {
        // 文件名不足以标识文件（不同目录下经常都有 README.md）。两端都具备
        // 更强标识时优先比较它；旧记录缺少路径元数据时才退回文件名。
        const sameFile = pathHash && data.pathHash
            ? pathHash === data.pathHash
            : sourceFilePath && data.sourceFilePath
                ? sourceFilePath === data.sourceFilePath
                : relPath && data.relPath
                    ? relPath === data.relPath
                    : data.fileName === name;
        const hashChanged = sameFile && data.fileHash && fileHash && data.fileHash !== fileHash;
        const contentChanged = sameFile && !fileHash && data.rawMarkdown && markdown
            && data.rawMarkdown.trim() !== markdown.trim();

        if (hashChanged || contentChanged) {
            archiveCurrentRecord();
            // 源文件更新不等于批注已处理。保留批注，待新文档分块完成后按
            // selectedText 重新定位；定位失败的批注也会留在列表中供人工处理。
            data.rawMarkdown = markdown;
            data.fileHash = fileHash || '';
            data.docVersion = docVersion || '';
            data.sourceFilePath = sourceFilePath || data.sourceFilePath || '';
            data.sourceDir = sourceDir || data.sourceDir || '';
            data.relPath = relPath || data.relPath || '';
            data.pathHash = pathHash || data.pathHash || '';
            data.reviewVersion = (data.reviewVersion || 1) + 1;
            data.createdAt = new Date().toISOString();
        } else if (!sameFile) {
            data.fileName = name;
            data.rawMarkdown = markdown;
            data.fileHash = fileHash || '';
            data.docVersion = docVersion || '';
            data.sourceFilePath = sourceFilePath || '';
            data.sourceDir = sourceDir || '';
            data.relPath = relPath || '';
            data.pathHash = pathHash || '';
            data.annotations = [];
            data.nextId = 1;
            data.reviewVersion = 1;
            data.createdAt = new Date().toISOString();
            data.hasReviewRecord = false;
        } else {
            data.rawMarkdown = markdown;
            if (fileHash) data.fileHash = fileHash;
            if (docVersion) data.docVersion = docVersion;
            if (sourceFilePath) data.sourceFilePath = sourceFilePath;
            if (sourceDir) data.sourceDir = sourceDir;
            if (relPath) data.relPath = relPath;
            if (pathHash) data.pathHash = pathHash;
        }
        save();
    }

    function archiveCurrentRecord() {
        // Archive is handled via auto-save to file system
    }

    function getArchivedRecords(fileName) {
        return [];
    }

    function addAnnotation(annotation) {
        annotation.id = data.nextId++;
        annotation.timestamp = new Date().toISOString();
        data.annotations.push(annotation);
        data.annotations.sort((a, b) => {
            if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
            return a.startOffset - b.startOffset;
        });
        save();
        return annotation;
    }

    function removeAnnotation(id) {
        data.annotations = data.annotations.filter(a => a.id !== id);
        // 重新编号，保证序号连续
        data.annotations.forEach((a, i) => { a.id = i + 1; });
        data.nextId = data.annotations.length + 1;
        save();
    }

    function updateAnnotation(id, updates) {
        const idx = data.annotations.findIndex(a => a.id === id);
        if (idx >= 0) {
            Object.assign(data.annotations[idx], updates);
            save();
        }
    }

    function getAnnotations() { return data.annotations; }
    function getAnnotationsForBlock(blockIndex) { return data.annotations.filter(a => a.blockIndex === blockIndex); }
    function getData() { return data; }

    function clearAll() {
        data.annotations = [];
        data.nextId = 1;
        // 记录文件已被用户显式删除，后续不再生成空占位记录
        data.hasReviewRecord = false;
        save();
    }

    function getFileHash() { return data.fileHash; }
    function setFileHash(hash) { data.fileHash = hash; save(); }
    function getDocVersion() { return data.docVersion || ''; }
    function setDocVersion(version) { data.docVersion = version || ''; save(); }
    function getSourceFilePath() { return data.sourceFilePath || ''; }
    function getSourceDir() { return data.sourceDir || ''; }
    function getRelPath() { return data.relPath || ''; }

    function restoreFromReviewRecord(record, fileName, markdown, docVersion) {
        data.fileName = fileName;
        data.rawMarkdown = markdown;
        data.docVersion = docVersion || '';
        data.reviewVersion = record.reviewVersion || 1;
        data.createdAt = record.createdAt || new Date().toISOString();
        data.hasReviewRecord = true;

        if (record.annotations && record.annotations.length > 0) {
            data.annotations = record.annotations;
            data.nextId = Math.max(...record.annotations.map(a => a.id || 0)) + 1;
        } else {
            data.annotations = [];
            data.nextId = 1;
        }
        save();
        console.log('[Store] 从 .review 恢复批阅记录:', fileName, '评审版本:', data.reviewVersion, '批注数:', data.annotations.length);
    }

    function restoreFootnoteComments(footnoteComments) {
        if (!Array.isArray(footnoteComments) || footnoteComments.length === 0) {
            return false;
        }
        const existing = new Set(data.annotations
            .map(a => a.footnoteId)
            .filter(Boolean));
        let changed = false;
        footnoteComments.forEach(comment => {
            if (!comment || !comment.footnoteId || existing.has(comment.footnoteId)) {
                return;
            }
            data.annotations.push({
                ...comment,
                id: data.nextId++,
                timestamp: new Date().toISOString(),
                images: Array.isArray(comment.images) ? comment.images : []
            });
            existing.add(comment.footnoteId);
            changed = true;
        });
        if (changed) {
            data.annotations.sort((a, b) => {
                if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
                return (a.startOffset || 0) - (b.startOffset || 0);
            });
            save();
        }
        return changed;
    }

    function normalizeAnchorText(text) {
        return String(text || '')
            .replace(/^%%FRONTMATTER%%\n/, '')
            .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/<[^>]+>/g, ' ')
            .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)/gm, '')
            .replace(/[*_~`]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 在更新后的 Markdown 分块中重新定位现有批注。
     * 仅唯一匹配或原块号与偏移仍精确匹配时更新位置；否则标记 orphaned，
     * 避免在重复文本之间猜测。
     */
    function reanchorAnnotations(newBlocks) {
        if (!Array.isArray(newBlocks)) {
            return { resolved: 0, unresolved: data.annotations.length };
        }

        const searchableBlocks = newBlocks.map(normalizeAnchorText);
        const blockRanges = [];
        let searchableDocument = '';
        searchableBlocks.forEach((blockText, blockIndex) => {
            if (blockIndex > 0) searchableDocument += ' ';
            const start = searchableDocument.length;
            searchableDocument += blockText;
            blockRanges.push({ start, end: searchableDocument.length });
        });
        let resolved = 0;
        let unresolved = 0;

        data.annotations.forEach(annotation => {
            const anchor = normalizeAnchorText(annotation.selectedText);
            if (!anchor) {
                annotation.orphaned = true;
                unresolved++;
                return;
            }

            const candidates = [];
            let matchAt = searchableDocument.indexOf(anchor);
            while (matchAt >= 0) {
                const matchEnd = matchAt + anchor.length;
                const blockIndex = blockRanges.findIndex(range => matchAt >= range.start && matchAt < range.end);
                const endBlockIndex = blockRanges.findIndex(range => matchEnd - 1 >= range.start && matchEnd - 1 < range.end);
                if (blockIndex >= 0 && endBlockIndex >= blockIndex) {
                    candidates.push({
                        blockIndex,
                        endBlockIndex,
                        offset: matchAt - blockRanges[blockIndex].start,
                        endOffset: matchEnd - blockRanges[endBlockIndex].start
                    });
                }
                matchAt = searchableDocument.indexOf(anchor, matchAt + 1);
            }

            if (candidates.length === 0) {
                annotation.orphaned = true;
                unresolved++;
                return;
            }

            const oldBlockIndex = Number.isInteger(annotation.blockIndex) ? annotation.blockIndex : 0;
            const oldStartOffset = Number.isInteger(annotation.startOffset) ? annotation.startOffset : 0;
            const oldPositionCandidate = candidates.find(candidate =>
                candidate.blockIndex === oldBlockIndex && candidate.offset === oldStartOffset
            );
            const best = oldPositionCandidate || (candidates.length === 1 ? candidates[0] : null);
            if (!best) {
                annotation.orphaned = true;
                unresolved++;
                return;
            }
            annotation.blockIndex = best.blockIndex;
            annotation.endBlockIndex = best.endBlockIndex;
            annotation.startOffset = best.offset;
            if (annotation.type !== 'insert') {
                annotation.endOffset = best.endOffset;
            }
            annotation.orphaned = false;
            resolved++;
        });

        save();
        return { resolved, unresolved };
    }

    /**
     * 强制升级版本号（用于"关闭期间源文件被修改"场景）
     * 场景：webview 关闭时磁盘上 md 文件被外部修改，重新打开时 webview 检测到
     *       记录里的 rawMarkdown 与当前源文件内容不一致，须视为新的批阅版本；
     *       旧批注仍保留，随后由 reanchorAnnotations 更新锚点。
     * @param {number} fromVersion 磁盘记录里的 reviewVersion（升级基准）
     * @param {string} markdown 当前源文件内容
     * @param {string} docVersion 当前源文件的 docVersion（可选）
     * @param {Array} annotations 要带入新版本的批注（可选）
     */
    function forceBumpVersion(fromVersion, markdown, docVersion, annotations) {
        data.reviewVersion = (fromVersion || 1) + 1;
        data.rawMarkdown = markdown;
        if (docVersion) data.docVersion = docVersion;
        data.annotations = Array.isArray(annotations) ? annotations.map(annotation => ({ ...annotation })) : data.annotations;
        data.nextId = data.annotations.length > 0
            ? Math.max(...data.annotations.map(annotation => annotation.id || 0)) + 1
            : 1;
        data.createdAt = new Date().toISOString();
        save();
        console.log('[Store] 关闭期间源文件变化，保留批注并升级到 v' + data.reviewVersion);
    }

    /**
     * 更新 data.rawMarkdown（Phase A 新增，供 Source Mode 回写真相源）
     *
     * 仅更新内存中的 rawMarkdown 字段，不触发 docVersion 升级、不自动落盘；
     * 落盘由调用方显式决定（Source Mode Ctrl+S → handleSaveMd / autosave timer）。
     *
     * @param {string} markdown 新的 markdown 源码
     */
    function setRawMarkdown(markdown) {
        if (typeof markdown !== 'string') return;
        data.rawMarkdown = markdown;
    }

    function setHasReviewRecord(value) {
        data.hasReviewRecord = !!value;
    }

    return {
        save, load, loadFromHost, reset, setFile,
        addAnnotation, removeAnnotation, updateAnnotation,
        getAnnotations, getAnnotationsForBlock, getData, clearAll,
        getFileHash, setFileHash, getDocVersion, setDocVersion,
        getSourceFilePath, getSourceDir, getRelPath,
        archiveCurrentRecord, getArchivedRecords, restoreFromReviewRecord,
        restoreFootnoteComments, reanchorAnnotations,
        forceBumpVersion,
        setRawMarkdown, setHasReviewRecord
    };
})();

// ===== ESM export (for webview bundler) =====
export { Store };
