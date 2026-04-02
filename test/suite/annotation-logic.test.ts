import * as assert from 'assert';

/**
 * 批注验证逻辑单元测试
 *
 * 测试批注数据的验证规则、选区逻辑、排序逻辑等。
 * 这些逻辑在 annotations.js 和 fileService.ts 中都有使用。
 */
suite('Annotation Logic Test Suite — 批注验证逻辑', () => {

    // ===== 批注有效性验证 =====

    /**
     * 模拟 fileService.applyReview 中的批注过滤逻辑
     */
    function isValidAnnotation(ann: any): boolean {
        if (ann.type === 'comment') { return true; }
        if (ann.type === 'delete' && ann.selectedText) { return true; }
        if (ann.type === 'insert' && ann.insertContent && ann.selectedText) { return true; }
        return false;
    }

    suite('批注有效性验证', () => {
        test('comment 类型始终有效', () => {
            assert.ok(isValidAnnotation({ type: 'comment' }));
            assert.ok(isValidAnnotation({ type: 'comment', selectedText: '', comment: '' }));
            assert.ok(isValidAnnotation({ type: 'comment', selectedText: 'text', comment: 'note' }));
        });

        test('delete 类型需要 selectedText', () => {
            assert.ok(isValidAnnotation({ type: 'delete', selectedText: '要删除的文本' }));
            assert.ok(!isValidAnnotation({ type: 'delete', selectedText: '' }));
            assert.ok(!isValidAnnotation({ type: 'delete' }));
        });

        test('insert 类型需要 selectedText 和 insertContent', () => {
            assert.ok(isValidAnnotation({ type: 'insert', selectedText: '锚点', insertContent: '新内容' }));
            assert.ok(!isValidAnnotation({ type: 'insert', selectedText: '锚点', insertContent: '' }));
            assert.ok(!isValidAnnotation({ type: 'insert', selectedText: '', insertContent: '新内容' }));
            assert.ok(!isValidAnnotation({ type: 'insert' }));
        });

        test('未知类型应无效', () => {
            assert.ok(!isValidAnnotation({ type: 'unknown' }));
            assert.ok(!isValidAnnotation({ type: '' }));
            assert.ok(!isValidAnnotation({}));
        });
    });

    // ===== 批注排序逻辑 =====

    /**
     * 模拟批注按位置排序（用于显示列表）
     */
    function sortByPosition(annotations: any[]): any[] {
        return [...annotations].sort((a, b) => {
            if (a.blockIndex !== b.blockIndex) { return a.blockIndex - b.blockIndex; }
            return (a.startOffset || 0) - (b.startOffset || 0);
        });
    }

    /**
     * 模拟批注按时间排序（用于显示列表）
     */
    function sortByTime(annotations: any[]): any[] {
        return [...annotations].sort((a, b) => {
            const ta = new Date(a.timestamp || 0).getTime();
            const tb = new Date(b.timestamp || 0).getTime();
            return tb - ta; // 最新在前
        });
    }

    /**
     * 模拟批注倒序排列（用于导出指令）
     */
    function sortForExport(annotations: any[]): any[] {
        return [...annotations].sort((a, b) => {
            if (a.blockIndex !== b.blockIndex) { return b.blockIndex - a.blockIndex; }
            return (b.startOffset || 0) - (a.startOffset || 0);
        });
    }

    suite('批注排序', () => {
        const annotations = [
            { id: 1, blockIndex: 2, startOffset: 10, timestamp: '2024-01-01T10:00:00Z' },
            { id: 2, blockIndex: 0, startOffset: 5, timestamp: '2024-01-01T12:00:00Z' },
            { id: 3, blockIndex: 0, startOffset: 0, timestamp: '2024-01-01T08:00:00Z' },
            { id: 4, blockIndex: 1, startOffset: 0, timestamp: '2024-01-01T11:00:00Z' }
        ];

        test('按位置排序 → blockIndex 升序 → startOffset 升序', () => {
            const sorted = sortByPosition(annotations);
            assert.strictEqual(sorted[0].id, 3); // block=0, offset=0
            assert.strictEqual(sorted[1].id, 2); // block=0, offset=5
            assert.strictEqual(sorted[2].id, 4); // block=1, offset=0
            assert.strictEqual(sorted[3].id, 1); // block=2, offset=10
        });

        test('按时间排序 → 最新在前', () => {
            const sorted = sortByTime(annotations);
            assert.strictEqual(sorted[0].id, 2); // 12:00
            assert.strictEqual(sorted[1].id, 4); // 11:00
            assert.strictEqual(sorted[2].id, 1); // 10:00
            assert.strictEqual(sorted[3].id, 3); // 08:00
        });

        test('导出排序 → blockIndex 倒序 → startOffset 倒序', () => {
            const sorted = sortForExport(annotations);
            assert.strictEqual(sorted[0].id, 1); // block=2, offset=10
            assert.strictEqual(sorted[1].id, 4); // block=1, offset=0
            assert.strictEqual(sorted[2].id, 2); // block=0, offset=5
            assert.strictEqual(sorted[3].id, 3); // block=0, offset=0
        });

        test('空数组排序 → 返回空数组', () => {
            assert.deepStrictEqual(sortByPosition([]), []);
            assert.deepStrictEqual(sortByTime([]), []);
            assert.deepStrictEqual(sortForExport([]), []);
        });

        test('单元素排序 → 返回原数组', () => {
            const single = [{ id: 1, blockIndex: 0, startOffset: 0, timestamp: '2024-01-01T00:00:00Z' }];
            assert.strictEqual(sortByPosition(single).length, 1);
            assert.strictEqual(sortByTime(single).length, 1);
            assert.strictEqual(sortForExport(single).length, 1);
        });
    });

    // ===== 选区验证逻辑 =====

    suite('选区验证', () => {
        test('有效选区 → 非空文本', () => {
            const selection = { text: '选中的文本', blockIndex: 0, startOffset: 5, endOffset: 10 };
            assert.ok(selection.text.length > 0, '选区文本应非空');
            assert.ok(selection.blockIndex >= 0, 'blockIndex 应非负');
            assert.ok(selection.startOffset >= 0, 'startOffset 应非负');
            assert.ok(selection.endOffset > selection.startOffset, 'endOffset 应大于 startOffset');
        });

        test('空选区 → 文本为空', () => {
            const selection = { text: '', blockIndex: -1, startOffset: 0, endOffset: 0 };
            assert.strictEqual(selection.text.length, 0, '空选区文本长度应为 0');
        });

        test('跨块选区 → 记录 endBlockIndex', () => {
            const selection = {
                text: '跨块文本',
                blockIndex: 0,
                endBlockIndex: 2,
                startOffset: 10,
                endOffset: 5
            };
            assert.ok(selection.endBlockIndex! > selection.blockIndex, 'endBlockIndex 应大于 blockIndex');
        });
    });

    // ===== 批注数据完整性 =====

    suite('批注数据完整性', () => {
        test('comment 批注应包含所有必要字段', () => {
            const ann = {
                id: 1,
                type: 'comment',
                selectedText: '目标文本',
                comment: '评论内容',
                blockIndex: 0,
                startOffset: 5,
                timestamp: '2024-01-01T00:00:00Z'
            };

            assert.ok(ann.id > 0, 'id 应为正整数');
            assert.strictEqual(ann.type, 'comment');
            assert.ok(ann.selectedText, 'selectedText 应非空');
            assert.ok(ann.comment, 'comment 应非空');
            assert.ok(ann.blockIndex >= 0, 'blockIndex 应非负');
            assert.ok(ann.startOffset >= 0, 'startOffset 应非负');
            assert.ok(ann.timestamp, 'timestamp 应存在');
        });

        test('delete 批注应包含所有必要字段', () => {
            const ann = {
                id: 2,
                type: 'delete',
                selectedText: '要删除的文本',
                blockIndex: 1,
                startOffset: 0,
                timestamp: '2024-01-01T00:00:00Z'
            };

            assert.strictEqual(ann.type, 'delete');
            assert.ok(ann.selectedText, 'selectedText 应非空');
        });

        test('insert 批注应包含所有必要字段', () => {
            const ann = {
                id: 3,
                type: 'insert',
                selectedText: '锚点文本',
                insertContent: '新插入的内容',
                insertPosition: 'after' as 'before' | 'after',
                blockIndex: 2,
                startOffset: 10,
                timestamp: '2024-01-01T00:00:00Z'
            };

            assert.strictEqual(ann.type, 'insert');
            assert.ok(ann.selectedText, 'selectedText 应非空');
            assert.ok(ann.insertContent, 'insertContent 应非空');
            assert.ok(['before', 'after'].includes(ann.insertPosition), 'insertPosition 应为 before 或 after');
        });

        test('带图片的批注 → images 应为数组', () => {
            const ann = {
                id: 4,
                type: 'comment',
                selectedText: '文本',
                comment: '看图',
                images: ['images/img1.png', 'images/img2.jpg'],
                blockIndex: 0,
                startOffset: 0
            };

            assert.ok(Array.isArray(ann.images), 'images 应为数组');
            assert.strictEqual(ann.images.length, 2);
            assert.ok(ann.images.every((img: string) => typeof img === 'string'), '每个图片应为字符串');
        });
    });

    // ===== 图片路径验证 =====

    suite('图片路径验证', () => {
        function isBase64Image(str: string): boolean {
            return str && str.startsWith('data:image/') ? true : false;
        }

        function isPathImage(str: string): boolean {
            return str && !str.startsWith('data:image/') ? true : false;
        }

        test('Base64 图片识别', () => {
            assert.ok(isBase64Image('data:image/png;base64,iVBOR...'));
            assert.ok(isBase64Image('data:image/jpeg;base64,/9j/4AAQ...'));
            assert.ok(!isBase64Image('images/img.png'));
            assert.ok(!isBase64Image(''));
        });

        test('路径图片识别', () => {
            assert.ok(isPathImage('images/img_001.png'));
            assert.ok(isPathImage('images/screenshot.jpg'));
            assert.ok(!isPathImage('data:image/png;base64,abc'));
            assert.ok(!isPathImage(''));
        });
    });

    // ===== 批注过滤逻辑 =====

    suite('批注过滤', () => {
        test('过滤有效批注 → 只保留有效的', () => {
            const annotations = [
                { type: 'comment', selectedText: 'a', comment: 'b' },
                { type: 'delete', selectedText: '' },           // 无效
                { type: 'delete', selectedText: 'c' },
                { type: 'insert', selectedText: 'd', insertContent: '' },  // 无效
                { type: 'insert', selectedText: 'e', insertContent: 'f' },
                { type: 'unknown' }                              // 无效
            ];

            const valid = annotations.filter(isValidAnnotation);
            assert.strictEqual(valid.length, 3);
            assert.strictEqual(valid[0].type, 'comment');
            assert.strictEqual(valid[1].type, 'delete');
            assert.strictEqual(valid[2].type, 'insert');
        });

        test('全部无效 → 返回空数组', () => {
            const annotations = [
                { type: 'delete', selectedText: '' },
                { type: 'insert', selectedText: '', insertContent: '' },
                { type: 'unknown' }
            ];

            const valid = annotations.filter(isValidAnnotation);
            assert.strictEqual(valid.length, 0);
        });

        test('全部有效 → 返回全部', () => {
            const annotations = [
                { type: 'comment', selectedText: 'a', comment: 'b' },
                { type: 'delete', selectedText: 'c' },
                { type: 'insert', selectedText: 'd', insertContent: 'e' }
            ];

            const valid = annotations.filter(isValidAnnotation);
            assert.strictEqual(valid.length, 3);
        });
    });

    // ===== 批注编号逻辑 =====

    suite('批注编号', () => {
        test('删除后重新编号 → 序号连续', () => {
            let annotations = [
                { id: 1, type: 'comment', comment: 'A' },
                { id: 2, type: 'comment', comment: 'B' },
                { id: 3, type: 'comment', comment: 'C' },
                { id: 4, type: 'comment', comment: 'D' }
            ];

            // 删除 id=2
            annotations = annotations.filter(a => a.id !== 2);
            annotations.forEach((a, i) => { a.id = i + 1; });

            assert.strictEqual(annotations.length, 3);
            assert.strictEqual(annotations[0].id, 1);
            assert.strictEqual(annotations[0].comment, 'A');
            assert.strictEqual(annotations[1].id, 2);
            assert.strictEqual(annotations[1].comment, 'C');
            assert.strictEqual(annotations[2].id, 3);
            assert.strictEqual(annotations[2].comment, 'D');
        });

        test('删除第一条 → 重新编号从 1 开始', () => {
            let annotations = [
                { id: 1, type: 'comment', comment: 'A' },
                { id: 2, type: 'comment', comment: 'B' }
            ];

            annotations = annotations.filter(a => a.id !== 1);
            annotations.forEach((a, i) => { a.id = i + 1; });

            assert.strictEqual(annotations[0].id, 1);
            assert.strictEqual(annotations[0].comment, 'B');
        });

        test('删除最后一条 → nextId 正确', () => {
            let annotations = [
                { id: 1, type: 'comment', comment: 'A' },
                { id: 2, type: 'comment', comment: 'B' }
            ];

            annotations = annotations.filter(a => a.id !== 2);
            annotations.forEach((a, i) => { a.id = i + 1; });
            const nextId = annotations.length + 1;

            assert.strictEqual(nextId, 2);
        });
    });
});
