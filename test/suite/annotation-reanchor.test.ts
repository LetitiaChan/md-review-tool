import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

function loadStore(): any {
    const projectRoot = path.resolve(__dirname, '../../..');
    const source = fs.readFileSync(path.join(projectRoot, 'webview', 'js', 'store.js'), 'utf-8')
        .replace(/\r?\n\/\/[^\n]*\r?\n\s*export\s*\{[^}]+\}\s*;?\s*$/, '');
    const sandbox: any = {
        console,
        window: {},
        vscode: {
            setState: () => undefined,
            getState: () => undefined,
            postMessage: () => undefined,
        },
    };
    vm.runInNewContext(source + '\n;this.Store = Store;', sandbox);
    return sandbox.Store;
}

function loadExporter(): any {
    const projectRoot = path.resolve(__dirname, '../../..');
    const source = fs.readFileSync(path.join(projectRoot, 'webview', 'js', 'export.js'), 'utf-8')
        .replace(/\r?\n\/\/[^\n]*\r?\n\s*export\s*\{[^}]+\}\s*;?\s*$/, '');
    const sandbox: any = {
        console,
        t: (key: string) => key,
        document: {},
        vscode: { postMessage: () => undefined },
        setTimeout,
        clearTimeout,
    };
    vm.runInNewContext(source + '\n;this.Exporter = Exporter;', sandbox);
    return sandbox.Exporter;
}

suite('Annotation Reanchor Tests', () => {
    test('源文件内容变化时保留当前批注并升级批阅版本', () => {
        const store = loadStore();
        store.setFile('doc.md', '第一段\n\n目标文本', '', '1.0', '', '', '', '');
        store.addAnnotation({
            type: 'comment',
            selectedText: '目标文本',
            comment: '请修改',
            blockIndex: 1,
            startOffset: 0,
            endOffset: 4,
        });

        store.setFile('doc.md', '新增段落\n\n第一段\n\n目标文本', '', '1.0', '', '', '', '');

        assert.strictEqual(store.getData().reviewVersion, 2);
        assert.strictEqual(store.getAnnotations().length, 1, '内容变化不应清空批注');
    });

    test('重新定位因前置段落插入而移动的批注', () => {
        const store = loadStore();
        store.setFile('doc.md', '第一段\n\n目标文本', '', '1.0', '', '', '', '');
        store.addAnnotation({
            type: 'comment',
            selectedText: '目标文本',
            comment: '请修改',
            blockIndex: 1,
            startOffset: 0,
            endOffset: 4,
        });

        const result = store.reanchorAnnotations(['新增段落', '第一段', '目标文本']);
        const annotation = store.getAnnotations()[0];

        assert.deepStrictEqual({ resolved: result.resolved, unresolved: result.unresolved }, { resolved: 1, unresolved: 0 });
        assert.strictEqual(annotation.blockIndex, 2);
        assert.strictEqual(annotation.orphaned, false);
    });

    test('锚点文本已删除时保留批注并标记为未定位', () => {
        const store = loadStore();
        store.setFile('doc.md', '第一段\n\n目标文本', '', '1.0', '', '', '', '');
        store.addAnnotation({
            type: 'comment',
            selectedText: '目标文本',
            comment: '请修改',
            blockIndex: 1,
            startOffset: 0,
            endOffset: 4,
        });

        const result = store.reanchorAnnotations(['第一段', '完全不同的内容']);
        const annotation = store.getAnnotations()[0];

        assert.strictEqual(store.getAnnotations().length, 1);
        assert.deepStrictEqual({ resolved: result.resolved, unresolved: result.unresolved }, { resolved: 0, unresolved: 1 });
        assert.strictEqual(annotation.orphaned, true);
    });

    test('锚点出现多次且原位置不再匹配时不应猜测位置', () => {
        const store = loadStore();
        store.setFile('doc.md', '旧第一段\n\n旧第二段\n\n目标文本', '', '1.0', '', '', '', '');
        store.addAnnotation({
            type: 'comment',
            selectedText: '目标文本',
            comment: '请修改',
            blockIndex: 2,
            startOffset: 0,
            endOffset: 4,
        });

        const result = store.reanchorAnnotations(['目标文本', '中间内容', '已删除', '目标文本']);
        const annotation = store.getAnnotations()[0];

        assert.strictEqual(result.unresolved, 1);
        assert.strictEqual(annotation.orphaned, true, '多个候选位置不应按距离猜测');
        assert.strictEqual(annotation.blockIndex, 2, '未定位时保留原位置供人工判断');
    });

    test('同一块重复文本应按原偏移保留第二处锚点', () => {
        const store = loadStore();
        store.setFile('doc.md', '目标和目标', '', '1.0', '/docs/doc.md', '', 'docs/doc.md', 'doc-hash');
        store.addAnnotation({
            type: 'comment', selectedText: '目标', comment: '第二处',
            blockIndex: 0, startOffset: 3, endOffset: 5,
        });

        const result = store.reanchorAnnotations(['目标和目标，补充内容']);
        const annotation = store.getAnnotations()[0];

        assert.strictEqual(result.resolved, 1);
        assert.strictEqual(annotation.startOffset, 3);
        assert.strictEqual(annotation.orphaned, false);
    });

    test('跨块锚点前插块后应映射到真实起止块', () => {
        const store = loadStore();
        store.setFile('doc.md', '甲段\n\n乙段', '', '1.0', '/docs/doc.md', '', 'docs/doc.md', 'doc-hash');
        store.addAnnotation({
            type: 'comment', selectedText: '甲段 乙段', comment: '跨块',
            blockIndex: 0, endBlockIndex: 1, startOffset: 0, endOffset: 2,
        });

        const result = store.reanchorAnnotations(['前插', '甲段', '乙段']);
        const annotation = store.getAnnotations()[0];

        assert.strictEqual(result.resolved, 1);
        assert.strictEqual(annotation.blockIndex, 1);
        assert.strictEqual(annotation.endBlockIndex, 2);
        assert.strictEqual(annotation.startOffset, 0);
        assert.strictEqual(annotation.endOffset, 2);
    });

    test('不同路径下同名文件不应继承批注', () => {
        const store = loadStore();
        store.setFile('README.md', 'A 内容', 'hash-a', '1.0', '/a/README.md', '/a', 'a/README.md', 'path-a');
        store.addAnnotation({
            type: 'comment', selectedText: 'A 内容', comment: '仅属于 A',
            blockIndex: 0, startOffset: 0, endOffset: 4,
        });

        store.setFile('README.md', 'B 内容', 'hash-b', '1.0', '/b/README.md', '/b', 'b/README.md', 'path-b');

        assert.strictEqual(store.getAnnotations().length, 0);
        assert.strictEqual(store.getData().sourceFilePath, '/b/README.md');
        assert.strictEqual(store.getData().reviewVersion, 1);
    });

    test('导出未定位批注时不应生成旧块号和偏移', () => {
        const exporter = loadExporter();
        const doc = exporter.generateReviewDoc({
            fileName: 'doc.md', rawMarkdown: '新内容', reviewVersion: 2,
            annotations: [{
                id: 1, type: 'comment', selectedText: '旧文本', comment: '请修改',
                blockIndex: 9, startOffset: 17, orphaned: true,
            }]
        }, ['新内容']);

        assert.ok(doc.includes('定位状态'));
        assert.ok(doc.includes('未定位'));
        assert.ok(!doc.includes('第 10 块'));
        assert.ok(!doc.includes('startOffset=17'));
    });

    test('关闭期间源文件变化时从批阅记录恢复并重新定位批注', () => {
        const store = loadStore();
        const previousAnnotations = [{
            id: 1,
            type: 'comment',
            selectedText: '目标文本',
            comment: '请修改',
            blockIndex: 1,
            startOffset: 0,
            endOffset: 4,
        }];

        store.forceBumpVersion(3, '新增段落\n\n第一段\n\n目标文本', '1.1', previousAnnotations);
        const result = store.reanchorAnnotations(['新增段落', '第一段', '目标文本']);

        assert.strictEqual(store.getData().reviewVersion, 4);
        assert.strictEqual(store.getAnnotations().length, 1);
        assert.strictEqual(store.getAnnotations()[0].blockIndex, 2);
        assert.strictEqual(result.unresolved, 0);
    });

    test('应从源文件脚注恢复评论批注并按位置排序', () => {
        const store = loadStore();
        store.setFile('doc.md', '第一处\n\n第二处', 'hash-1', '1.0');

        const changed = store.restoreFootnoteComments([
            {
                type: 'comment', selectedText: '第二处', comment: '评论二',
                footnoteId: 'mdhr-2', blockIndex: 2, startOffset: 0, endOffset: 3,
            },
            {
                type: 'comment', selectedText: '第一处', comment: '评论一',
                footnoteId: 'mdhr-1', blockIndex: 0, startOffset: 0, endOffset: 3,
            },
        ]);

        assert.strictEqual(changed, true);
        const annotations = store.getAnnotations();
        assert.strictEqual(annotations.map((a: any) => a.footnoteId).join(','), 'mdhr-1,mdhr-2');
        assert.strictEqual(annotations.map((a: any) => a.id).sort().join(','), '1,2', 'id 应连续分配');
        assert.ok(annotations.every((a: any) => a.timestamp), '应补充时间戳');
    });

    test('重复恢复同一脚注评论时不应产生重复批注', () => {
        const store = loadStore();
        store.setFile('doc.md', '目标文本', 'hash-1', '1.0');
        const comments = [{
            type: 'comment', selectedText: '目标文本', comment: '评论',
            footnoteId: 'mdhr-1', blockIndex: 0, startOffset: 0, endOffset: 4,
        }];

        assert.strictEqual(store.restoreFootnoteComments(comments), true);
        assert.strictEqual(store.restoreFootnoteComments(comments), false, '第二次恢复应无变化');
        assert.strictEqual(store.getAnnotations().length, 1);
    });

    test('恢复脚注评论失败时不改变批注列表', () => {
        const store = loadStore();
        store.setFile('doc.md', '目标文本', 'hash-1', '1.0');

        assert.strictEqual(store.restoreFootnoteComments([]), false);
        assert.strictEqual(store.restoreFootnoteComments(null), false);
        assert.strictEqual(store.restoreFootnoteComments([{ selectedText: 'x' }]), false, '缺少 footnoteId 应跳过');
        assert.strictEqual(store.getAnnotations().length, 0);
    });
});
