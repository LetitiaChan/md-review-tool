import * as assert from 'assert';

/**
 * Export 纯逻辑单元测试
 *
 * 模拟 Exporter.generateReviewDoc 的核心逻辑进行测试。
 * 测试覆盖：文档头生成、批注统计、指令排序、各类型指令格式、边界情况等。
 */
suite('Export Logic Test Suite — 导出文档纯逻辑', () => {

    // ===== 模拟 generateReviewDoc 核心逻辑 =====

    function generateReviewDoc(data: any, blocks: string[]): string {
        const lines: string[] = [];
        const docVersion = data.docVersion || '未知';

        lines.push(`# 批阅记录`);
        lines.push(``);
        lines.push(`- **源文件**：${data.fileName}`);
        if (data.sourceFilePath) {
            lines.push(`- **源文件路径**：${data.sourceFilePath}`);
        }
        lines.push(`- **源文件版本**：${docVersion}`);
        lines.push(`- **批阅版本**：v${data.reviewVersion || 1}`);
        lines.push(`- **批注数量**：${data.annotations.length} 条`);
        lines.push(`  - 评论：${data.annotations.filter((a: any) => a.type === 'comment').length} 条`);
        lines.push(`  - 删除：${data.annotations.filter((a: any) => a.type === 'delete').length} 条`);
        lines.push(`  - 后插：${data.annotations.filter((a: any) => a.type === 'insert' && a.insertPosition !== 'before').length} 条`);
        lines.push(`  - 前插：${data.annotations.filter((a: any) => a.type === 'insert' && a.insertPosition === 'before').length} 条`);
        lines.push(``);
        lines.push(`---`);
        lines.push(``);
        lines.push(`## 操作指令`);
        lines.push(``);

        // 按 blockIndex 倒序排列
        const sortedAnnotations = [...data.annotations].sort((a: any, b: any) => {
            if (a.blockIndex !== b.blockIndex) { return b.blockIndex - a.blockIndex; }
            return (b.startOffset || 0) - (a.startOffset || 0);
        });

        sortedAnnotations.forEach((ann: any, i: number) => {
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
                lines.push(`- **目标文本**：`);
                lines.push(`\`\`\``);
                lines.push(ann.selectedText);
                lines.push(`\`\`\``);
                lines.push(`- **评论内容**：${ann.comment}`);
                if (ann.images && ann.images.length > 0) {
                    lines.push(`- **附图**：共 ${ann.images.length} 张`);
                    ann.images.forEach((img: string, j: number) => {
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
        lines.push(`\`\`\`json`);
        lines.push(JSON.stringify({
            fileName: data.fileName,
            docVersion: data.docVersion || '未知',
            reviewVersion: data.reviewVersion || 1,
            annotationCount: data.annotations.length,
            annotations: data.annotations
        }, null, 2));
        lines.push(`\`\`\``);

        return lines.join('\n');
    }

    // ===== 文档头测试 =====

    suite('文档头生成', () => {
        test('应包含源文件名', () => {
            const data = {
                fileName: 'test-doc.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: []
            };
            const doc = generateReviewDoc(data, []);
            assert.ok(doc.includes('test-doc.md'), '应包含文件名');
        });

        test('应包含版本号', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v2.3.1',
                reviewVersion: 2,
                annotations: []
            };
            const doc = generateReviewDoc(data, []);
            assert.ok(doc.includes('v2.3.1'), '应包含文档版本');
            assert.ok(doc.includes('v2'), '应包含批阅版本');
        });

        test('应包含源文件路径（如果提供）', () => {
            const data = {
                fileName: 'test.md',
                sourceFilePath: '/workspace/docs/test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: []
            };
            const doc = generateReviewDoc(data, []);
            assert.ok(doc.includes('/workspace/docs/test.md'), '应包含源文件路径');
        });
    });

    // ===== 批注统计测试 =====

    suite('混合批注统计', () => {
        test('应正确统计各类型批注数量', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'comment', selectedText: 'a', comment: '1', blockIndex: 0, startOffset: 0 },
                    { type: 'comment', selectedText: 'b', comment: '2', blockIndex: 1, startOffset: 0 },
                    { type: 'delete', selectedText: 'c', blockIndex: 2, startOffset: 0 },
                    { type: 'insert', selectedText: 'd', insertContent: 'e', insertPosition: 'after', blockIndex: 3, startOffset: 0 },
                    { type: 'insert', selectedText: 'f', insertContent: 'g', insertPosition: 'before', blockIndex: 4, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['block0', 'block1', 'block2', 'block3', 'block4']);

            assert.ok(doc.includes('5 条'), '总数应为 5');
            assert.ok(doc.includes('评论：2 条'), '评论应为 2');
            assert.ok(doc.includes('删除：1 条'), '删除应为 1');
            assert.ok(doc.includes('后插：1 条'), '后插应为 1');
            assert.ok(doc.includes('前插：1 条'), '前插应为 1');
        });
    });

    // ===== 指令排序测试 =====

    suite('指令排序', () => {
        test('指令应按 blockIndex 倒序排列', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'comment', selectedText: 'first', comment: '第一块', blockIndex: 0, startOffset: 0 },
                    { type: 'comment', selectedText: 'second', comment: '第二块', blockIndex: 1, startOffset: 0 },
                    { type: 'comment', selectedText: 'third', comment: '第三块', blockIndex: 2, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['block0', 'block1', 'block2']);

            // 倒序：blockIndex=2 应在 blockIndex=0 之前
            const idxThird = doc.indexOf('第三块');
            const idxFirst = doc.indexOf('第一块');
            assert.ok(idxThird < idxFirst, 'blockIndex=2 的指令应排在 blockIndex=0 之前');
        });

        test('同一块内按 startOffset 倒序排列', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'comment', selectedText: 'early', comment: '偏移小', blockIndex: 0, startOffset: 5 },
                    { type: 'comment', selectedText: 'late', comment: '偏移大', blockIndex: 0, startOffset: 50 }
                ]
            };
            const doc = generateReviewDoc(data, ['这是一个很长的块内容']);

            const idxLate = doc.indexOf('偏移大');
            const idxEarly = doc.indexOf('偏移小');
            assert.ok(idxLate < idxEarly, 'startOffset 大的应排在前面');
        });
    });

    // ===== 各类型指令格式测试 =====

    suite('指令格式', () => {
        test('comment 指令格式 → 包含目标文本和评论', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'comment', selectedText: '目标文本内容', comment: '请修改此处', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['目标文本内容所在的块']);

            assert.ok(doc.includes('（修改）'), '应标注为修改');
            assert.ok(doc.includes('根据评论修改内容'), '应包含操作说明');
            assert.ok(doc.includes('目标文本内容'), '应包含目标文本');
            assert.ok(doc.includes('请修改此处'), '应包含评论内容');
        });

        test('delete 指令格式 → 包含要删除的文本', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'delete', selectedText: '要删除的段落', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['要删除的段落']);

            assert.ok(doc.includes('（删除）'), '应标注为删除');
            assert.ok(doc.includes('删除以下文本'), '应包含操作说明');
            assert.ok(doc.includes('要删除的段落'), '应包含要删除的文本');
        });

        test('insert(after) 指令格式 → 包含锚点和插入内容', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'insert', selectedText: '锚点文本', insertContent: '新插入的内容', insertPosition: 'after', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['锚点文本所在的块']);

            assert.ok(doc.includes('（后插）'), '应标注为后插');
            assert.ok(doc.includes('后插入新内容'), '应包含操作说明');
            assert.ok(doc.includes('锚点文本'), '应包含锚点');
            assert.ok(doc.includes('新插入的内容'), '应包含插入内容');
        });

        test('insert(before) 指令格式 → 标注"前插"', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'insert', selectedText: '锚点', insertContent: '前插内容', insertPosition: 'before', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['锚点所在的块']);

            assert.ok(doc.includes('（前插）'), '应标注为前插');
            assert.ok(doc.includes('前插入新内容'), '应包含操作说明');
        });

        test('insert 带 comment → 应包含插入说明', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'insert', selectedText: '锚点', insertContent: '内容', insertPosition: 'after', comment: '这是插入说明', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['锚点所在的块']);

            assert.ok(doc.includes('插入说明'), '应包含插入说明标签');
            assert.ok(doc.includes('这是插入说明'), '应包含说明内容');
        });
    });

    // ===== 边界情况测试 =====

    suite('边界情况', () => {
        test('无版本号 → 显示"未知"', () => {
            const data = {
                fileName: 'test.md',
                docVersion: '',
                reviewVersion: 1,
                annotations: []
            };
            const doc = generateReviewDoc(data, []);
            assert.ok(doc.includes('未知'), '无版本号时应显示"未知"');
        });

        test('空批注列表 → 只有文档头和 JSON', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: []
            };
            const doc = generateReviewDoc(data, []);

            assert.ok(doc.includes('# 批阅记录'), '应有标题');
            assert.ok(doc.includes('0 条'), '批注数量应为 0');
            assert.ok(!doc.includes('### 指令'), '不应有指令');
            assert.ok(doc.includes('"annotationCount": 0'), 'JSON 中批注数应为 0');
        });

        test('带图片的批注 → 图片路径包含在输出中', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    {
                        type: 'comment',
                        selectedText: '文本',
                        comment: '看图',
                        blockIndex: 0,
                        startOffset: 0,
                        images: ['images/img_001.png', 'images/img_002.jpg']
                    }
                ]
            };
            const doc = generateReviewDoc(data, ['文本所在的块']);

            assert.ok(doc.includes('共 2 张'), '应标注图片数量');
            assert.ok(doc.includes('images/img_001.png'), '应包含第一张图片路径');
            assert.ok(doc.includes('images/img_002.jpg'), '应包含第二张图片路径');
            assert.ok(doc.includes('![附图1]'), '应有图片 Markdown 语法');
            assert.ok(doc.includes('![附图2]'), '应有第二张图片');
        });

        test('文本锚点应截取前 80 字符', () => {
            const longBlock = 'A'.repeat(200);
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, [longBlock]);

            // 文本锚点应只有 80 个 A
            assert.ok(doc.includes('文本锚点'), '应有文本锚点');
            const expectedAnchor = 'A'.repeat(80);
            assert.ok(doc.includes(expectedAnchor), '锚点应包含 80 个 A');
            // 不应包含 81 个连续 A（在锚点行内）
            const anchorLine = doc.split('\n').find(l => l.includes('文本锚点'));
            assert.ok(anchorLine, '应有锚点行');
            assert.ok(!anchorLine!.includes('A'.repeat(81)), '锚点不应超过 80 字符');
        });

        test('块内容含换行 → 锚点中换行替换为空格', () => {
            const blockWithNewlines = '第一行\n第二行\n第三行';
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 1,
                annotations: [
                    { type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, [blockWithNewlines]);

            // 验证锚点行中换行已被替换为空格
            const anchorLine = doc.split('\n').find(l => l.includes('文本锚点'));
            assert.ok(anchorLine, '应有锚点行');
            assert.ok(anchorLine!.includes('第一行 第二行'), '换行应替换为空格');
            assert.ok(!anchorLine!.includes('第一行\n第二行'), '锚点行中不应有原始换行');
        });
    });

    // ===== JSON 原始数据测试 =====

    suite('JSON 原始数据', () => {
        test('JSON 应包含完整的批注数据', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0',
                reviewVersion: 2,
                annotations: [
                    { type: 'comment', selectedText: 'a', comment: 'b', blockIndex: 0, startOffset: 0 },
                    { type: 'delete', selectedText: 'c', blockIndex: 1, startOffset: 5 }
                ]
            };
            const doc = generateReviewDoc(data, ['block0', 'block1']);

            // 提取 JSON 部分
            const jsonMatch = doc.match(/```json\n([\s\S]*?)\n```/);
            assert.ok(jsonMatch, '应包含 JSON 代码块');

            const parsed = JSON.parse(jsonMatch![1]);
            assert.strictEqual(parsed.fileName, 'test.md');
            assert.strictEqual(parsed.docVersion, 'v1.0');
            assert.strictEqual(parsed.reviewVersion, 2);
            assert.strictEqual(parsed.annotationCount, 2);
            assert.strictEqual(parsed.annotations.length, 2);
        });
    });

    // ===== 文件名生成逻辑测试 =====

    suite('文件名生成', () => {
        test('默认命名 → {原文件名}_review 格式', () => {
            // 模拟文件名生成逻辑
            const fileName = 'design-doc.md';
            const baseName = fileName.replace(/\.(mdc|md)$/, '');
            const version = 1;
            const mdFileName = `批阅记录_${baseName}_v${version}.md`;

            assert.strictEqual(mdFileName, '批阅记录_design-doc_v1.md');
        });

        test('.mdc 文件名处理', () => {
            const fileName = 'rules.mdc';
            const baseName = fileName.replace(/\.(mdc|md)$/, '');
            const version = 2;
            const mdFileName = `批阅记录_${baseName}_v${version}.md`;

            assert.strictEqual(mdFileName, '批阅记录_rules_v2.md');
        });

        test('特殊字符文件名 → 安全处理', () => {
            const fileName = '设计文档 (v2.0).md';
            const baseName = fileName.replace(/\.(mdc|md)$/, '');
            const version = 1;
            const mdFileName = `批阅记录_${baseName}_v${version}.md`;

            assert.ok(mdFileName.includes('设计文档'), '应保留中文');
            assert.ok(mdFileName.includes('(v2.0)'), '应保留括号');
        });
    });
});
