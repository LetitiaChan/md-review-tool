import * as assert from 'assert';

/**
 * Store 纯逻辑单元测试
 *
 * 由于 Store 是 Webview 端的 IIFE 模块，依赖 `vscode.setState/getState` 和 `window`，
 * 这里通过模拟 Store 的核心数据操作逻辑来测试其行为正确性。
 * 测试覆盖：addAnnotation、removeAnnotation、updateAnnotation、clearAll、setFile、序列化等。
 */
suite('Store Logic Test Suite — 数据模型纯逻辑', () => {

    // ===== 模拟 Store 核心逻辑 =====

    /** 模拟 Store 的核心数据结构和操作 */
    function createMockStore() {
        let data = {
            fileName: '',
            rawMarkdown: '',
            fileHash: '',
            docVersion: '',
            sourceFilePath: '',
            sourceDir: '',
            annotations: [] as any[],
            nextId: 1,
            reviewVersion: 1,
            createdAt: ''
        };

        let saveCount = 0;

        function save() {
            saveCount++;
        }

        function reset() {
            data = {
                fileName: '',
                rawMarkdown: '',
                fileHash: '',
                docVersion: '',
                sourceFilePath: '',
                sourceDir: '',
                annotations: [],
                nextId: 1,
                reviewVersion: 1,
                createdAt: new Date().toISOString()
            };
            save();
        }

        function setFile(name: string, markdown: string, fileHash: string, docVersion: string, sourceFilePath: string, sourceDir: string) {
            const sameFile = data.fileName === name;
            const hashChanged = sameFile && data.fileHash && fileHash && data.fileHash !== fileHash;
            const contentChanged = sameFile && !fileHash && data.rawMarkdown && markdown
                && data.rawMarkdown.trim() !== markdown.trim();

            if (hashChanged || contentChanged) {
                data.rawMarkdown = markdown;
                data.fileHash = fileHash || '';
                data.docVersion = docVersion || '';
                data.sourceFilePath = sourceFilePath || data.sourceFilePath || '';
                data.sourceDir = sourceDir || data.sourceDir || '';
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
                data.annotations = [];
                data.nextId = 1;
                data.reviewVersion = 1;
                data.createdAt = new Date().toISOString();
            } else {
                data.rawMarkdown = markdown;
                if (fileHash) { data.fileHash = fileHash; }
                if (docVersion) { data.docVersion = docVersion; }
                if (sourceFilePath) { data.sourceFilePath = sourceFilePath; }
                if (sourceDir) { data.sourceDir = sourceDir; }
            }
            save();
        }

        function addAnnotation(annotation: any) {
            annotation.id = data.nextId++;
            annotation.timestamp = new Date().toISOString();
            data.annotations.push(annotation);
            data.annotations.sort((a: any, b: any) => {
                if (a.blockIndex !== b.blockIndex) { return a.blockIndex - b.blockIndex; }
                return a.startOffset - b.startOffset;
            });
            save();
            return annotation;
        }

        function removeAnnotation(id: number) {
            data.annotations = data.annotations.filter((a: any) => a.id !== id);
            data.annotations.forEach((a: any, i: number) => { a.id = i + 1; });
            data.nextId = data.annotations.length + 1;
            save();
        }

        function updateAnnotation(id: number, updates: any) {
            const idx = data.annotations.findIndex((a: any) => a.id === id);
            if (idx >= 0) {
                Object.assign(data.annotations[idx], updates);
                save();
            }
        }

        function getAnnotations() { return data.annotations; }
        function getAnnotationsForBlock(blockIndex: number) { return data.annotations.filter((a: any) => a.blockIndex === blockIndex); }
        function getData() { return data; }

        function clearAll() {
            data.annotations = [];
            data.nextId = 1;
            save();
        }

        function restoreFromReviewRecord(record: any, fileName: string, markdown: string, docVersion: string) {
            data.fileName = fileName;
            data.rawMarkdown = markdown;
            data.docVersion = docVersion || '';
            data.reviewVersion = record.reviewVersion || 1;
            data.createdAt = record.createdAt || new Date().toISOString();

            if (record.annotations && record.annotations.length > 0) {
                data.annotations = record.annotations;
                data.nextId = Math.max(...record.annotations.map((a: any) => a.id || 0)) + 1;
            } else {
                data.annotations = [];
                data.nextId = 1;
            }
            save();
        }

        return {
            save, reset, setFile,
            addAnnotation, removeAnnotation, updateAnnotation,
            getAnnotations, getAnnotationsForBlock, getData, clearAll,
            restoreFromReviewRecord,
            getSaveCount: () => saveCount
        };
    }

    // ===== addAnnotation 测试 =====

    suite('addAnnotation', () => {
        test('添加 comment 类型批注 → 验证字段完整性', () => {
            const store = createMockStore();
            const ann = store.addAnnotation({
                type: 'comment',
                selectedText: '目标文本',
                comment: '这是评论',
                blockIndex: 0,
                startOffset: 5
            });

            assert.strictEqual(ann.id, 1);
            assert.strictEqual(ann.type, 'comment');
            assert.strictEqual(ann.selectedText, '目标文本');
            assert.strictEqual(ann.comment, '这是评论');
            assert.strictEqual(ann.blockIndex, 0);
            assert.strictEqual(ann.startOffset, 5);
            assert.ok(ann.timestamp, '应有时间戳');
        });

        test('添加 delete 类型批注 → comment 字段为空', () => {
            const store = createMockStore();
            const ann = store.addAnnotation({
                type: 'delete',
                selectedText: '要删除的文本',
                blockIndex: 2,
                startOffset: 0
            });

            assert.strictEqual(ann.type, 'delete');
            assert.strictEqual(ann.comment, undefined);
        });

        test('添加 insert(after) 类型批注 → 验证 insertPosition', () => {
            const store = createMockStore();
            const ann = store.addAnnotation({
                type: 'insert',
                selectedText: '锚点文本',
                insertContent: '新内容',
                insertPosition: 'after',
                blockIndex: 1,
                startOffset: 10
            });

            assert.strictEqual(ann.type, 'insert');
            assert.strictEqual(ann.insertPosition, 'after');
            assert.strictEqual(ann.insertContent, '新内容');
        });

        test('添加 insert(before) 类型批注 → 验证 insertPosition', () => {
            const store = createMockStore();
            const ann = store.addAnnotation({
                type: 'insert',
                selectedText: '锚点文本',
                insertContent: '前插内容',
                insertPosition: 'before',
                blockIndex: 1,
                startOffset: 0
            });

            assert.strictEqual(ann.insertPosition, 'before');
        });

        test('添加后自动排序 → blockIndex 升序 → startOffset 升序', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'C', comment: '3', blockIndex: 2, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'A', comment: '1', blockIndex: 0, startOffset: 5 });
            store.addAnnotation({ type: 'comment', selectedText: 'B', comment: '2', blockIndex: 0, startOffset: 0 });

            const annotations = store.getAnnotations();
            assert.strictEqual(annotations.length, 3);
            // blockIndex=0, startOffset=0 应在最前
            assert.strictEqual(annotations[0].comment, '2');
            // blockIndex=0, startOffset=5 应在第二
            assert.strictEqual(annotations[1].comment, '1');
            // blockIndex=2 应在最后
            assert.strictEqual(annotations[2].comment, '3');
        });

        test('nextId 自增 → 验证连续性', () => {
            const store = createMockStore();
            const a1 = store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            const a2 = store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 });
            const a3 = store.addAnnotation({ type: 'comment', selectedText: 'c', comment: '3', blockIndex: 2, startOffset: 0 });

            assert.strictEqual(a1.id, 1);
            assert.strictEqual(a2.id, 2);
            assert.strictEqual(a3.id, 3);
            assert.strictEqual(store.getData().nextId, 4);
        });

        test('每次添加都应触发 save', () => {
            const store = createMockStore();
            const before = store.getSaveCount();
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });
            assert.strictEqual(store.getSaveCount(), before + 1);
        });
    });

    // ===== removeAnnotation 测试 =====

    suite('removeAnnotation', () => {
        test('删除中间批注 → 验证重新编号', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'c', comment: '3', blockIndex: 2, startOffset: 0 });

            // 删除 id=2（中间的）
            store.removeAnnotation(2);

            const annotations = store.getAnnotations();
            assert.strictEqual(annotations.length, 2);
            // 重新编号后 id 应为 1, 2
            assert.strictEqual(annotations[0].id, 1);
            assert.strictEqual(annotations[1].id, 2);
            // 内容应保持正确
            assert.strictEqual(annotations[0].comment, '1');
            assert.strictEqual(annotations[1].comment, '3');
        });

        test('删除最后一条 → nextId 重置', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });

            store.removeAnnotation(1);

            assert.strictEqual(store.getAnnotations().length, 0);
            assert.strictEqual(store.getData().nextId, 1);
        });

        test('删除不存在的 id → 无副作用', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });

            store.removeAnnotation(999);

            assert.strictEqual(store.getAnnotations().length, 1);
            assert.strictEqual(store.getAnnotations()[0].id, 1);
        });

        test('连续删除所有批注 → 状态正确', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 });

            store.removeAnnotation(1);
            store.removeAnnotation(1); // 重新编号后第二条变成 id=1

            assert.strictEqual(store.getAnnotations().length, 0);
            assert.strictEqual(store.getData().nextId, 1);
        });
    });

    // ===== updateAnnotation 测试 =====

    suite('updateAnnotation', () => {
        test('修改 comment → selectedText 不变', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: '原始文本', comment: '原始评论', blockIndex: 0, startOffset: 0 });

            store.updateAnnotation(1, { comment: '修改后的评论' });

            const ann = store.getAnnotations()[0];
            assert.strictEqual(ann.comment, '修改后的评论');
            assert.strictEqual(ann.selectedText, '原始文本');
        });

        test('修改 insertContent → 锚点不变', () => {
            const store = createMockStore();
            store.addAnnotation({
                type: 'insert', selectedText: '锚点', insertContent: '旧内容',
                insertPosition: 'after', blockIndex: 0, startOffset: 0
            });

            store.updateAnnotation(1, { insertContent: '新内容' });

            const ann = store.getAnnotations()[0];
            assert.strictEqual(ann.insertContent, '新内容');
            assert.strictEqual(ann.selectedText, '锚点');
            assert.strictEqual(ann.insertPosition, 'after');
        });

        test('添加/删除图片 → images 数组更新', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });

            // 添加图片
            store.updateAnnotation(1, { images: ['images/img1.png', 'images/img2.png'] });
            assert.deepStrictEqual(store.getAnnotations()[0].images, ['images/img1.png', 'images/img2.png']);

            // 删除一张图片
            store.updateAnnotation(1, { images: ['images/img1.png'] });
            assert.deepStrictEqual(store.getAnnotations()[0].images, ['images/img1.png']);

            // 清空图片
            store.updateAnnotation(1, { images: [] });
            assert.deepStrictEqual(store.getAnnotations()[0].images, []);
        });

        test('更新不存在的 id → 无副作用', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });

            const before = store.getSaveCount();
            store.updateAnnotation(999, { comment: '不应生效' });

            assert.strictEqual(store.getAnnotations()[0].comment, 'y');
            assert.strictEqual(store.getSaveCount(), before); // 不应触发 save
        });
    });

    // ===== clearAll 测试 =====

    suite('clearAll', () => {
        test('清空后 annotations 为空', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 });

            store.clearAll();

            assert.strictEqual(store.getAnnotations().length, 0);
        });

        test('清空后 nextId 重置为 1', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 });

            store.clearAll();

            assert.strictEqual(store.getData().nextId, 1);
        });

        test('清空后重新添加 → id 从 1 开始', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            store.clearAll();

            const ann = store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 0, startOffset: 0 });
            assert.strictEqual(ann.id, 1);
        });
    });

    // ===== setFile 测试 =====

    suite('setFile', () => {
        test('设置新文件 → 清空批注', () => {
            const store = createMockStore();
            store.setFile('old.md', '# Old', 'hash1', 'v1', '/path/old.md', '/path');
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });

            store.setFile('new.md', '# New', 'hash2', 'v2', '/path/new.md', '/path');

            assert.strictEqual(store.getData().fileName, 'new.md');
            assert.strictEqual(store.getAnnotations().length, 0);
            assert.strictEqual(store.getData().reviewVersion, 1);
        });

        test('同文件 hash 变更 → 清空批注并增加 reviewVersion', () => {
            const store = createMockStore();
            store.setFile('test.md', '# V1', 'hash1', 'v1', '/path/test.md', '/path');
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });

            store.setFile('test.md', '# V2', 'hash2', 'v2', '/path/test.md', '/path');

            assert.strictEqual(store.getAnnotations().length, 0);
            assert.strictEqual(store.getData().reviewVersion, 2);
        });

        test('同文件同 hash → 保留批注', () => {
            const store = createMockStore();
            store.setFile('test.md', '# Content', 'hash1', 'v1', '/path/test.md', '/path');
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });

            store.setFile('test.md', '# Content Updated', 'hash1', 'v1', '/path/test.md', '/path');

            assert.strictEqual(store.getAnnotations().length, 1);
            assert.strictEqual(store.getData().rawMarkdown, '# Content Updated');
        });

        test('同文件无 hash 但内容变更 → 清空批注', () => {
            const store = createMockStore();
            store.setFile('test.md', '# Original', '', 'v1', '/path/test.md', '/path');
            store.addAnnotation({ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 });

            store.setFile('test.md', '# Modified', '', 'v2', '/path/test.md', '/path');

            assert.strictEqual(store.getAnnotations().length, 0);
        });
    });

    // ===== getAnnotationsForBlock 测试 =====

    suite('getAnnotationsForBlock', () => {
        test('应返回指定 blockIndex 的批注', () => {
            const store = createMockStore();
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 });
            store.addAnnotation({ type: 'comment', selectedText: 'c', comment: '3', blockIndex: 0, startOffset: 10 });

            const block0 = store.getAnnotationsForBlock(0);
            assert.strictEqual(block0.length, 2);

            const block1 = store.getAnnotationsForBlock(1);
            assert.strictEqual(block1.length, 1);

            const block2 = store.getAnnotationsForBlock(2);
            assert.strictEqual(block2.length, 0);
        });
    });

    // ===== restoreFromReviewRecord 测试 =====

    suite('restoreFromReviewRecord', () => {
        test('从记录恢复 → 批注和版本正确', () => {
            const store = createMockStore();
            const record = {
                reviewVersion: 3,
                createdAt: '2024-01-01T00:00:00.000Z',
                annotations: [
                    { id: 1, type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0 },
                    { id: 2, type: 'delete', selectedText: 'b', blockIndex: 1 },
                    { id: 5, type: 'insert', selectedText: 'c', insertContent: 'd', blockIndex: 2 }
                ]
            };

            store.restoreFromReviewRecord(record, 'test.md', '# Content', 'v2.0');

            assert.strictEqual(store.getData().fileName, 'test.md');
            assert.strictEqual(store.getData().reviewVersion, 3);
            assert.strictEqual(store.getData().createdAt, '2024-01-01T00:00:00.000Z');
            assert.strictEqual(store.getAnnotations().length, 3);
            assert.strictEqual(store.getData().nextId, 6); // max(1,2,5) + 1
        });

        test('从空记录恢复 → 批注为空', () => {
            const store = createMockStore();
            const record = {
                reviewVersion: 1,
                annotations: []
            };

            store.restoreFromReviewRecord(record, 'test.md', '# Content', 'v1.0');

            assert.strictEqual(store.getAnnotations().length, 0);
            assert.strictEqual(store.getData().nextId, 1);
        });
    });

    // ===== 序列化/反序列化 测试 =====

    suite('序列化/反序列化', () => {
        test('getData → toJSON → 包含所有字段', () => {
            const store = createMockStore();
            store.setFile('test.md', '# Hello', 'abc123', 'v1.0', '/path/test.md', '/path');
            store.addAnnotation({
                type: 'comment', selectedText: '文本', comment: '评论',
                blockIndex: 0, startOffset: 0, images: ['images/img1.png']
            });

            const data = store.getData();
            const json = JSON.stringify(data);
            const parsed = JSON.parse(json);

            assert.strictEqual(parsed.fileName, 'test.md');
            assert.strictEqual(parsed.fileHash, 'abc123');
            assert.strictEqual(parsed.docVersion, 'v1.0');
            assert.strictEqual(parsed.annotations.length, 1);
            assert.strictEqual(parsed.annotations[0].type, 'comment');
            assert.strictEqual(parsed.annotations[0].images[0], 'images/img1.png');
            assert.strictEqual(parsed.nextId, 2);
            assert.strictEqual(parsed.reviewVersion, 1);
        });

        test('fromJSON → 恢复完整状态', () => {
            const store = createMockStore();
            const jsonData = {
                fileName: 'restored.md',
                rawMarkdown: '# Restored',
                fileHash: 'xyz789',
                docVersion: 'v2.0',
                sourceFilePath: '/path/restored.md',
                sourceDir: '/path',
                annotations: [
                    { id: 1, type: 'comment', selectedText: 'a', comment: 'b', blockIndex: 0, startOffset: 0 }
                ],
                nextId: 2,
                reviewVersion: 3,
                createdAt: '2024-06-01T00:00:00.000Z'
            };

            // 模拟从 JSON 恢复
            store.restoreFromReviewRecord(
                { reviewVersion: jsonData.reviewVersion, createdAt: jsonData.createdAt, annotations: jsonData.annotations },
                jsonData.fileName, jsonData.rawMarkdown, jsonData.docVersion
            );

            const data = store.getData();
            assert.strictEqual(data.fileName, 'restored.md');
            assert.strictEqual(data.reviewVersion, 3);
            assert.strictEqual(data.annotations.length, 1);
        });
    });

    // ===== 混合操作测试 =====

    suite('混合操作', () => {
        test('添加 → 删除 → 更新 → 清空 的完整流程', () => {
            const store = createMockStore();
            store.setFile('test.md', '# Test', '', '', '', '');

            // 添加 3 条批注
            store.addAnnotation({ type: 'comment', selectedText: 'a', comment: '评论1', blockIndex: 0, startOffset: 0 });
            store.addAnnotation({ type: 'delete', selectedText: 'b', blockIndex: 1, startOffset: 0 });
            store.addAnnotation({ type: 'insert', selectedText: 'c', insertContent: 'd', insertPosition: 'after', blockIndex: 2, startOffset: 0 });
            assert.strictEqual(store.getAnnotations().length, 3);

            // 删除第 2 条
            store.removeAnnotation(2);
            assert.strictEqual(store.getAnnotations().length, 2);
            // 重新编号
            assert.strictEqual(store.getAnnotations()[0].id, 1);
            assert.strictEqual(store.getAnnotations()[1].id, 2);

            // 更新第 1 条
            store.updateAnnotation(1, { comment: '修改后的评论' });
            assert.strictEqual(store.getAnnotations()[0].comment, '修改后的评论');

            // 清空
            store.clearAll();
            assert.strictEqual(store.getAnnotations().length, 0);
            assert.strictEqual(store.getData().nextId, 1);
        });

        test('大量批注操作 → 排序和编号正确', () => {
            const store = createMockStore();
            // 添加 20 条批注（乱序）
            for (let i = 19; i >= 0; i--) {
                store.addAnnotation({
                    type: 'comment',
                    selectedText: `文本${i}`,
                    comment: `评论${i}`,
                    blockIndex: i,
                    startOffset: 0
                });
            }

            const annotations = store.getAnnotations();
            assert.strictEqual(annotations.length, 20);

            // 验证排序：blockIndex 应升序
            for (let i = 0; i < annotations.length - 1; i++) {
                assert.ok(annotations[i].blockIndex <= annotations[i + 1].blockIndex,
                    `blockIndex 应升序: ${annotations[i].blockIndex} <= ${annotations[i + 1].blockIndex}`);
            }
        });
    });
});
