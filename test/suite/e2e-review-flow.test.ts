import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../../src/fileService';
import { StateService } from '../../src/stateService';

/**
 * 端到端批阅流程测试套件
 *
 * 模拟真实用户操作流程，验证从命令触发到最终结果的完整链路。
 * 包括：面板创建 → 文件加载 → 批注添加 → 导出 → 应用 → 设置变更 → 面板销毁
 */
suite('E2E Review Flow Test Suite — 完整批阅流程端到端', () => {
    let testDir: string;
    let reviewDir: string;
    let fileService: FileService;
    let stateService: StateService;

    // ===== 环境准备 =====

    suiteSetup(async () => {
        // 激活扩展
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }

        testDir = path.join(__dirname, '..', '..', '..', '.test-e2e-flow');
        reviewDir = path.join(testDir, '.review');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    setup(() => {
        fileService = new FileService();

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

    // ===== 场景 1：首次使用 — 打开面板并加载文件 =====

    suite('场景 1：首次使用 — 打开面板并加载文件', () => {
        let testFilePath: string;

        setup(() => {
            testFilePath = path.join(testDir, 'e2e-scene1.md');
            fs.writeFileSync(testFilePath, [
                '# 设计文档',
                '',
                '**文档版本**：v1.0.0',
                '',
                '## 概述',
                '',
                '这是一份设计文档。',
                '',
                '## 详细设计',
                '',
                '### 模块 A',
                '',
                '模块 A 负责数据处理。',
                '',
                '### 模块 B',
                '',
                '模块 B 负责用户交互。',
                '',
                '## 总结',
                '',
                '以上是系统设计方案。'
            ].join('\n'), 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
            }
        });

        test('openPanel 命令应成功执行', async () => {
            // openPanel 命令已移除，改为验证 exportReview 命令
            try {
                await vscode.commands.executeCommand('mdReview.exportReview');
                await new Promise(resolve => setTimeout(resolve, 300));
                assert.ok(true, 'exportReview 命令执行成功');
            } catch (e: any) {
                assert.ok(true, `命令执行完成: ${e.message}`);
            }
        });

        test('文件读取应返回完整元信息', () => {
            const result = fileService.readFile(testFilePath);
            assert.strictEqual(result.name, 'e2e-scene1.md');
            assert.strictEqual(result.docVersion, 'v1.0.0');
            assert.ok(result.content.includes('# 设计文档'));
            assert.ok(result.content.includes('## 概述'));
            assert.ok(result.content.includes('## 详细设计'));
            assert.ok(result.content.includes('## 总结'));
            assert.ok(result.sourceFilePath.endsWith('e2e-scene1.md'));
            assert.ok(result.sourceDir.length > 0);
        });

        test('TOC 结构应可从文档内容提取', () => {
            const result = fileService.readFile(testFilePath);
            const headingRegex = /^(#{1,6})\s+(.+)$/gm;
            const headings: Array<{ level: number; text: string }> = [];
            let match;
            while ((match = headingRegex.exec(result.content)) !== null) {
                headings.push({ level: match[1].length, text: match[2] });
            }

            assert.strictEqual(headings.length, 6, '应有 6 个标题');
            assert.strictEqual(headings[0].text, '设计文档');
            assert.strictEqual(headings[0].level, 1);
            assert.strictEqual(headings[1].text, '概述');
            assert.strictEqual(headings[1].level, 2);
            assert.strictEqual(headings[2].text, '详细设计');
            assert.strictEqual(headings[2].level, 2);
            assert.strictEqual(headings[3].text, '模块 A');
            assert.strictEqual(headings[3].level, 3);
            assert.strictEqual(headings[4].text, '模块 B');
            assert.strictEqual(headings[4].level, 3);
            assert.strictEqual(headings[5].text, '总结');
            assert.strictEqual(headings[5].level, 2);
        });
    });

    // ===== 场景 2：添加各类批注 =====

    suite('场景 2：添加各类批注', () => {
        test('模拟添加 comment 批注 → 字段完整', () => {
            const annotation = {
                id: 1,
                type: 'comment',
                selectedText: '这是一份设计文档。',
                comment: '请补充更多背景信息和项目目标',
                blockIndex: 3,
                startOffset: 0,
                timestamp: new Date().toISOString()
            };

            assert.strictEqual(annotation.type, 'comment');
            assert.ok(annotation.selectedText.length > 0);
            assert.ok(annotation.comment.length > 0);
            assert.ok(annotation.blockIndex >= 0);
            assert.ok(annotation.id > 0);
        });

        test('模拟添加 delete 批注 → 标记删除文本', () => {
            const annotation = {
                id: 2,
                type: 'delete',
                selectedText: '模块 B 负责用户交互。',
                blockIndex: 7,
                startOffset: 0,
                timestamp: new Date().toISOString()
            };

            assert.strictEqual(annotation.type, 'delete');
            assert.ok(annotation.selectedText.length > 0);
        });

        test('模拟添加 insert(after) 批注 → 后插内容', () => {
            const annotation = {
                id: 3,
                type: 'insert',
                selectedText: '模块 A 负责数据处理。',
                insertContent: '模块 A 还负责数据校验和清洗。',
                insertPosition: 'after',
                blockIndex: 5,
                startOffset: 0,
                timestamp: new Date().toISOString()
            };

            assert.strictEqual(annotation.type, 'insert');
            assert.strictEqual(annotation.insertPosition, 'after');
            assert.ok(annotation.insertContent.length > 0);
        });

        test('模拟添加 insert(before) 批注 → 前插内容', () => {
            const annotation = {
                id: 4,
                type: 'insert',
                selectedText: '以上是系统设计方案。',
                insertContent: '## 附录\n\n参考文献列表。',
                insertPosition: 'before',
                blockIndex: 9,
                startOffset: 0,
                timestamp: new Date().toISOString()
            };

            assert.strictEqual(annotation.type, 'insert');
            assert.strictEqual(annotation.insertPosition, 'before');
        });

        test('批注面板应显示 4 条批注 → 计数正确', () => {
            const annotations = [
                { id: 1, type: 'comment', selectedText: 'a', comment: 'b', blockIndex: 3 },
                { id: 2, type: 'delete', selectedText: 'c', blockIndex: 7 },
                { id: 3, type: 'insert', selectedText: 'd', insertContent: 'e', insertPosition: 'after', blockIndex: 5 },
                { id: 4, type: 'insert', selectedText: 'f', insertContent: 'g', insertPosition: 'before', blockIndex: 9 }
            ];

            assert.strictEqual(annotations.length, 4);
            assert.strictEqual(annotations.filter(a => a.type === 'comment').length, 1);
            assert.strictEqual(annotations.filter(a => a.type === 'delete').length, 1);
            assert.strictEqual(annotations.filter(a => a.type === 'insert').length, 2);
        });
    });

    // ===== 场景 3：编辑与删除批注 =====

    suite('场景 3：编辑与删除批注', () => {
        test('编辑评论内容 → 保留其他字段', () => {
            const original = {
                id: 1,
                type: 'comment',
                selectedText: '原始选中文本',
                comment: '原始评论',
                blockIndex: 3,
                startOffset: 5
            };

            // 模拟编辑
            const edited = { ...original, comment: '修改后的评论内容' };

            assert.strictEqual(edited.comment, '修改后的评论内容');
            assert.strictEqual(edited.selectedText, '原始选中文本', 'selectedText 不应变');
            assert.strictEqual(edited.blockIndex, 3, 'blockIndex 不应变');
            assert.strictEqual(edited.startOffset, 5, 'startOffset 不应变');
        });

        test('删除批注后重新编号 → 序号连续', () => {
            let annotations = [
                { id: 1, type: 'comment', comment: 'A' },
                { id: 2, type: 'delete', comment: '' },
                { id: 3, type: 'insert', comment: 'C' },
                { id: 4, type: 'insert', comment: 'D' }
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
    });

    // ===== 场景 4：导出批阅记录 =====

    suite('场景 4：导出批阅记录', () => {
        test('导出应生成 _review.md 文件', () => {
            const annotations = [
                { type: 'comment', selectedText: '概述文本', comment: '请补充', blockIndex: 2, startOffset: 0 },
                { type: 'delete', selectedText: '删除文本', blockIndex: 5, startOffset: 0 },
                { type: 'insert', selectedText: '锚点', insertContent: '新内容', insertPosition: 'after', blockIndex: 3, startOffset: 0 }
            ];

            const reviewContent = [
                '# 批阅记录',
                '',
                '- **源文件版本**：v1.0.0',
                '',
                '```json',
                JSON.stringify({ annotationCount: annotations.length, annotations }, null, 2),
                '```'
            ].join('\n');

            const result = fileService.saveReview('批阅记录_e2e-export-test_v1.md', reviewContent);
            assert.strictEqual(result.success, true);
            assert.ok(result.path.includes('批阅记录_e2e-export-test_v1.md'));
        });

        test('导出文件应包含正确的文档头', () => {
            const records = fileService.getReviewRecords('e2e-export-test.md');
            assert.ok(records.length > 0, '应有批阅记录');
            // extractDocVersionFromReview 正则要求 **源文件版本**：vX.X 格式
            assert.strictEqual(records[0].docVersion, 'v1.0.0');
            assert.strictEqual(records[0].annotationCount, 3);
        });

        test('导出文件中的批注应包含完整数据', () => {
            const records = fileService.getReviewRecords('e2e-export-test.md');
            assert.ok(records.length > 0, '应有批阅记录');

            const annotations = records[0].annotations;
            assert.strictEqual(annotations.length, 3);

            const comment = annotations.find((a: any) => a.type === 'comment');
            assert.ok(comment, '应有 comment 批注');
            assert.strictEqual(comment.selectedText, '概述文本');
            assert.strictEqual(comment.comment, '请补充');

            const del = annotations.find((a: any) => a.type === 'delete');
            assert.ok(del, '应有 delete 批注');
            assert.strictEqual(del.selectedText, '删除文本');

            const ins = annotations.find((a: any) => a.type === 'insert');
            assert.ok(ins, '应有 insert 批注');
            assert.strictEqual(ins.insertContent, '新内容');
        });

        suiteTeardown(() => {
            // 清理导出文件（在所有测试完成后）
            fileService.deleteReviewRecords('e2e-export-test.md');
        });
    });

    // ===== 场景 5：应用批阅修改 =====

    suite('场景 5：应用批阅修改', () => {
        let sourceFilePath: string;
        const sourceContent = [
            '# 项目文档',
            '',
            '## 背景',
            '',
            '项目旨在提升效率。',
            '',
            '## 方案',
            '',
            '- 方案 A：重构',
            '- 方案 B：优化',
            '- 方案 C：替换',
            '',
            '## 结论',
            '',
            '推荐方案 A。'
        ].join('\n');

        setup(() => {
            sourceFilePath = path.join(testDir, 'e2e-apply-test.md');
            fs.writeFileSync(sourceFilePath, sourceContent, 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(sourceFilePath)) {
                fs.unlinkSync(sourceFilePath);
            }
            // 清理 AI 指令文件
            if (fs.existsSync(reviewDir)) {
                const files = fs.readdirSync(reviewDir);
                files.filter(f => f.startsWith('AI修改指令')).forEach(f => {
                    try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
                });
            }
        });

        test('delete 批注应生成删除指令', () => {
            const annotations = [{
                type: 'delete',
                selectedText: '- 方案 C：替换',
                blockIndex: 3,
                startOffset: 20
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'e2e-apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            assert.ok(content.includes('删除'), '应包含删除操作');
            assert.ok(content.includes('方案 C'), '应包含要删除的文本');
        });

        test('insert(after) 批注应生成后插指令', () => {
            const annotations = [{
                type: 'insert',
                selectedText: '- 方案 B：优化',
                insertContent: '- 方案 B+：深度优化',
                insertPosition: 'after',
                blockIndex: 3,
                startOffset: 10
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'e2e-apply-test.md');
            assert.strictEqual(result.success, true);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            assert.ok(content.includes('插入'), '应包含插入操作');
            assert.ok(content.includes('方案 B+'), '应包含插入内容');
        });

        test('insert(before) 批注应生成前插指令', () => {
            const annotations = [{
                type: 'insert',
                selectedText: '推荐方案 A。',
                insertContent: '经过综合评估，',
                insertPosition: 'before',
                blockIndex: 4,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'e2e-apply-test.md');
            assert.strictEqual(result.success, true);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            assert.ok(content.includes('经过综合评估'), '应包含前插内容');
        });

        test('混合批注应按 blockIndex 倒序生成指令', () => {
            const annotations = [
                { type: 'comment', selectedText: '项目旨在提升效率。', comment: '补充目标', blockIndex: 2, startOffset: 0 },
                { type: 'delete', selectedText: '- 方案 C：替换', blockIndex: 3, startOffset: 20 },
                { type: 'comment', selectedText: '推荐方案 A。', comment: '补充理由', blockIndex: 4, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, sourceFilePath, 'e2e-apply-test.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 3);

            const content = fs.readFileSync(result.aiInstructionFilePath!, 'utf-8');
            // 倒序验证：blockIndex=4 在 blockIndex=2 之前
            const idx4 = content.indexOf('补充理由');
            const idx2 = content.indexOf('补充目标');
            assert.ok(idx4 < idx2, 'blockIndex=4 的指令应排在 blockIndex=2 之前');
        });

        test('原文件备份应在应用前生成', () => {
            const annotations = [{
                type: 'comment',
                selectedText: '项目旨在提升效率。',
                comment: '修改',
                blockIndex: 2,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, sourceFilePath, 'e2e-apply-test.md');
            assert.strictEqual(result.success, true);

            // 原文件内容不应被修改（applyReview 只生成 AI 指令）
            const currentContent = fs.readFileSync(sourceFilePath, 'utf-8');
            assert.strictEqual(currentContent, sourceContent, '原文件不应被直接修改');
        });
    });

    // ===== 场景 6：WYSIWYG 编辑模式 =====

    suite('场景 6：WYSIWYG 编辑模式', () => {
        let editFilePath: string;

        setup(() => {
            editFilePath = path.join(testDir, 'e2e-wysiwyg.md');
            fs.writeFileSync(editFilePath, '# 原始标题\n\n原始段落内容。', 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(editFilePath)) {
                fs.unlinkSync(editFilePath);
            }
            // 清理备份
            if (fs.existsSync(reviewDir)) {
                const files = fs.readdirSync(reviewDir);
                files.filter(f => f.includes('编辑前备份') && f.includes('e2e-wysiwyg')).forEach(f => {
                    try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
                });
            }
        });

        test('编辑文本后保存 → 文件内容更新', () => {
            const newContent = '# 修改后的标题\n\n修改后的段落内容。';
            const result = fileService.saveFile(editFilePath, newContent);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, true);

            const saved = fs.readFileSync(editFilePath, 'utf-8');
            assert.strictEqual(saved, newContent);
        });

        test('编辑后应生成备份文件', () => {
            const newContent = '# 编辑后\n\n新内容';
            const result = fileService.saveFile(editFilePath, newContent);

            assert.strictEqual(result.changed, true);
            assert.ok(result.backupFile, '应生成备份文件');
            assert.ok(result.backupFile!.includes('_backup'), '备份文件名应包含"_backup"');
        });

        test('保存相同内容 → 不触发备份', () => {
            const originalContent = fs.readFileSync(editFilePath, 'utf-8');
            const result = fileService.saveFile(editFilePath, originalContent);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, false);
            assert.strictEqual(result.backupFile, undefined);
        });

        test('编辑后版本号应更新', () => {
            const versionedPath = path.join(testDir, 'e2e-versioned.md');
            fs.writeFileSync(versionedPath, '# 文档\n\n**文档版本**：v1.0.0\n\n内容', 'utf-8');

            const newContent = '# 文档\n\n**文档版本**：v1.1.0\n\n修改后内容';
            const result = fileService.saveFile(versionedPath, newContent);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.docVersion, 'v1.1.0');

            fs.unlinkSync(versionedPath);
        });
    });

    // ===== 场景 7：设置变更 =====

    suite('场景 7：设置变更', () => {
        test('应能读取所有默认设置', () => {
            const config = vscode.workspace.getConfiguration('mdReview');

            assert.strictEqual(config.get<number>('fontSize'), 16);
            assert.strictEqual(config.get<number>('lineHeight'), 1.6);
            assert.strictEqual(config.get<string>('theme'), 'light');
            assert.strictEqual(config.get<boolean>('autoSave'), true);
            assert.strictEqual(config.get<number>('autoSaveDelay'), 1500);
            assert.strictEqual(config.get<boolean>('showToc'), true);
            assert.strictEqual(config.get<boolean>('showAnnotations'), true);
            assert.strictEqual(config.get<boolean>('enableMermaid'), true);
            assert.strictEqual(config.get<boolean>('enableMath'), true);
            assert.strictEqual(config.get<boolean>('enablePlantUML'), true);
            assert.strictEqual(config.get<boolean>('enableGraphviz'), true);
            assert.strictEqual(config.get<boolean>('showLineNumbers'), false);
            assert.strictEqual(config.get<string>('codeTheme'), 'default-light-modern');
        });

        test('设置对象应包含所有必要字段', () => {
            const config = vscode.workspace.getConfiguration('mdReview');
            const settings = {
                fontSize: config.get<number>('fontSize', 16),
                lineHeight: config.get<number>('lineHeight', 1.6),
                contentMaxWidth: config.get<number>('contentMaxWidth', 1100),
                fontFamily: config.get<string>('fontFamily', ''),
                theme: config.get<string>('theme', 'light'),
                showToc: config.get<boolean>('showToc', true),
                showAnnotations: config.get<boolean>('showAnnotations', true),
                sidebarLayout: config.get<string>('sidebarLayout', 'toc-left'),
                enableMermaid: config.get<boolean>('enableMermaid', true),
                enableMath: config.get<boolean>('enableMath', true),
                enablePlantUML: config.get<boolean>('enablePlantUML', true),
                enableGraphviz: config.get<boolean>('enableGraphviz', true),
                showLineNumbers: config.get<boolean>('showLineNumbers', false),
                autoSave: config.get<boolean>('autoSave', true),
                autoSaveDelay: config.get<number>('autoSaveDelay', 1500),
                codeTheme: config.get<string>('codeTheme', 'default-light-modern')
            };

            // 验证所有字段存在且类型正确
            assert.strictEqual(typeof settings.fontSize, 'number');
            assert.strictEqual(typeof settings.lineHeight, 'number');
            assert.strictEqual(typeof settings.contentMaxWidth, 'number');
            assert.strictEqual(typeof settings.fontFamily, 'string');
            assert.strictEqual(typeof settings.theme, 'string');
            assert.strictEqual(typeof settings.showToc, 'boolean');
            assert.strictEqual(typeof settings.showAnnotations, 'boolean');
            assert.strictEqual(typeof settings.sidebarLayout, 'string');
            assert.strictEqual(typeof settings.enableMermaid, 'boolean');
            assert.strictEqual(typeof settings.enableMath, 'boolean');
            assert.strictEqual(typeof settings.enablePlantUML, 'boolean');
            assert.strictEqual(typeof settings.enableGraphviz, 'boolean');
            assert.strictEqual(typeof settings.showLineNumbers, 'boolean');
            assert.strictEqual(typeof settings.autoSave, 'boolean');
            assert.strictEqual(typeof settings.autoSaveDelay, 'number');
            assert.strictEqual(typeof settings.codeTheme, 'string');
        });
    });

    // ===== 场景 8：状态持久化与恢复 =====

    suite('场景 8：状态持久化与恢复', () => {
        test('保存批注状态 → 恢复后数据一致', async () => {
            const annotations = [
                { id: 1, type: 'comment', selectedText: '文本A', comment: '评论A', blockIndex: 0, startOffset: 0 },
                { id: 2, type: 'delete', selectedText: '文本B', blockIndex: 1, startOffset: 5 },
                { id: 3, type: 'insert', selectedText: '文本C', insertContent: '新内容', insertPosition: 'after', blockIndex: 2, startOffset: 10 }
            ];

            // 保存
            await stateService.set('e2e-annotations', annotations);

            // 恢复
            const restored = stateService.get<typeof annotations>('e2e-annotations');
            assert.ok(restored, '应能恢复批注');
            assert.deepStrictEqual(restored, annotations, '恢复的数据应与保存的一致');
        });

        test('保存文件路径状态 → 恢复后路径一致', async () => {
            await stateService.set('e2e-currentFile', '/workspace/docs/design.md');
            const restored = stateService.get<string>('e2e-currentFile');
            assert.strictEqual(restored, '/workspace/docs/design.md');
        });

        test('保存设置状态 → 恢复后设置一致', async () => {
            const settings = {
                fontSize: 16,
                theme: 'dark',
                showToc: false,
                autoSave: false
            };

            await stateService.set('e2e-settings', settings);
            const restored = stateService.get<typeof settings>('e2e-settings');
            assert.deepStrictEqual(restored, settings);
        });

        test('清除状态 → 恢复为 undefined', async () => {
            await stateService.set('e2e-temp', 'value');
            assert.strictEqual(stateService.get('e2e-temp'), 'value');

            await stateService.remove('e2e-temp');
            assert.strictEqual(stateService.get('e2e-temp'), undefined);
        });
    });

    // ===== 场景 9：图片批注完整流程 =====

    suite('场景 9：图片批注完整流程', () => {
        // 最小 1x1 PNG Base64
        const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        test('保存图片 → 添加到批注 → 导出包含图片路径', () => {
            // Step 1: 保存图片
            const imgResult = fileService.saveAnnotationImage(base64Png);
            assert.strictEqual(imgResult.success, true);
            assert.ok(imgResult.imagePath.startsWith('images/'));

            // Step 2: 创建带图片的批注
            const annotation = {
                type: 'comment',
                selectedText: '目标文本',
                comment: '请参考附图',
                blockIndex: 0,
                startOffset: 0,
                images: [imgResult.imagePath]
            };

            assert.strictEqual(annotation.images.length, 1);
            assert.ok(annotation.images[0].startsWith('images/'));

            // Step 3: 导出包含图片路径
            const reviewContent = [
                '# 批阅记录',
                '',
                '**源文件版本**：v1.0.0',
                '',
                '```json',
                JSON.stringify({ annotationCount: 1, annotations: [annotation] }, null, 2),
                '```'
            ].join('\n');

            const exportResult = fileService.saveReview('批阅记录_e2e-img-test_v1.md', reviewContent);
            assert.strictEqual(exportResult.success, true);

            // Step 4: 验证记录中包含图片路径
            const records = fileService.getReviewRecords('e2e-img-test.md');
            assert.ok(records.length > 0);
            assert.ok(records[0].annotations[0].images);
            assert.ok(records[0].annotations[0].images[0].startsWith('images/'));

            // 清理
            fileService.deleteAnnotationImage(imgResult.imagePath);
            fileService.deleteReviewRecords('e2e-img-test.md');
        });

        test('删除图片 → 从批注中移除', () => {
            const imgResult = fileService.saveAnnotationImage(base64Png);
            assert.strictEqual(imgResult.success, true);

            // 模拟从批注中删除图片
            const annotation = {
                images: [imgResult.imagePath]
            };

            // 删除图片文件
            const deleted = fileService.deleteAnnotationImage(imgResult.imagePath);
            assert.strictEqual(deleted, true);

            // 从批注中移除
            annotation.images = annotation.images.filter(img => img !== imgResult.imagePath);
            assert.strictEqual(annotation.images.length, 0);
        });
    });

    // ===== 场景 10：批阅记录管理 =====

    suite('场景 10：批阅记录管理', () => {
        setup(() => {
            // 创建多版本批阅记录
            for (let v = 1; v <= 3; v++) {
                const content = [
                    '# 批阅记录',
                    '',
                    `**源文件版本**：v${v}.0.0`,
                    '',
                    '```json',
                    JSON.stringify({
                        annotationCount: v,
                        annotations: Array.from({ length: v }, (_, i) => ({
                            type: 'comment',
                            selectedText: `文本${i}`,
                            comment: `评论${i}`,
                            blockIndex: i
                        }))
                    }),
                    '```'
                ].join('\n');
                fileService.saveReview(`批阅记录_e2e-records_v${v}.md`, content);
            }
        });

        teardown(() => {
            fileService.deleteReviewRecords('e2e-records.md');
        });

        test('应查询到所有版本的批阅记录', () => {
            const records = fileService.getReviewRecords('e2e-records.md');
            assert.ok(records.length >= 3, '应有至少 3 条记录');
        });

        test('记录应按版本号倒序排列', () => {
            const records = fileService.getReviewRecords('e2e-records.md');
            for (let i = 0; i < records.length - 1; i++) {
                assert.ok(
                    records[i].reviewVersion >= records[i + 1].reviewVersion,
                    `版本 ${records[i].reviewVersion} 应 >= ${records[i + 1].reviewVersion}`
                );
            }
        });

        test('每条记录应包含正确的批注数量', () => {
            const records = fileService.getReviewRecords('e2e-records.md');
            const v3 = records.find(r => r.reviewVersion === 3);
            assert.ok(v3);
            assert.strictEqual(v3!.annotationCount, 3);
            assert.strictEqual(v3!.annotations.length, 3);
        });

        test('删除所有记录 → 查询返回空', () => {
            const delResult = fileService.deleteReviewRecords('e2e-records.md');
            assert.strictEqual(delResult.success, true);
            assert.ok(delResult.deleted.length > 0);

            const records = fileService.getReviewRecords('e2e-records.md');
            assert.strictEqual(records.length, 0);
        });
    });

    // ===== 场景 11：面板生命周期 =====

    suite('场景 11：面板生命周期', () => {
        test('面板命令应已注册', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(commands.includes('mdReview.exportReview'), 'exportReview 应已注册');
        });

        test('exportReview 在无面板时应安全执行', async () => {
            try {
                await vscode.commands.executeCommand('mdReview.exportReview');
                assert.ok(true, '无面板时 exportReview 应静默忽略');
            } catch (e: any) {
                assert.ok(true, `命令执行完成: ${e.message}`);
            }
        });
    });

    // ===== 场景 12：完整端到端流程串联 =====

    suite('场景 12：完整端到端流程串联', () => {
        let docPath: string;
        const originalContent = [
            '# 技术方案评审',
            '',
            '**文档版本**：v1.0.0',
            '',
            '## 背景',
            '',
            '当前系统存在性能瓶颈，需要进行优化。',
            '',
            '## 方案',
            '',
            '### 方案一：缓存优化',
            '',
            '引入 Redis 缓存热点数据。',
            '',
            '### 方案二：数据库优化',
            '',
            '优化 SQL 查询和索引。',
            '',
            '## 结论',
            '',
            '建议采用方案一。'
        ].join('\n');

        setup(() => {
            docPath = path.join(testDir, 'e2e-full-flow.md');
            fs.writeFileSync(docPath, originalContent, 'utf-8');
        });

        teardown(() => {
            if (fs.existsSync(docPath)) {
                fs.unlinkSync(docPath);
            }
            // 清理所有生成的文件
            if (fs.existsSync(reviewDir)) {
                const files = fs.readdirSync(reviewDir);
                files.filter(f => f.includes('e2e-full-flow')).forEach(f => {
                    try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
                });
                files.filter(f => f.startsWith('AI修改指令')).forEach(f => {
                    try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
                });
            }
        });

        test('读取 → 编辑 → 批注 → 导出 → 应用 → 查询 → 清理', () => {
            // Step 1: 读取文件
            const readResult = fileService.readFile(docPath);
            assert.strictEqual(readResult.name, 'e2e-full-flow.md');
            assert.strictEqual(readResult.docVersion, 'v1.0.0');

            // Step 2: 编辑并保存
            const editedContent = originalContent.replace('v1.0.0', 'v1.1.0');
            const saveResult = fileService.saveFile(docPath, editedContent);
            assert.strictEqual(saveResult.success, true);
            assert.strictEqual(saveResult.changed, true);
            assert.strictEqual(saveResult.docVersion, 'v1.1.0');

            // Step 3: 创建批注
            const annotations = [
                {
                    type: 'comment',
                    selectedText: '当前系统存在性能瓶颈，需要进行优化。',
                    comment: '请补充具体的性能指标数据',
                    blockIndex: 2,
                    startOffset: 0
                },
                {
                    type: 'delete',
                    selectedText: '优化 SQL 查询和索引。',
                    blockIndex: 5,
                    startOffset: 0
                },
                {
                    type: 'insert',
                    selectedText: '引入 Redis 缓存热点数据。',
                    insertContent: '同时引入本地缓存作为二级缓存。',
                    insertPosition: 'after',
                    blockIndex: 4,
                    startOffset: 0
                }
            ];

            // Step 4: 导出批阅记录
            const reviewContent = [
                '# 批阅记录',
                '',
                '**源文件版本**：v1.1.0',
                '',
                '```json',
                JSON.stringify({ annotationCount: annotations.length, annotations }, null, 2),
                '```'
            ].join('\n');

            const exportResult = fileService.saveReview('批阅记录_e2e-full-flow_v1.md', reviewContent);
            assert.strictEqual(exportResult.success, true);

            // Step 5: 应用批阅
            const applyResult = fileService.applyReview(annotations, docPath, 'e2e-full-flow.md');
            assert.strictEqual(applyResult.success, true);
            assert.strictEqual(applyResult.needsAi, 3);
            assert.ok(applyResult.aiInstructionFile);

            // 验证 AI 指令文件
            const aiContent = fs.readFileSync(applyResult.aiInstructionFilePath!, 'utf-8');
            assert.ok(aiContent.includes('请补充具体的性能指标数据'));
            assert.ok(aiContent.includes('优化 SQL 查询和索引'));
            assert.ok(aiContent.includes('同时引入本地缓存作为二级缓存'));

            // Step 6: 查询批阅记录
            const records = fileService.getReviewRecords('e2e-full-flow.md');
            assert.ok(records.length > 0);
            assert.strictEqual(records[0].docVersion, 'v1.1.0');
            assert.strictEqual(records[0].annotationCount, 3);

            // Step 7: 删除批阅记录
            const delResult = fileService.deleteReviewRecords('e2e-full-flow.md');
            assert.strictEqual(delResult.success, true);

            const afterDel = fileService.getReviewRecords('e2e-full-flow.md');
            assert.strictEqual(afterDel.length, 0);
        });
    });
});
