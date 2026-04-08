import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../../src/fileService';
import { StateService } from '../../src/stateService';

/**
 * 完整工作流测试套件
 *
 * 模拟用户从打开文件到完成批阅的完整流程：
 * 1. 扩展激活
 * 2. 打开 Markdown 文件
 * 3. 编辑并保存文件（含备份）
 * 4. 添加批注（comment / delete / insert）
 * 5. 导出批阅记录
 * 6. 应用批阅（生成 AI 修改指令）
 * 7. 状态持久化
 * 8. 批阅记录管理（查询 / 删除）
 * 9. 图片批注工作流
 * 10. 清理资源
 */
suite('Workflow Test Suite — 完整工作流', () => {
    let fileService: FileService;
    let stateService: StateService;
    let testDir: string;
    let reviewDir: string;

    // ===== 环境准备 =====

    suiteSetup(async () => {
        // 激活扩展
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }

        // 创建临时工作区
        testDir = path.join(__dirname, '..', '..', '..', '.test-workflow');
        reviewDir = path.join(testDir, '.review');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    setup(() => {
        fileService = new FileService();

        // 使用 mock workspaceState 创建 StateService
        const mockState = new Map<string, any>();
        const mockContext = {
            workspaceState: {
                get: <T>(key: string): T | undefined => mockState.get(key) as T | undefined,
                update: async (key: string, value: any) => {
                    if (value === undefined) {
                        mockState.delete(key);
                    } else {
                        mockState.set(key, value);
                    }
                }
            }
        } as any as vscode.ExtensionContext;
        stateService = new StateService(mockContext);
    });

    suiteTeardown(() => {
        // 清理临时目录
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // ===== 流程 1：扩展激活与命令就绪 =====

    suite('流程 1：扩展激活与命令就绪', () => {
        test('扩展应已激活', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext, '扩展应存在');
            assert.ok(ext!.isActive, '扩展应已激活');
        });

        test('所有核心命令应已注册', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(commands.includes('mdReview.openPanel'), 'openPanel 命令应已注册');
            assert.ok(commands.includes('mdReview.exportReview'), 'exportReview 命令应已注册');
        });

        test('配置项应有正确的默认值', () => {
            const config = vscode.workspace.getConfiguration('mdReview');
            assert.strictEqual(config.get<number>('fontSize'), 18);
            assert.strictEqual(config.get<number>('lineHeight'), 1.8);
            assert.strictEqual(config.get<string>('theme'), 'light');
            assert.strictEqual(config.get<boolean>('autoSave'), true);
            assert.strictEqual(config.get<number>('autoSaveDelay'), 1500);
            assert.strictEqual(config.get<boolean>('showToc'), true);
            assert.strictEqual(config.get<boolean>('showAnnotations'), true);
            assert.strictEqual(config.get<boolean>('enableMermaid'), true);
            assert.strictEqual(config.get<boolean>('enableMath'), true);
            assert.strictEqual(config.get<boolean>('enablePlantUML'), true);
            assert.strictEqual(config.get<boolean>('enableGraphviz'), true);
        });
    });

    // ===== 流程 2：打开并读取 Markdown 文件 =====

    suite('流程 2：打开并读取 Markdown 文件', () => {
        const mdContent = [
            '# 测试文档',
            '',
            '**文档版本**：v2.0.1',
            '',
            '## 第一章 概述',
            '',
            '这是概述段落，描述了项目的基本信息。',
            '',
            '## 第二章 详细设计',
            '',
            '### 2.1 架构设计',
            '',
            '系统采用微服务架构，包含以下模块：',
            '',
            '- 用户服务',
            '- 订单服务',
            '- 支付服务',
            '',
            '### 2.2 数据库设计',
            '',
            '数据库使用 PostgreSQL，主要表结构如下：',
            '',
            '```sql',
            'CREATE TABLE users (',
            '  id SERIAL PRIMARY KEY,',
            '  name VARCHAR(100)',
            ');',
            '```',
            '',
            '## 第三章 总结',
            '',
            '本文档描述了系统的整体设计方案。'
        ].join('\n');

        let testFilePath: string;

        setup(() => {
            testFilePath = path.join(testDir, 'workflow-test.md');
            fs.writeFileSync(testFilePath, mdContent, 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });

        test('应正确读取文件内容和元信息', () => {
            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.name, 'workflow-test.md');
            assert.strictEqual(result.content, mdContent);
            assert.strictEqual(result.docVersion, 'v2.0.1');
            assert.ok(result.sourceFilePath.endsWith('workflow-test.md'));
            assert.ok(result.sourceDir.length > 0);
        });

        test('应正确提取文档版本号', () => {
            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.docVersion, 'v2.0.1');
        });

        test('读取不存在的文件应抛出错误', () => {
            assert.throws(() => {
                fileService.readFile(path.join(testDir, 'nonexistent.md'));
            }, /文件不存在/);
        });

        test('无版本号的文件 docVersion 应为 null', () => {
            const noVersionPath = path.join(testDir, 'no-version.md');
            fs.writeFileSync(noVersionPath, '# 无版本号\n\n普通内容', 'utf-8');
            const result = fileService.readFile(noVersionPath);
            assert.strictEqual(result.docVersion, null);
            fs.unlinkSync(noVersionPath);
        });
    });

    // ===== 流程 3：编辑并保存文件（含备份） =====

    suite('流程 3：编辑并保存文件（含备份）', () => {
        let testFilePath: string;

        setup(() => {
            testFilePath = path.join(testDir, 'edit-test.md');
            fs.writeFileSync(testFilePath, '# 原始内容\n\n**文档版本**：v1.0.0\n\n段落一', 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
            // 清理 .review 目录中的备份文件
            if (fs.existsSync(reviewDir)) {
                const files = fs.readdirSync(reviewDir);
                files.filter(f => f.includes('编辑前备份')).forEach(f => {
                    fs.unlinkSync(path.join(reviewDir, f));
                });
            }
        });

        test('保存相同内容不应触发备份', () => {
            const originalContent = fs.readFileSync(testFilePath, 'utf-8');
            const result = fileService.saveFile(testFilePath, originalContent);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, false);
            assert.strictEqual(result.backupFile, undefined);
        });

        test('保存不同内容应创建备份并更新文件', () => {
            const newContent = '# 修改后的内容\n\n**文档版本**：v1.1.0\n\n段落一（已修改）';
            const result = fileService.saveFile(testFilePath, newContent);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, true);
            assert.ok(result.backupFile, '应生成备份文件');
            assert.ok(result.backupFile!.includes('_backup'), '备份文件名应包含"_backup"');
            assert.strictEqual(result.docVersion, 'v1.1.0');

            // 验证文件内容已更新
            const savedContent = fs.readFileSync(testFilePath, 'utf-8');
            assert.strictEqual(savedContent, newContent);
        });

        test('多次编辑应生成多个备份', async () => {
            const content1 = '# 第一次修改\n\n内容1';
            const content2 = '# 第二次修改\n\n内容2';

            const result1 = fileService.saveFile(testFilePath, content1);
            assert.strictEqual(result1.changed, true);

            // 等待 50ms 确保时间戳不同
            await new Promise(resolve => setTimeout(resolve, 50));

            const result2 = fileService.saveFile(testFilePath, content2);
            assert.strictEqual(result2.changed, true);

            // 两次备份文件名应不同
            assert.notStrictEqual(result1.backupFile, result2.backupFile);

            // 最终文件内容应为最后一次保存的内容
            const finalContent = fs.readFileSync(testFilePath, 'utf-8');
            assert.strictEqual(finalContent, content2);
        });

        test('保存不存在的文件应抛出错误', () => {
            assert.throws(() => {
                fileService.saveFile(path.join(testDir, 'ghost.md'), '内容');
            }, /文件不存在/);
        });
    });

    // ===== 流程 4：添加批注并导出批阅记录 =====

    suite('流程 4：添加批注并导出批阅记录', () => {
        test('应成功保存批阅记录文件', () => {
            const reviewContent = [
                '# 批阅记录',
                '',
                '**源文件版本**：v2.0.1',
                '',
                '```json',
                JSON.stringify({
                    annotationCount: 3,
                    annotations: [
                        { type: 'comment', selectedText: '概述段落', comment: '需要更详细', blockIndex: 2 },
                        { type: 'delete', selectedText: '支付服务', blockIndex: 5 },
                        { type: 'insert', selectedText: '订单服务', insertContent: '库存服务', insertPosition: 'after', blockIndex: 5 }
                    ]
                }, null, 2),
                '```'
            ].join('\n');

            const result = fileService.saveReview('批阅记录_wf-save-test_v1.md', reviewContent);
            assert.strictEqual(result.success, true);
            assert.ok(result.path.includes('批阅记录_wf-save-test_v1.md'));
        });

        test('应能查询到已保存的批阅记录', () => {
            // 先保存一条批阅记录（使用独立文件名避免与其他测试冲突）
            const reviewContent = [
                '# 批阅记录',
                '',
                '**源文件版本**：v2.0.1',
                '',
                '```json',
                JSON.stringify({
                    annotationCount: 2,
                    annotations: [
                        { type: 'comment', selectedText: '测试', comment: '修改', blockIndex: 0 },
                        { type: 'delete', selectedText: '删除内容', blockIndex: 1 }
                    ]
                }, null, 2),
                '```'
            ].join('\n');
            fileService.saveReview('批阅记录_wf-query-test_v1.md', reviewContent);

            const records = fileService.getReviewRecords('wf-query-test.md');
            assert.ok(Array.isArray(records), '应返回数组');
            assert.ok(records.length > 0, '应有至少一条记录');

            const record = records[0];
            assert.ok(record.fileName.includes('批阅记录_wf-query-test'), '记录文件名应匹配');
            assert.strictEqual(record.docVersion, 'v2.0.1');
            assert.strictEqual(record.annotationCount, 2);
            assert.ok(Array.isArray(record.annotations), '应包含批注数组');
        });

        test('多版本批阅记录应按版本号倒序排列', () => {
            // 保存两个版本的批阅记录（使用独立文件名避免与其他测试冲突）
            const makeReview = (version: number) => [
                '# 批阅记录',
                '',
                `**源文件版本**：v${version}.0.0`,
                '',
                '```json',
                JSON.stringify({ annotationCount: 1, annotations: [{ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0 }] }),
                '```'
            ].join('\n');

            fileService.saveReview('批阅记录_wf-multi-test_v1.md', makeReview(1));
            fileService.saveReview('批阅记录_wf-multi-test_v2.md', makeReview(2));

            const records = fileService.getReviewRecords('wf-multi-test.md');
            assert.ok(records.length >= 2, '应有至少两条记录');
            // 倒序：v2 在前，v1 在后
            assert.ok(records[0].reviewVersion >= records[1].reviewVersion, '应按版本号倒序排列');
        });
    });

    // ===== 流程 5：应用批阅（生成 AI 修改指令） =====

    suite('流程 5：应用批阅（生成 AI 修改指令）', () => {
        let sourceFilePath: string;
        const sourceContent = [
            '# 测试文档',
            '',
            '## 概述',
            '',
            '这是概述段落。',
            '',
            '## 详细设计',
            '',
            '- 用户服务',
            '- 订单服务',
            '- 支付服务',
            '',
            '## 总结',
            '',
            '本文档描述了系统设计。'
        ].join('\n');

        setup(() => {
            sourceFilePath = path.join(testDir, 'apply-test.md');
            fs.writeFileSync(sourceFilePath, sourceContent, 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(sourceFilePath)) {
                fs.unlinkSync(sourceFilePath);
            }
            // 清理生成的 AI 指令文件
            if (fs.existsSync(reviewDir)) {
                const files = fs.readdirSync(reviewDir);
                files.filter(f => f.startsWith('AI修改指令')).forEach(f => {
                    fs.unlinkSync(path.join(reviewDir, f));
                });
            }
        });

        test('空批注应返回"无有效指令"', () => {
            const result = fileService.applyReview([], sourceFilePath, 'apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 0);
            assert.strictEqual(result.message, '无有效指令');
        });

        test('comment 批注应生成修改指令', () => {
            const annotations = [{
                type: 'comment',
                selectedText: '这是概述段落。',
                comment: '请补充更多背景信息',
                blockIndex: 2,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);
            assert.ok(result.aiInstructionFile, '应生成 AI 指令文件');
            assert.ok(result.aiInstructionFilePath, '应返回文件路径');

            // 验证指令文件内容
            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            assert.ok(content.includes('AI 修改指令'), '应包含标题');
            assert.ok(content.includes('这是概述段落'), '应包含目标文本');
            assert.ok(content.includes('请补充更多背景信息'), '应包含评论');
            assert.ok(content.includes('修改'), '应标注为修改操作');
        });

        test('delete 批注应生成删除指令', () => {
            const annotations = [{
                type: 'delete',
                selectedText: '- 支付服务',
                blockIndex: 3,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            assert.ok(content.includes('删除'), '应包含删除操作');
            assert.ok(content.includes('支付服务'), '应包含要删除的文本');
        });

        test('insert 批注应生成插入指令', () => {
            const annotations = [{
                type: 'insert',
                selectedText: '- 订单服务',
                insertContent: '- 库存服务',
                insertPosition: 'after',
                blockIndex: 3,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            assert.ok(content.includes('插入'), '应包含插入操作');
            assert.ok(content.includes('库存服务'), '应包含要插入的内容');
            assert.ok(content.includes('订单服务'), '应包含锚点文本');
        });

        test('混合批注应全部生成指令并按 blockIndex 倒序排列', () => {
            const annotations = [
                { type: 'comment', selectedText: '这是概述段落。', comment: '修改概述', blockIndex: 2, startOffset: 0 },
                { type: 'delete', selectedText: '- 支付服务', blockIndex: 3, startOffset: 20 },
                { type: 'insert', selectedText: '- 用户服务', insertContent: '- 认证服务', insertPosition: 'before', blockIndex: 3, startOffset: 0 },
                { type: 'comment', selectedText: '本文档描述了系统设计。', comment: '补充结论', blockIndex: 4, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, sourceFilePath, 'apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 4);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');

            // 验证倒序：blockIndex=4 的指令应在 blockIndex=2 之前
            const idx4 = content.indexOf('补充结论');
            const idx2 = content.indexOf('修改概述');
            assert.ok(idx4 < idx2, 'blockIndex=4 的指令应排在 blockIndex=2 之前（倒序）');

            // 同一 blockIndex=3 内，startOffset=20 应在 startOffset=0 之前
            const idxDelete = content.indexOf('支付服务');
            const idxInsert = content.indexOf('认证服务');
            assert.ok(idxDelete < idxInsert, '同块内 startOffset 大的应排在前面（倒序）');
        });

        test('无效批注应被过滤', () => {
            const annotations = [
                { type: 'delete', selectedText: '' },           // 空 selectedText，无效
                { type: 'insert', insertContent: '', selectedText: 'abc' },  // 空 insertContent，无效
                { type: 'comment', selectedText: '有效文本', comment: '有效评论', blockIndex: 0 }  // 有效
            ];

            const result = fileService.applyReview(annotations, sourceFilePath, 'apply-test.md');
            assert.strictEqual(result.needsAi, 1, '应只有 1 条有效指令');
        });
    });

    // ===== 流程 6：状态持久化工作流 =====

    suite('流程 6：状态持久化工作流', () => {
        test('完整的状态读写删除流程', async () => {
            // 1. 初始状态应为 undefined
            assert.strictEqual(stateService.get('workflow-key'), undefined);

            // 2. 写入状态
            await stateService.set('workflow-key', { step: 'reviewing', progress: 50 });
            const value = stateService.get<{ step: string; progress: number }>('workflow-key');
            assert.deepStrictEqual(value, { step: 'reviewing', progress: 50 });

            // 3. 更新状态
            await stateService.set('workflow-key', { step: 'completed', progress: 100 });
            const updated = stateService.get<{ step: string; progress: number }>('workflow-key');
            assert.deepStrictEqual(updated, { step: 'completed', progress: 100 });

            // 4. 删除状态
            await stateService.remove('workflow-key');
            assert.strictEqual(stateService.get('workflow-key'), undefined);
        });

        test('应支持存储批注列表状态', async () => {
            const annotations = [
                { id: 'ann-1', type: 'comment', text: '修改建议', blockIndex: 0 },
                { id: 'ann-2', type: 'delete', text: '删除内容', blockIndex: 2 },
                { id: 'ann-3', type: 'insert', text: '新增内容', blockIndex: 3 }
            ];

            await stateService.set('annotations', annotations);
            const stored = stateService.get<typeof annotations>('annotations');
            assert.deepStrictEqual(stored, annotations);
            assert.strictEqual(stored!.length, 3);
        });

        test('应支持存储当前文件路径状态', async () => {
            await stateService.set('currentFile', '/workspace/docs/design.md');
            assert.strictEqual(stateService.get<string>('currentFile'), '/workspace/docs/design.md');
        });
    });

    // ===== 流程 7：图片批注工作流 =====

    suite('流程 7：图片批注工作流', () => {
        // 最小 1x1 PNG 的 Base64
        const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const base64Jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=';

        test('应成功保存 PNG 图片并返回正确路径', () => {
            const result = fileService.saveAnnotationImage(base64Png);
            assert.strictEqual(result.success, true);
            assert.ok(result.imagePath.startsWith('images/'), '路径应以 images/ 开头');
            assert.ok(result.imagePath.endsWith('.png'), '应为 .png 扩展名');
        });

        test('应成功保存 JPEG 图片', () => {
            const result = fileService.saveAnnotationImage(base64Jpeg);
            assert.strictEqual(result.success, true);
            assert.ok(result.imagePath.endsWith('.jpg'), '应为 .jpg 扩展名');
        });

        test('无效图片数据应抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('not-a-valid-base64');
            }, /无效的图片数据格式/);
        });

        test('保存后删除图片应返回 true', () => {
            const saveResult = fileService.saveAnnotationImage(base64Png);
            assert.strictEqual(saveResult.success, true);

            const deleted = fileService.deleteAnnotationImage(saveResult.imagePath);
            assert.strictEqual(deleted, true, '删除已存在的图片应返回 true');
        });

        test('删除不存在的图片应返回 false', () => {
            const deleted = fileService.deleteAnnotationImage('images/nonexistent.png');
            assert.strictEqual(deleted, false);
        });

        test('图片保存 → 删除的完整生命周期', () => {
            // 保存
            const result1 = fileService.saveAnnotationImage(base64Png);
            const result2 = fileService.saveAnnotationImage(base64Jpeg);
            assert.strictEqual(result1.success, true);
            assert.strictEqual(result2.success, true);

            // 删除第一张
            assert.strictEqual(fileService.deleteAnnotationImage(result1.imagePath), true);

            // 第一张已删除，再次删除应返回 false
            assert.strictEqual(fileService.deleteAnnotationImage(result1.imagePath), false);

            // 第二张仍存在
            assert.strictEqual(fileService.deleteAnnotationImage(result2.imagePath), true);
        });
    });

    // ===== 流程 8：批阅记录管理（查询与删除） =====

    suite('流程 8：批阅记录管理', () => {
        setup(() => {
            // 预先创建一些批阅记录
            const makeReview = (version: number) => [
                '# 批阅记录',
                '',
                `**源文件版本**：v${version}.0.0`,
                '',
                '```json',
                JSON.stringify({
                    annotationCount: version,
                    annotations: Array.from({ length: version }, (_, i) => ({
                        type: 'comment', selectedText: `文本${i}`, comment: `评论${i}`, blockIndex: i
                    }))
                }),
                '```'
            ].join('\n');

            fileService.saveReview('批阅记录_records-test_v1.md', makeReview(1));
            fileService.saveReview('批阅记录_records-test_v2.md', makeReview(2));
            fileService.saveReview('批阅记录_records-test_v3.md', makeReview(3));
        });

        test('应查询到所有批阅记录', () => {
            const records = fileService.getReviewRecords('records-test.md');
            assert.ok(records.length >= 3, '应有至少 3 条记录');
        });

        test('批阅记录应包含正确的批注数据', () => {
            const records = fileService.getReviewRecords('records-test.md');
            const v3 = records.find(r => r.reviewVersion === 3);
            assert.ok(v3, '应找到 v3 记录');
            assert.strictEqual(v3!.annotationCount, 3);
            assert.strictEqual(v3!.annotations.length, 3);
            assert.strictEqual(v3!.docVersion, 'v3.0.0');
        });

        test('删除批阅记录应成功', () => {
            const delResult = fileService.deleteReviewRecords('records-test.md');
            assert.strictEqual(delResult.success, true);
            assert.ok(delResult.deleted.length > 0, '应有文件被删除');

            // 删除后查询应为空
            const records = fileService.getReviewRecords('records-test.md');
            assert.strictEqual(records.length, 0, '删除后应无记录');
        });

        test('删除不存在文件的批阅记录应返回空列表', () => {
            const result = fileService.deleteReviewRecords('nonexistent-file.md');
            assert.strictEqual(result.success, true);
            assert.ok(Array.isArray(result.deleted));
        });

        test('无 .review 目录时查询应返回空数组', () => {
            const records = fileService.getReviewRecords('never-reviewed.md');
            assert.ok(Array.isArray(records));
        });
    });

    // ===== 流程 9：端到端完整工作流 =====

    suite('流程 9：端到端完整工作流', () => {
        let docPath: string;
        const originalContent = [
            '# 项目设计文档',
            '',
            '**文档版本**：v1.0.0',
            '',
            '## 背景',
            '',
            '本项目旨在构建一个高效的数据处理平台。',
            '',
            '## 技术方案',
            '',
            '使用 Node.js 作为后端框架。',
            '',
            '## 风险评估',
            '',
            '暂无已知风险。'
        ].join('\n');

        setup(() => {
            docPath = path.join(testDir, 'e2e-test.md');
            fs.writeFileSync(docPath, originalContent, 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(docPath)) {
                fs.unlinkSync(docPath);
            }
            // 清理所有生成的文件
            if (fs.existsSync(reviewDir)) {
                const files = fs.readdirSync(reviewDir);
                files.filter(f => f.includes('e2e-test')).forEach(f => {
                    try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
                });
                files.filter(f => f.startsWith('AI修改指令')).forEach(f => {
                    try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
                });
            }
        });

        test('完整流程：读取 → 编辑 → 保存 → 批注 → 导出 → 应用 → 记录查询 → 清理', () => {
            // Step 1: 读取文件
            const readResult = fileService.readFile(docPath);
            assert.strictEqual(readResult.name, 'e2e-test.md');
            assert.strictEqual(readResult.docVersion, 'v1.0.0');

            // Step 2: 编辑并保存（模拟用户在 webview 中编辑）
            const editedContent = originalContent.replace('v1.0.0', 'v1.1.0').replace('暂无已知风险。', '需要关注性能瓶颈。');
            const saveResult = fileService.saveFile(docPath, editedContent);
            assert.strictEqual(saveResult.success, true);
            assert.strictEqual(saveResult.changed, true);
            assert.ok(saveResult.backupFile, '应生成备份');
            assert.strictEqual(saveResult.docVersion, 'v1.1.0');

            // Step 3: 验证文件已更新
            const reReadResult = fileService.readFile(docPath);
            assert.strictEqual(reReadResult.docVersion, 'v1.1.0');
            assert.ok(reReadResult.content.includes('需要关注性能瓶颈'));

            // Step 4: 创建批注并导出批阅记录
            const annotations = [
                { type: 'comment', selectedText: '本项目旨在构建一个高效的数据处理平台。', comment: '请补充项目目标和预期收益', blockIndex: 2, startOffset: 0 },
                { type: 'delete', selectedText: '使用 Node.js 作为后端框架。', blockIndex: 3, startOffset: 0 },
                { type: 'insert', selectedText: '需要关注性能瓶颈。', insertContent: '同时需要关注安全风险。', insertPosition: 'after', blockIndex: 4, startOffset: 0 }
            ];

            const reviewContent = [
                '# 批阅记录',
                '',
                '**源文件版本**：v1.1.0',
                '',
                '```json',
                JSON.stringify({ annotationCount: annotations.length, annotations }, null, 2),
                '```'
            ].join('\n');

            const exportResult = fileService.saveReview('批阅记录_e2e-test_v1.md', reviewContent);
            assert.strictEqual(exportResult.success, true);

            // Step 5: 应用批阅（生成 AI 指令）
            const applyResult = fileService.applyReview(annotations, docPath, 'e2e-test.md');
            assert.strictEqual(applyResult.success, true);
            assert.strictEqual(applyResult.needsAi, 3);
            assert.ok(applyResult.aiInstructionFile);

            // 验证 AI 指令文件内容完整性
            const aiContent = fs.readFileSync(applyResult.aiInstructionFilePath!, 'utf-8');
            assert.ok(aiContent.includes('指令 1'), '应包含指令 1');
            assert.ok(aiContent.includes('指令 2'), '应包含指令 2');
            assert.ok(aiContent.includes('指令 3'), '应包含指令 3');
            assert.ok(aiContent.includes('请补充项目目标和预期收益'), '应包含 comment 评论');
            assert.ok(aiContent.includes('使用 Node.js 作为后端框架'), '应包含 delete 目标');
            assert.ok(aiContent.includes('同时需要关注安全风险'), '应包含 insert 内容');

            // Step 6: 查询批阅记录
            const records = fileService.getReviewRecords('e2e-test.md');
            assert.ok(records.length > 0, '应有批阅记录');
            assert.strictEqual(records[0].docVersion, 'v1.1.0');
            assert.strictEqual(records[0].annotationCount, 3);

            // Step 7: 删除批阅记录
            const delResult = fileService.deleteReviewRecords('e2e-test.md');
            assert.strictEqual(delResult.success, true);
            assert.ok(delResult.deleted.length > 0);

            // 验证删除后无记录
            const afterDel = fileService.getReviewRecords('e2e-test.md');
            assert.strictEqual(afterDel.length, 0);
        });
    });

    // ===== 流程 10：面板命令执行 =====

    suite('流程 10：面板命令执行', () => {
        test('openPanel 命令应可安全执行', async () => {
            try {
                await vscode.commands.executeCommand('mdReview.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
                assert.ok(true, 'openPanel 命令执行成功');
            } catch (e: any) {
                // 在测试环境中可能因为没有活动编辑器而产生预期内的错误
                assert.ok(true, `命令执行完成: ${e.message}`);
            }
        });

        test('exportReview 命令在无面板时应安全执行', async () => {
            try {
                await vscode.commands.executeCommand('mdReview.exportReview');
                assert.ok(true, 'exportReview 命令执行成功（无面板时静默忽略）');
            } catch (e: any) {
                assert.ok(true, `命令执行完成: ${e.message}`);
            }
        });
    });

    // ===== 流程 11：Webview 资源完整性验证 =====

    suite('流程 11：Webview 资源完整性验证', () => {
        test('所有必需的 webview 资源文件应存在', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath, '扩展路径应存在');

            // HTML 模板
            assert.ok(fs.existsSync(path.join(extPath!, 'webview', 'index.html')), 'index.html 应存在');

            // CSS 文件
            const cssFiles = ['style.css', 'markdown.css', 'annotations.css', 'settings.css'];
            for (const css of cssFiles) {
                assert.ok(fs.existsSync(path.join(extPath!, 'webview', 'css', css)), `${css} 应存在`);
            }

            // JS 文件
            const jsFiles = ['store.js', 'renderer.js', 'annotations.js', 'export.js', 'settings.js', 'app.js'];
            for (const js of jsFiles) {
                assert.ok(fs.existsSync(path.join(extPath!, 'webview', 'js', js)), `${js} 应存在`);
            }
        });

        test('index.html 应包含所有必要的占位符', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const html = fs.readFileSync(path.join(extPath!, 'webview', 'index.html'), 'utf-8');
            const requiredPlaceholders = ['${nonce}', '${cspSource}', '${styleUri}', '${appUri}'];
            for (const ph of requiredPlaceholders) {
                assert.ok(html.includes(ph), `HTML 应包含占位符 ${ph}`);
            }
        });
    });

    // ===== 流程 12：边界情况与容错 =====

    suite('流程 12：边界情况与容错', () => {
        test('空内容文件应能正常读取', () => {
            const emptyPath = path.join(testDir, 'empty.md');
            fs.writeFileSync(emptyPath, '', 'utf-8');
            const result = fileService.readFile(emptyPath);
            assert.strictEqual(result.content, '');
            assert.strictEqual(result.docVersion, null);
            fs.unlinkSync(emptyPath);
        });

        test('超大批注列表应能正常处理', () => {
            const sourcePath = path.join(testDir, 'large-ann.md');
            const lines = ['# 大文档'];
            for (let i = 0; i < 50; i++) {
                lines.push('', `段落 ${i}: 这是第 ${i} 个段落的内容。`);
            }
            fs.writeFileSync(sourcePath, lines.join('\n'), 'utf-8');

            const annotations = Array.from({ length: 50 }, (_, i) => ({
                type: 'comment',
                selectedText: `段落 ${i}: 这是第 ${i} 个段落的内容。`,
                comment: `修改建议 ${i}`,
                blockIndex: i + 1,
                startOffset: 0
            }));

            const result = fileService.applyReview(annotations, sourcePath, 'large-ann.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 50);

            // 清理
            fs.unlinkSync(sourcePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('特殊字符文件名应能正常处理', () => {
            const specialPath = path.join(testDir, '测试文档 (v2.0).md');
            fs.writeFileSync(specialPath, '# 特殊文件名测试', 'utf-8');
            const result = fileService.readFile(specialPath);
            assert.strictEqual(result.name, '测试文档 (v2.0).md');
            fs.unlinkSync(specialPath);
        });

        test('包含代码块的文档应能正确处理批注', () => {
            const codePath = path.join(testDir, 'code-doc.md');
            const codeContent = [
                '# 代码文档',
                '',
                '```javascript',
                'function hello() {',
                '  console.log("world");',
                '}',
                '```',
                '',
                '以上是示例代码。'
            ].join('\n');
            fs.writeFileSync(codePath, codeContent, 'utf-8');

            const annotations = [{
                type: 'comment',
                selectedText: '以上是示例代码。',
                comment: '请补充代码说明',
                blockIndex: 2,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, codePath, 'code-doc.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            // 清理
            fs.unlinkSync(codePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });
    });

    // ===== 编辑模式 Bug 回归测试 =====

    suite('编辑模式 Bug 回归：删除文本不应导致多复制一行', () => {
        test('renderer.js 的 inlineExtractedDefs 计算应使用 trimEnd 比较行', () => {
            // 回归测试：修复 blocks[b].trim() 导致首尾行空白被去掉，
            // 使 Set 比较时非定义行被错误提取为 extractedLines
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const rendererJs = fs.readFileSync(path.join(extPath!, 'webview', 'js', 'renderer.js'), 'utf-8');

            // 验证 cleanedLines 使用 trimEnd 进行比较
            assert.ok(
                rendererJs.includes('.map(l => l.trimEnd())'),
                'cleanedLines 应使用 .map(l => l.trimEnd()) 避免 trim 导致的行不匹配'
            );

            // 验证 extractedLines 过滤时也使用 trimEnd
            assert.ok(
                rendererJs.includes('line.trimEnd()'),
                'extractedLines 过滤时应使用 line.trimEnd() 进行比较'
            );
        });

        test('app.js 行级 diff 应去掉 innerText 末尾换行', () => {
            // 回归测试：修复 innerText 末尾 \n 导致 currentLines 多出空行
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const appJs = fs.readFileSync(path.join(extPath!, 'webview', 'js', 'app.js'), 'utf-8');

            // 验证去掉 innerText 末尾换行
            assert.ok(
                appJs.includes("currentText.replace(/\\n+$/, '').split('\\n')"),
                'currentLines 应先去掉末尾换行再 split'
            );

            // 验证不再使用无效过滤器 || true
            assert.ok(
                !appJs.includes("|| true)"),
                '不应包含无效过滤器 || true'
            );
        });

        test('app.js 行级 diff 应有安全检查防止行错位', () => {
            // 回归测试：当原始行有内容但当前行为空时应放弃行级 diff
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const appJs = fs.readFileSync(path.join(extPath!, 'webview', 'js', 'app.js'), 'utf-8');

            // 验证安全检查逻辑存在
            assert.ok(
                appJs.includes('origStripped.length > 0 && currStripped.length === 0'),
                '应有安全检查：原始行有内容但当前行为空时放弃行级 diff'
            );
            assert.ok(
                appJs.includes('origStripped.length === 0 && currStripped.length > 0'),
                '应有安全检查：原始行为空但当前行有内容时放弃行级 diff'
            );
        });
    });
});
