import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../../src/fileService';

suite('FileService Test Suite', () => {
    let fileService: FileService;
    let testDir: string;
    let reviewDir: string;

    // 在测试前创建临时工作区目录
    suiteSetup(() => {
        testDir = path.join(__dirname, '..', '..', '..', '.test-workspace');
        reviewDir = path.join(testDir, '.review');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    setup(() => {
        fileService = new FileService();
    });

    // 测试后清理临时文件
    suiteTeardown(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // ===== readFile 测试 =====

    suite('readFile', () => {
        test('应该正确读取存在的 Markdown 文件', () => {
            const testFilePath = path.join(testDir, 'test-read.md');
            const content = '# 测试标题\n\n这是测试内容。';
            fs.writeFileSync(testFilePath, content, 'utf-8');

            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.name, 'test-read.md');
            assert.strictEqual(result.content, content);
            assert.strictEqual(result.sourceFilePath, testFilePath.replace(/\\/g, '/'));

            fs.unlinkSync(testFilePath);
        });

        test('读取不存在的文件应该抛出错误', () => {
            const fakePath = path.join(testDir, 'not-exist.md');
            assert.throws(() => {
                fileService.readFile(fakePath);
            }, /文件不存在/);
        });

        test('应该正确提取文档版本号', () => {
            const testFilePath = path.join(testDir, 'test-version.md');
            const content = '# 文档\n\n**文档版本**：v1.2.3\n\n正文内容';
            fs.writeFileSync(testFilePath, content, 'utf-8');

            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.docVersion, 'v1.2.3');

            fs.unlinkSync(testFilePath);
        });

        test('没有版本号的文件应返回 null', () => {
            const testFilePath = path.join(testDir, 'test-no-version.md');
            const content = '# 无版本号文档\n\n普通内容';
            fs.writeFileSync(testFilePath, content, 'utf-8');

            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.docVersion, null);

            fs.unlinkSync(testFilePath);
        });
    });

    // ===== saveFile 测试 =====

    suite('saveFile', () => {
        test('保存相同内容应返回 changed: false', () => {
            const testFilePath = path.join(testDir, 'test-save-same.md');
            const content = '# 不变的内容';
            fs.writeFileSync(testFilePath, content, 'utf-8');

            const result = fileService.saveFile(testFilePath, content);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, false);

            fs.unlinkSync(testFilePath);
        });

        test('保存不同内容应创建备份并返回 changed: true', () => {
            const testFilePath = path.join(testDir, 'test-save-diff.md');
            const oldContent = '# 旧内容';
            const newContent = '# 新内容';
            fs.writeFileSync(testFilePath, oldContent, 'utf-8');

            const result = fileService.saveFile(testFilePath, newContent);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, true);
            assert.ok(result.backupFile, '应该生成备份文件名');

            // 验证文件内容已更新
            const savedContent = fs.readFileSync(testFilePath, 'utf-8');
            assert.strictEqual(savedContent, newContent);

            fs.unlinkSync(testFilePath);
        });

        test('保存不存在的文件应抛出错误', () => {
            const fakePath = path.join(testDir, 'not-exist-save.md');
            assert.throws(() => {
                fileService.saveFile(fakePath, '内容');
            }, /文件不存在/);
        });
    });

    // ===== saveReview 测试 =====

    suite('saveReview', () => {
        test('应该成功保存批阅记录', () => {
            const reviewContent = '# 批阅记录\n\n这是批阅内容';
            const result = fileService.saveReview('批阅记录_test_v1.md', reviewContent);
            assert.strictEqual(result.success, true);
            assert.ok(result.path, '应该返回保存路径');
        });
    });

    // ===== applyReview 测试 =====

    suite('applyReview', () => {
        test('空批注数组应返回无有效指令', () => {
            const result = fileService.applyReview([], '', 'test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 0);
            assert.strictEqual(result.message, '无有效指令');
        });

        test('无效批注（缺少必要字段）应被过滤', () => {
            const annotations = [
                { type: 'delete', selectedText: '' },  // 空 selectedText，无效
                { type: 'insert', insertContent: '', selectedText: 'abc' },  // 空 insertContent，无效
            ];
            const result = fileService.applyReview(annotations, '', 'test.md');
            assert.strictEqual(result.needsAi, 0);
        });

        test('有效的 comment 批注应生成 AI 指令文件', () => {
            const testFilePath = path.join(testDir, 'test-apply.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n段落内容', 'utf-8');

            const annotations = [
                {
                    type: 'comment',
                    selectedText: '段落内容',
                    comment: '请修改为更详细的描述',
                    blockIndex: 1,
                    startOffset: 0
                }
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-apply.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);
            assert.ok(result.aiInstructionFile, '应该生成 AI 指令文件名');
            assert.ok(result.aiInstructionFilePath, '应该返回 AI 指令文件路径');

            // 验证 AI 指令文件内容
            if (result.aiInstructionFilePath) {
                const aiContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(aiContent.includes('AI 修改指令'), '应包含标题');
                assert.ok(aiContent.includes('段落内容'), '应包含目标文本');
                assert.ok(aiContent.includes('请修改为更详细的描述'), '应包含评论内容');
            }

            fs.unlinkSync(testFilePath);
        });

        test('有效的 delete 批注应生成删除指令', () => {
            const testFilePath = path.join(testDir, 'test-delete.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n要删除的段落', 'utf-8');

            const annotations = [
                {
                    type: 'delete',
                    selectedText: '要删除的段落',
                    blockIndex: 1,
                    startOffset: 0
                }
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-delete.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            if (result.aiInstructionFilePath) {
                const aiContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(aiContent.includes('删除'), '应包含删除操作说明');
                assert.ok(aiContent.includes('要删除的段落'), '应包含要删除的文本');
            }

            fs.unlinkSync(testFilePath);
        });

        test('有效的 insert 批注应生成插入指令', () => {
            const testFilePath = path.join(testDir, 'test-insert.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n锚点文本', 'utf-8');

            const annotations = [
                {
                    type: 'insert',
                    selectedText: '锚点文本',
                    insertContent: '新插入的内容',
                    insertPosition: 'after',
                    blockIndex: 1,
                    startOffset: 0
                }
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-insert.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            if (result.aiInstructionFilePath) {
                const aiContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(aiContent.includes('插入'), '应包含插入操作说明');
                assert.ok(aiContent.includes('新插入的内容'), '应包含要插入的内容');
            }

            fs.unlinkSync(testFilePath);
        });

        test('多条批注应按 blockIndex 倒序排列', () => {
            const testFilePath = path.join(testDir, 'test-multi.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n段落1\n\n段落2\n\n段落3', 'utf-8');

            const annotations = [
                { type: 'comment', selectedText: '段落1', comment: '修改1', blockIndex: 1, startOffset: 0 },
                { type: 'comment', selectedText: '段落3', comment: '修改3', blockIndex: 3, startOffset: 0 },
                { type: 'comment', selectedText: '段落2', comment: '修改2', blockIndex: 2, startOffset: 0 },
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-multi.md');
            assert.strictEqual(result.needsAi, 3);

            if (result.aiInstructionFilePath) {
                const aiContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                // 倒序：指令1 应对应 blockIndex=3，指令2 对应 blockIndex=2，指令3 对应 blockIndex=1
                const idx3 = aiContent.indexOf('修改3');
                const idx2 = aiContent.indexOf('修改2');
                const idx1 = aiContent.indexOf('修改1');
                assert.ok(idx3 < idx2, '修改3 应在修改2 之前（倒序）');
                assert.ok(idx2 < idx1, '修改2 应在修改1 之前（倒序）');
            }

            fs.unlinkSync(testFilePath);
        });
    });

    // ===== saveAnnotationImage 测试 =====

    suite('saveAnnotationImage', () => {
        test('应该成功保存 Base64 图片', () => {
            // 最小的 1x1 PNG 的 Base64
            const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const result = fileService.saveAnnotationImage(base64Png);
            assert.strictEqual(result.success, true);
            assert.ok(result.imagePath.startsWith('images/'), '路径应以 images/ 开头');
            assert.ok(result.imagePath.endsWith('.png'), '应为 png 扩展名');
        });

        test('无效的图片数据应抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('invalid-data');
            }, /无效的图片数据格式/);
        });

        test('JPEG 图片扩展名应为 .jpg', () => {
            const base64Jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=';
            const result = fileService.saveAnnotationImage(base64Jpeg);
            assert.ok(result.imagePath.endsWith('.jpg'), '应为 jpg 扩展名');
        });
    });

    // ===== deleteAnnotationImage 测试 =====

    suite('deleteAnnotationImage', () => {
        test('删除不存在的图片应返回 false', () => {
            const result = fileService.deleteAnnotationImage('images/not-exist.png');
            assert.strictEqual(result, false);
        });
    });

    // ===== deleteReviewRecords 测试 =====

    suite('deleteReviewRecords', () => {
        test('无 .review 目录时应返回空删除列表', () => {
            const result = fileService.deleteReviewRecords('nonexistent.md');
            assert.strictEqual(result.success, true);
            assert.ok(Array.isArray(result.deleted));
        });
    });

    // ===== getReviewRecords 测试 =====

    suite('getReviewRecords', () => {
        test('无 .review 目录时应返回空数组', () => {
            const records = fileService.getReviewRecords('nonexistent.md');
            assert.ok(Array.isArray(records));
        });
    });

    // ===== 边界用例补充 =====

    suite('readFile 边界用例', () => {
        test('读取含 YAML front-matter 的文件应正确提取版本号', () => {
            const testFilePath = path.join(testDir, 'test-frontmatter.md');
            const content = '---\ntitle: 测试\nversion: v1.0.0\n---\n\n# 标题\n\n**文档版本**：v2.5.0\n\n正文内容';
            fs.writeFileSync(testFilePath, content, 'utf-8');

            const result = fileService.readFile(testFilePath);
            // 应从正文中提取版本号
            assert.strictEqual(result.docVersion, 'v2.5.0');

            fs.unlinkSync(testFilePath);
        });

        test('读取 UTF-8 BOM 编码文件应正常', () => {
            const testFilePath = path.join(testDir, 'test-bom.md');
            const bom = '\uFEFF';
            const content = bom + '# BOM 测试\n\n内容';
            fs.writeFileSync(testFilePath, content, 'utf-8');

            const result = fileService.readFile(testFilePath);
            assert.ok(result.content.includes('BOM 测试'), '应能读取 BOM 文件内容');

            fs.unlinkSync(testFilePath);
        });

        test('读取空文件应返回空内容', () => {
            const testFilePath = path.join(testDir, 'test-empty.md');
            fs.writeFileSync(testFilePath, '', 'utf-8');

            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.content, '');
            assert.strictEqual(result.docVersion, null);

            fs.unlinkSync(testFilePath);
        });

        test('读取只有标题的文件', () => {
            const testFilePath = path.join(testDir, 'test-title-only.md');
            fs.writeFileSync(testFilePath, '# 仅标题', 'utf-8');

            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.content, '# 仅标题');
            assert.strictEqual(result.docVersion, null);

            fs.unlinkSync(testFilePath);
        });

        test('各种版本号格式应正确提取', () => {
            const testCases = [
                { content: '**文档版本**：v1.0.0', expected: 'v1.0.0' },
                { content: '**文档版本**：V2.1', expected: 'V2.1' },
                { content: '**版本**：v3.0', expected: 'v3.0' },
                { content: '文档版本：v4.0.0', expected: 'v4.0.0' },
                { content: '版本：v5.1.2', expected: 'v5.1.2' },
            ];

            testCases.forEach(({ content, expected }, i) => {
                const testFilePath = path.join(testDir, `test-version-${i}.md`);
                fs.writeFileSync(testFilePath, `# 文档\n\n${content}\n\n正文`, 'utf-8');

                const result = fileService.readFile(testFilePath);
                assert.strictEqual(result.docVersion, expected, `版本号 "${expected}" 应被正确提取`);

                fs.unlinkSync(testFilePath);
            });
        });
    });

    suite('saveFile 边界用例', () => {
        test('保存含特殊字符的内容应正常', () => {
            const testFilePath = path.join(testDir, 'test-special-chars.md');
            const originalContent = '# 原始';
            fs.writeFileSync(testFilePath, originalContent, 'utf-8');

            const specialContent = '# 特殊字符\n\n包含 `代码` **加粗** *斜体*\n\n> 引用\n\n$$E=mc^2$$\n\n```\n<html>&amp;</html>\n```';
            const result = fileService.saveFile(testFilePath, specialContent);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, true);

            const saved = fs.readFileSync(testFilePath, 'utf-8');
            assert.strictEqual(saved, specialContent);

            fs.unlinkSync(testFilePath);
        });

        test('保存超长内容应正常', () => {
            const testFilePath = path.join(testDir, 'test-long-content.md');
            fs.writeFileSync(testFilePath, '# 原始', 'utf-8');

            // 生成约 100KB 的内容
            const longContent = '# 大文档\n\n' + '这是一段很长的文本。'.repeat(5000);
            const result = fileService.saveFile(testFilePath, longContent);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, true);

            const saved = fs.readFileSync(testFilePath, 'utf-8');
            assert.strictEqual(saved.length, longContent.length);

            fs.unlinkSync(testFilePath);
        });
    });

    suite('applyReview 边界用例', () => {
        test('空批注列表应返回无有效指令', () => {
            const result = fileService.applyReview([], '', 'test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 0);
            assert.strictEqual(result.message, '无有效指令');
        });

        test('批注目标文本不存在于源文件 → 仍应生成指令', () => {
            const testFilePath = path.join(testDir, 'test-missing-text.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n实际内容', 'utf-8');

            const annotations = [
                {
                    type: 'comment',
                    selectedText: '不存在的文本',
                    comment: '这段文本在源文件中不存在',
                    blockIndex: 99,
                    startOffset: 0
                }
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-missing-text.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1, '即使目标文本不存在也应生成指令');

            fs.unlinkSync(testFilePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('多个批注指向同一位置 → 全部生成指令', () => {
            const testFilePath = path.join(testDir, 'test-same-pos.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n重复目标文本', 'utf-8');

            const annotations = [
                { type: 'comment', selectedText: '重复目标文本', comment: '评论1', blockIndex: 1, startOffset: 0 },
                { type: 'comment', selectedText: '重复目标文本', comment: '评论2', blockIndex: 1, startOffset: 0 },
                { type: 'delete', selectedText: '重复目标文本', blockIndex: 1, startOffset: 0 }
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-same-pos.md');
            assert.strictEqual(result.needsAi, 3, '同一位置的多个批注都应生成指令');

            fs.unlinkSync(testFilePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('insert(before) 批注应正确标注前插', () => {
            const testFilePath = path.join(testDir, 'test-before-insert.md');
            fs.writeFileSync(testFilePath, '# 标题\n\n锚点文本', 'utf-8');

            const annotations = [
                {
                    type: 'insert',
                    selectedText: '锚点文本',
                    insertContent: '前插内容',
                    insertPosition: 'before',
                    blockIndex: 1,
                    startOffset: 0
                }
            ];
            const result = fileService.applyReview(annotations, testFilePath, 'test-before-insert.md');
            assert.strictEqual(result.success, true);

            if (result.aiInstructionFilePath) {
                const content = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(content.includes('前'), '应标注为前插');
                assert.ok(content.includes('前插内容'), '应包含前插内容');
            }

            fs.unlinkSync(testFilePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });
    });

    suite('saveAnnotationImage 边界用例', () => {
        test('空字符串应抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('');
            });
        });

        test('非 Base64 格式但以 data: 开头应抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('data:text/plain;base64,SGVsbG8=');
            });
        });

        test('GIF 图片应正确处理', () => {
            // 最小 1x1 GIF
            const base64Gif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            const result = fileService.saveAnnotationImage(base64Gif);
            assert.strictEqual(result.success, true);
            assert.ok(result.imagePath.endsWith('.gif'), '应为 gif 扩展名');
        });
    });
});
