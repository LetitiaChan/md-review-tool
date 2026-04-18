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
        createdAt: ''
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
            Exporter.triggerAutoSave();
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
            createdAt: new Date().toISOString()
        };
        save();
    }

    function setFile(name, markdown, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash) {
        const sameFile = data.fileName === name;
        const hashChanged = sameFile && data.fileHash && fileHash && data.fileHash !== fileHash;
        const contentChanged = sameFile && !fileHash && data.rawMarkdown && markdown
            && data.rawMarkdown.trim() !== markdown.trim();

        if (hashChanged || contentChanged) {
            archiveCurrentRecord();
            data.rawMarkdown = markdown;
            data.fileHash = fileHash || '';
            data.docVersion = docVersion || '';
            data.sourceFilePath = sourceFilePath || data.sourceFilePath || '';
            data.sourceDir = sourceDir || data.sourceDir || '';
            data.relPath = relPath || data.relPath || '';
            data.pathHash = pathHash || data.pathHash || '';
            data.annotations = [];
            data.nextId = 1;
            data.reviewVersion = (data.reviewVersion || 1) + 1;
            data.createdAt = new Date().toISOString();
        } else if (data.fileName !== name) {
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

    return {
        save, load, loadFromHost, reset, setFile,
        addAnnotation, removeAnnotation, updateAnnotation,
        getAnnotations, getAnnotationsForBlock, getData, clearAll,
        getFileHash, setFileHash, getDocVersion, setDocVersion,
        getSourceFilePath, getSourceDir, getRelPath,
        archiveCurrentRecord, getArchivedRecords, restoreFromReviewRecord
    };
})();
