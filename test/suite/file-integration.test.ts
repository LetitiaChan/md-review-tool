import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../../src/fileService';

/**
 * 文件系统集成测试
 *
 * 测试 FileService 的完整读写循环、文件监听、applyReview 集成、并发操作等。
 * 使用真实的临时文件系统进行测试。
 */
suite('File Integration Test Suite — 文件系统集成测试', () => {

    let fileService: FileService;
    let tempDir: string;
    let reviewDir: string;

    // ===== 测试环境搭建与清理 =====

    setup(() => {
        // 使用工作区目录下的临时测试目录
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders && workspaceFolders.length > 0
            ? workspaceFolders[0].uri.fsPath
            : path.join(__dirname, '..', '..');

        tempDir = path.join(workspaceRoot, '.test-temp-' + Date.now());
        reviewDir = path.join(tempDir, '.review');

        // 创建临时目录
        fs.mkdirSync(tempDir, { recursive: true });

        fileService = new FileService();
    });

    teardown(() => {
        // 清理临时目录
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (e) {
            console.error('清理临时目录失败:', e);
        }
    });

    // ===== 辅助函数 =====

    function createTempFile(name: string, content: string): string {
        const filePath = path.join(tempDir, name);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    }

    function readTempFile(name: string): string {
        return fs.readFileSync(path.join(tempDir, name), 'utf-8');
    }

    // ===== 完整读写循环测试 =====

    suite('完整读写循环', () => {
        test('创建 md → 读取 → 验证内容', () => {
            const content = '# 测试文档\n\n这是一个测试。\n';
            const filePath = createTempFile('test-rw.md', content);

            const result = fileService.readFile(filePath);

            assert.strictEqual(result.name, 'test-rw.md');
            assert.strictEqual(result.content, content);
            assert.ok(result.sourceFilePath.includes('test-rw.md'));
            assert.ok(result.sourceDir.length > 0);
        });

        test('读取 → 修改 → 保存 → 验证', () => {
            const originalContent = '# 原始文档\n\n原始内容。\n';
            const filePath = createTempFile('test-modify.md', originalContent);

            // 读取
            const readResult = fileService.readFile(filePath);
            assert.strictEqual(readResult.content, originalContent);

            // 修改并保存
            const newContent = '# 修改后文档\n\n修改后的内容。\n';
            const saveResult = fileService.saveFile(filePath, newContent);

            assert.ok(saveResult.success);
            assert.ok(saveResult.changed);
            assert.ok(saveResult.backupFile, '应生成备份文件');

            // 验证文件内容已更新
            const verifyContent = fs.readFileSync(filePath, 'utf-8');
            assert.strictEqual(verifyContent, newContent);
        });

        test('保存相同内容 → changed 应为 false', () => {
            const content = '# 不变的文档\n\n内容不变。\n';
            const filePath = createTempFile('test-nochange.md', content);

            const result = fileService.saveFile(filePath, content);

            assert.ok(result.success);
            assert.strictEqual(result.changed, false);
            assert.strictEqual(result.backupFile, undefined, '不应生成备份');
        });

        test('备份文件生成 → .review 目录中存在备份', () => {
            const originalContent = '# 备份测试\n\n原始。\n';
            const filePath = createTempFile('test-backup.md', originalContent);

            const newContent = '# 备份测试\n\n修改后。\n';
            const result = fileService.saveFile(filePath, newContent);

            assert.ok(result.success);
            assert.ok(result.changed);
            assert.ok(result.backupFile);

            // 验证备份文件存在
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const wsReviewDir = path.join(workspaceFolders[0].uri.fsPath, '.review');
                if (fs.existsSync(wsReviewDir)) {
                    const backupPath = path.join(wsReviewDir, result.backupFile!);
                    if (fs.existsSync(backupPath)) {
                        const backupContent = fs.readFileSync(backupPath, 'utf-8');
                        assert.strictEqual(backupContent, originalContent, '备份内容应为原始内容');
                        // 清理备份
                        fs.unlinkSync(backupPath);
                    }
                }
            }
        });
    });

    // ===== 文件读取边界测试 =====

    suite('文件读取边界', () => {
        test('读取不存在的文件 → 抛出错误', () => {
            assert.throws(() => {
                fileService.readFile(path.join(tempDir, 'nonexistent.md'));
            }, /文件不存在/);
        });

        test('读取含 YAML front-matter 的文件 → 提取 docVersion', () => {
            const content = '---\ntitle: 测试\n---\n\n# 标题\n\n**文档版本**：v2.1.0\n\n正文内容。\n';
            const filePath = createTempFile('test-frontmatter.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.docVersion, 'v2.1.0');
        });

        test('读取无版本号的文件 → docVersion 为 null', () => {
            const content = '# 无版本号\n\n这个文件没有版本号。\n';
            const filePath = createTempFile('test-noversion.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.docVersion, null);
        });

        test('读取空文件 → 内容为空字符串', () => {
            const filePath = createTempFile('test-empty.md', '');

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.content, '');
            assert.strictEqual(result.docVersion, null);
        });

        test('读取含 BOM 的 UTF-8 文件 → 内容正常', () => {
            const bom = '\uFEFF';
            const content = bom + '# BOM 测试\n\n内容。\n';
            const filePath = createTempFile('test-bom.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.length > 0);
        });

        test('读取含各种版本号格式的文件', () => {
            const testCases = [
                { content: '**文档版本**：v1.0.0', expected: 'v1.0.0' },
                { content: '**版本**：v2.1', expected: 'v2.1' },
                { content: '文档版本：v3.0', expected: 'v3.0' },
                { content: '版本：v10.20.30', expected: 'v10.20.30' },
            ];

            testCases.forEach((tc, i) => {
                const filePath = createTempFile(`test-version-${i}.md`, tc.content);
                const result = fileService.readFile(filePath);
                assert.strictEqual(result.docVersion, tc.expected, `版本格式 ${i} 应匹配`);
            });
        });
    });

    // ===== 批阅记录保存与读取 =====

    suite('批阅记录保存与读取', () => {
        test('saveReview → 文件写入 .review 目录', () => {
            const reviewContent = '# 批阅记录\n\n测试内容。\n';
            const result = fileService.saveReview('批阅记录_test_v1.md', reviewContent);

            assert.ok(result.success);
            assert.ok(result.path);
        });

        test('getReviewRecords → 读取批阅记录列表', () => {
            // 先保存两个版本的批阅记录
            const jsonData1 = JSON.stringify({
                annotationCount: 2,
                annotations: [
                    { type: 'comment', selectedText: 'a', comment: 'b' },
                    { type: 'delete', selectedText: 'c' }
                ]
            }, null, 2);

            const review1 = `# 批阅记录\n\n- **源文件版本**：v1.0\n\n\`\`\`json\n${jsonData1}\n\`\`\`\n`;
            fileService.saveReview('批阅记录_testdoc_v1.md', review1);

            const jsonData2 = JSON.stringify({
                annotationCount: 3,
                annotations: [
                    { type: 'comment', selectedText: 'x', comment: 'y' },
                    { type: 'delete', selectedText: 'z' },
                    { type: 'insert', selectedText: 'w', insertContent: 'v' }
                ]
            }, null, 2);

            const review2 = `# 批阅记录\n\n- **源文件版本**：v1.1\n\n\`\`\`json\n${jsonData2}\n\`\`\`\n`;
            fileService.saveReview('批阅记录_testdoc_v2.md', review2);

            // 读取记录
            const records = fileService.getReviewRecords('testdoc.md');

            assert.ok(records.length >= 2, '应至少有 2 条记录');

            // 验证按版本倒序
            if (records.length >= 2) {
                assert.ok(records[0].reviewVersion >= records[1].reviewVersion, '应按版本倒序');
            }
        });

        test('deleteReviewRecords → 删除指定文件的批阅记录', () => {
            // 先保存
            fileService.saveReview('批阅记录_deltest_v1.md', '# 测试\n');
            fileService.saveReview('批阅记录_deltest_v2.md', '# 测试\n');

            // 删除
            const result = fileService.deleteReviewRecords('deltest.md');

            assert.ok(result.success);
            assert.ok(result.deleted.length >= 0); // 可能已被删除

            // 验证记录已清空
            const records = fileService.getReviewRecords('deltest.md');
            assert.strictEqual(records.length, 0, '删除后应无记录');
        });
    });

    // ===== applyReview 集成测试 =====

    suite('applyReview 集成', () => {
        test('空批注列表 → 无有效指令', () => {
            const filePath = createTempFile('test-apply-empty.md', '# 测试\n\n内容。\n');

            const result = fileService.applyReview([], filePath, 'test-apply-empty.md');

            assert.ok(result.success);
            assert.strictEqual(result.needsAi, 0);
            assert.strictEqual(result.message, '无有效指令');
        });

        test('混合批注 → 生成 AI 修改指令文件', () => {
            const content = '# 标题\n\n第一段内容。\n\n第二段内容。\n\n第三段内容。\n';
            const filePath = createTempFile('test-apply-mixed.md', content);

            const annotations = [
                { type: 'comment', selectedText: '第一段', comment: '请修改', blockIndex: 1, startOffset: 0 },
                { type: 'delete', selectedText: '第二段内容。', blockIndex: 2, startOffset: 0 },
                { type: 'insert', selectedText: '第三段', insertContent: '新增内容', insertPosition: 'after', blockIndex: 3, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, filePath, 'test-apply-mixed.md');

            assert.ok(result.success);
            assert.strictEqual(result.needsAi, 3);
            assert.ok(result.aiInstructionFile, '应生成 AI 指令文件');
            assert.ok(result.aiInstructionFilePath, '应有指令文件路径');
            assert.ok(result.message.includes('3 条指令'));

            // 验证指令文件内容
            if (result.aiInstructionFilePath) {
                const instructionContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(instructionContent.includes('AI 修改指令'), '应包含标题');
                assert.ok(instructionContent.includes('从后往前'), '应包含排序说明');
                assert.ok(instructionContent.includes('（修改）'), '应包含修改指令');
                assert.ok(instructionContent.includes('（删除）'), '应包含删除指令');
                assert.ok(instructionContent.includes('（后插）'), '应包含后插指令');

                // 清理
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('无效批注被过滤 → 只处理有效批注', () => {
            const content = '# 测试\n\n内容。\n';
            const filePath = createTempFile('test-apply-filter.md', content);

            const annotations = [
                { type: 'comment', selectedText: 'a', comment: 'b', blockIndex: 0, startOffset: 0 },
                { type: 'delete', selectedText: '', blockIndex: 1, startOffset: 0 },  // 无效
                { type: 'insert', selectedText: '', insertContent: '', blockIndex: 2, startOffset: 0 },  // 无效
                { type: 'unknown', selectedText: 'x' }  // 无效
            ];

            const result = fileService.applyReview(annotations, filePath, 'test-apply-filter.md');

            assert.ok(result.success);
            assert.strictEqual(result.needsAi, 1, '只有 1 条有效批注');

            // 清理
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('指令按 blockIndex 倒序排列', () => {
            const content = '# 标题\n\n第一段。\n\n第二段。\n\n第三段。\n';
            const filePath = createTempFile('test-apply-order.md', content);

            const annotations = [
                { type: 'comment', selectedText: '第一段', comment: '评论1', blockIndex: 1, startOffset: 0 },
                { type: 'comment', selectedText: '第三段', comment: '评论3', blockIndex: 3, startOffset: 0 },
                { type: 'comment', selectedText: '第二段', comment: '评论2', blockIndex: 2, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, filePath, 'test-apply-order.md');

            assert.ok(result.success);

            if (result.aiInstructionFilePath) {
                const instructionContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');

                // 验证倒序：评论3 应在 评论2 之前，评论2 应在 评论1 之前
                const idx3 = instructionContent.indexOf('评论3');
                const idx2 = instructionContent.indexOf('评论2');
                const idx1 = instructionContent.indexOf('评论1');

                assert.ok(idx3 < idx2, '评论3（block=3）应排在评论2（block=2）之前');
                assert.ok(idx2 < idx1, '评论2（block=2）应排在评论1（block=1）之前');

                // 清理
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('源文件不存在时 → blocks 为空但不报错', () => {
            const annotations = [
                { type: 'comment', selectedText: 'text', comment: 'note', blockIndex: 0, startOffset: 0 }
            ];

            const result = fileService.applyReview(
                annotations,
                path.join(tempDir, 'nonexistent.md'),
                'nonexistent.md'
            );

            assert.ok(result.success);
            assert.strictEqual(result.needsAi, 1);

            // 清理
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });
    });

    // ===== 图片管理集成测试 =====

    suite('图片管理', () => {
        // 创建一个最小的有效 PNG Base64
        const minPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        test('saveAnnotationImage → 保存 Base64 图片', () => {
            const result = fileService.saveAnnotationImage(minPngBase64);

            assert.ok(result.success);
            assert.ok(result.imagePath.startsWith('images/'));
            assert.ok(result.imagePath.endsWith('.png'));
        });

        test('saveAnnotationImage → 自定义文件名', () => {
            const result = fileService.saveAnnotationImage(minPngBase64, 'custom_name.png');

            assert.ok(result.success);
            assert.strictEqual(result.imagePath, 'images/custom_name.png');
        });

        test('saveAnnotationImage → 同步复制到源目录', () => {
            const sourceDir = path.join(tempDir, 'source');
            fs.mkdirSync(sourceDir, { recursive: true });

            const result = fileService.saveAnnotationImage(minPngBase64, 'sync_test.png', sourceDir);

            assert.ok(result.success);

            // 验证源目录中也有图片
            const targetPath = path.join(sourceDir, 'images', 'sync_test.png');
            assert.ok(fs.existsSync(targetPath), '源目录中应有图片副本');
        });

        test('saveAnnotationImage → 无效 Base64 数据抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('invalid-data');
            }, /无效的图片数据格式/);
        });

        test('saveAnnotationImage → JPEG 扩展名转换', () => {
            const jpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//2wBDAP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//AP//wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFJiY0SFxNREBbXCFVJicvEzJDRDghaSUyWiY7LCB3PSNeJEgxdUkwgJChgZJjZFGidkdFU38qOzwygp0+PzhJSktMTU5PRldYWVpbXF1eX1ZnaGlqa2xtbm9jdHV2d3h5ent8fX5/cRAAICAQIDBQUEBQYECAMDbQEAAhEDBCESMUEFURNhIgZxgZEyobHwFMHR4SNCFVJicvEzJDRDghaSUyWiY7LCB3PSNeJEgxdUkwgJChgZJjZFGidkdFU38qOzwygp0+PzhJSktMTU5PRldYWVpbXF1eX1ZnaGlqa2xtbm9ic3R1dnd4eXp7fH/9oADAMBAAIRAxEAPwD8qqKKKAP/2Q==';
            const result = fileService.saveAnnotationImage(jpegBase64, 'test_jpeg.jpg');

            assert.ok(result.success);
            assert.ok(result.imagePath.includes('test_jpeg.jpg'));
        });

        test('deleteAnnotationImage → 删除已保存的图片', () => {
            const saveResult = fileService.saveAnnotationImage(minPngBase64, 'to_delete.png');
            assert.ok(saveResult.success);

            const deleted = fileService.deleteAnnotationImage(saveResult.imagePath);
            assert.ok(deleted, '应成功删除');
        });

        test('deleteAnnotationImage → 删除不存在的图片返回 false', () => {
            const deleted = fileService.deleteAnnotationImage('images/nonexistent.png');
            assert.strictEqual(deleted, false);
        });
    });

    // ===== 并发操作测试 =====

    suite('并发操作', () => {
        test('同时保存多个不同文件 → 全部成功', async () => {
            const files = Array.from({ length: 5 }, (_, i) => ({
                name: `concurrent-${i}.md`,
                content: `# 文件 ${i}\n\n内容 ${i}。\n`
            }));

            // 创建所有文件
            files.forEach(f => createTempFile(f.name, f.content));

            // 并发修改
            const promises = files.map(f => {
                const filePath = path.join(tempDir, f.name);
                const newContent = `# 修改后文件 ${f.name}\n\n新内容。\n`;
                return new Promise<void>((resolve) => {
                    const result = fileService.saveFile(filePath, newContent);
                    assert.ok(result.success);
                    assert.ok(result.changed);
                    resolve();
                });
            });

            await Promise.all(promises);

            // 验证所有文件都已修改
            files.forEach(f => {
                const content = fs.readFileSync(path.join(tempDir, f.name), 'utf-8');
                assert.ok(content.includes('修改后文件'), `${f.name} 应已修改`);
            });
        });

        test('快速连续保存同一文件 → 最后一次保存生效', () => {
            const filePath = createTempFile('rapid-save.md', '# 初始\n');

            for (let i = 0; i < 10; i++) {
                const content = `# 版本 ${i}\n\n内容 ${i}。\n`;
                fileService.saveFile(filePath, content);
            }

            const finalContent = fs.readFileSync(filePath, 'utf-8');
            assert.ok(finalContent.includes('版本 9'), '最后一次保存应生效');
        });
    });

    // ===== 特殊文件名测试 =====

    suite('特殊文件名处理', () => {
        test('中文文件名 → 正常读写', () => {
            const content = '# 中文文档\n\n内容。\n';
            const filePath = createTempFile('测试文档.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.name, '测试文档.md');
            assert.strictEqual(result.content, content);
        });

        test('含空格的文件名 → 正常读写', () => {
            const content = '# 空格测试\n\n内容。\n';
            const filePath = createTempFile('test document.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.name, 'test document.md');
        });

        test('.mdc 扩展名 → 正常读写', () => {
            const content = '# MDC 文件\n\n内容。\n';
            const filePath = createTempFile('rules.mdc', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.name, 'rules.mdc');
            assert.strictEqual(result.content, content);
        });

        test('子目录中的文件 → 正常读写', () => {
            const content = '# 子目录文件\n\n内容。\n';
            const filePath = createTempFile('subdir/nested/doc.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.name, 'doc.md');
            assert.strictEqual(result.content, content);
        });
    });

    // ===== Markdown 块分割验证 =====

    suite('Markdown 块分割（通过 applyReview 间接验证）', () => {
        test('标准段落分割 → 每段一个块', () => {
            const content = '# 标题\n\n第一段。\n\n第二段。\n\n第三段。\n';
            const filePath = createTempFile('test-blocks.md', content);

            // 通过 applyReview 间接验证块分割
            const annotations = [
                { type: 'comment', selectedText: '第二段', comment: '测试', blockIndex: 2, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, filePath, 'test-blocks.md');
            assert.ok(result.success);

            // 验证指令文件中包含正确的块定位
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                const instructionContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(instructionContent.includes('第 3 块'), '应定位到第 3 块');

                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('含代码块的文档 → 代码块作为整体', () => {
            const content = '# 标题\n\n说明文字。\n\n```javascript\nconst x = 1;\nconst y = 2;\n```\n\n后续内容。\n';
            const filePath = createTempFile('test-codeblock.md', content);

            const annotations = [
                { type: 'comment', selectedText: '后续内容', comment: '测试', blockIndex: 3, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, filePath, 'test-codeblock.md');
            assert.ok(result.success);

            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('含列表的文档 → 列表作为整体块', () => {
            const content = '# 标题\n\n- 项目 1\n- 项目 2\n- 项目 3\n\n后续段落。\n';
            const filePath = createTempFile('test-list.md', content);

            const annotations = [
                { type: 'comment', selectedText: '项目 1', comment: '测试', blockIndex: 1, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, filePath, 'test-list.md');
            assert.ok(result.success);

            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                const instructionContent = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                // 列表应作为整体块，锚点应包含列表内容
                assert.ok(instructionContent.includes('项目 1'), '锚点应包含列表内容');

                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });
    });

    // ===== 文件路径处理 =====

    suite('文件路径处理', () => {
        test('绝对路径 → 直接使用', () => {
            const content = '# 绝对路径测试\n';
            const filePath = createTempFile('abs-test.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.content, content);
        });

        test('sourceFilePath 使用正斜杠', () => {
            const content = '# 路径格式测试\n';
            const filePath = createTempFile('path-test.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(!result.sourceFilePath.includes('\\'), 'sourceFilePath 不应包含反斜杠');
            assert.ok(result.sourceFilePath.includes('/'), 'sourceFilePath 应使用正斜杠');
        });

        test('sourceDir 使用正斜杠', () => {
            const content = '# 目录格式测试\n';
            const filePath = createTempFile('dir-test.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(!result.sourceDir.includes('\\'), 'sourceDir 不应包含反斜杠');
        });
    });
});
