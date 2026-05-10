import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../../src/fileService';
import { StateService } from '../../src/stateService';

/**
 * 消息通信集成测试
 *
 * 测试 Extension Host ↔ Webview 之间的消息协议正确性。
 * 由于无法直接操作 Webview DOM，这里通过模拟消息处理逻辑来验证：
 * 1. 消息路由：各类型消息是否被正确分发
 * 2. 请求-响应配对：requestId 是否正确传递
 * 3. 错误处理：异常情况下的消息响应
 * 4. 设置同步：配置变更的消息流
 */
suite('Message Communication Test Suite — 消息通信集成', () => {
    let fileService: FileService;
    let stateService: StateService;
    let testDir: string;
    let sentMessages: any[];

    /**
     * 模拟 ReviewPanel 的消息处理逻辑
     * 将 _handleMessage 的核心逻辑提取出来，用 sentMessages 收集响应
     */
    async function handleMessage(message: any) {
        const { type, payload, requestId } = message;

        switch (type) {
            case 'readFile': {
                try {
                    const data = fileService.readFile(payload.filePath);
                    sentMessages.push({ type: 'fileContent', payload: data, requestId });
                } catch (e: any) {
                    sentMessages.push({ type: 'fileContent', payload: { error: e.message }, requestId });
                }
                break;
            }
            case 'saveFile': {
                try {
                    const result = fileService.saveFile(payload.filePath, payload.content);
                    sentMessages.push({ type: 'fileSaved', payload: { ...result, filePath: payload.filePath }, requestId });
                } catch (e: any) {
                    sentMessages.push({ type: 'fileSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'saveReview': {
                try {
                    const result = fileService.saveReview(payload.fileName, payload.content);
                    sentMessages.push({ type: 'reviewSaved', payload: result, requestId });
                } catch (e: any) {
                    sentMessages.push({ type: 'reviewSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'applyReview': {
                try {
                    const result = fileService.applyReview(payload.annotations, payload.sourceFile, payload.fileName);
                    sentMessages.push({ type: 'applyResult', payload: result, requestId });
                } catch (e: any) {
                    sentMessages.push({ type: 'applyResult', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'getState': {
                const value = stateService.get(payload.key);
                sentMessages.push({ type: 'stateValue', payload: { key: payload.key, value }, requestId });
                break;
            }
            case 'setState': {
                await stateService.set(payload.key, payload.value);
                break;
            }
            case 'saveAnnotationImage': {
                try {
                    const result = fileService.saveAnnotationImage(payload.base64Data);
                    sentMessages.push({ type: 'annotationImageSaved', payload: result, requestId });
                } catch (e: any) {
                    sentMessages.push({ type: 'annotationImageSaved', payload: { success: false, error: e.message }, requestId });
                }
                break;
            }
            case 'deleteAnnotationImage': {
                const deleted = fileService.deleteAnnotationImage(payload.imagePath);
                sentMessages.push({ type: 'annotationImageDeleted', payload: { success: deleted }, requestId });
                break;
            }
            case 'getReviewRecords': {
                const records = fileService.getReviewRecords(payload.fileName);
                sentMessages.push({ type: 'reviewRecords', payload: { records }, requestId });
                break;
            }
            case 'deleteReviewRecords': {
                const delResult = fileService.deleteReviewRecords(payload.fileName);
                sentMessages.push({ type: 'deleteReviewRecordsResult', payload: delResult, requestId });
                break;
            }
            case 'getSettings': {
                const config = vscode.workspace.getConfiguration('mdReview');
                const settings = {
                    fontSize: config.get<number>('fontSize', 18),
                    lineHeight: config.get<number>('lineHeight', 1.8),
                    contentMaxWidth: config.get<number>('contentMaxWidth', 1200),
                    theme: config.get<string>('theme', 'light'),
                    showToc: config.get<boolean>('showToc', true),
                    showAnnotations: config.get<boolean>('showAnnotations', true),
                    autoSave: config.get<boolean>('autoSave', true),
                    autoSaveDelay: config.get<number>('autoSaveDelay', 1500),
                    codeTheme: config.get<string>('codeTheme', 'default-dark-modern')
                };
                sentMessages.push({ type: 'settingsData', payload: settings, requestId });
                break;
            }
        }
    }

    // ===== 环境准备 =====

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
        testDir = path.join(__dirname, '..', '..', '..', '.test-msg-comm');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    setup(() => {
        fileService = new FileService();
        sentMessages = [];

        const mockState = new Map<string, any>();
        const mockContext = {
            workspaceState: {
                get: <T>(key: string): T | undefined => mockState.get(key) as T | undefined,
                update: async (key: string, value: any) => {
                    if (value === undefined) { mockState.delete(key); } else { mockState.set(key, value); }
                }
            }
        } as any as vscode.ExtensionContext;
        stateService = new StateService(mockContext);
    });

    suiteTeardown(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // ===== 文件加载流程 =====

    suite('文件加载流程', () => {
        test('readFile 成功 → 返回 fileContent 消息', async () => {
            const testFile = path.join(testDir, 'msg-read.md');
            fs.writeFileSync(testFile, '# 测试\n\n内容', 'utf-8');

            await handleMessage({
                type: 'readFile',
                payload: { filePath: testFile },
                requestId: 'req_001'
            });

            assert.strictEqual(sentMessages.length, 1);
            assert.strictEqual(sentMessages[0].type, 'fileContent');
            assert.strictEqual(sentMessages[0].requestId, 'req_001');
            assert.strictEqual(sentMessages[0].payload.name, 'msg-read.md');
            assert.strictEqual(sentMessages[0].payload.content, '# 测试\n\n内容');

            fs.unlinkSync(testFile);
        });

        test('readFile 文件不存在 → 返回 error 消息', async () => {
            await handleMessage({
                type: 'readFile',
                payload: { filePath: path.join(testDir, 'nonexistent.md') },
                requestId: 'req_002'
            });

            assert.strictEqual(sentMessages.length, 1);
            assert.strictEqual(sentMessages[0].type, 'fileContent');
            assert.strictEqual(sentMessages[0].requestId, 'req_002');
            assert.ok(sentMessages[0].payload.error, '应包含错误信息');
            assert.ok(sentMessages[0].payload.error.includes('文件不存在'), '错误信息应提示文件不存在');
        });
    });

    // ===== 批注持久化流程 =====

    suite('批注持久化流程', () => {
        test('setState → getState → 数据一致', async () => {
            const testData = {
                annotations: [
                    { id: 1, type: 'comment', selectedText: 'a', comment: 'b' }
                ],
                nextId: 2
            };

            // 发送 setState
            await handleMessage({
                type: 'setState',
                payload: { key: 'md_review_data', value: testData }
            });

            // 发送 getState
            await handleMessage({
                type: 'getState',
                payload: { key: 'md_review_data' },
                requestId: 'req_state_001'
            });

            assert.strictEqual(sentMessages.length, 1); // setState 不发送响应
            assert.strictEqual(sentMessages[0].type, 'stateValue');
            assert.strictEqual(sentMessages[0].requestId, 'req_state_001');
            assert.deepStrictEqual(sentMessages[0].payload.value, testData);
        });

        test('getState 键不存在 → 返回 undefined', async () => {
            await handleMessage({
                type: 'getState',
                payload: { key: 'nonexistent_key' },
                requestId: 'req_state_002'
            });

            assert.strictEqual(sentMessages[0].payload.value, undefined);
        });
    });

    // ===== 导出流程 =====

    suite('导出流程', () => {
        test('saveReview 成功 → 返回 reviewSaved', async () => {
            await handleMessage({
                type: 'saveReview',
                payload: { fileName: '批阅记录_msg-test_v1.md', content: '# 批阅记录\n\n内容' },
                requestId: 'req_export_001'
            });

            assert.strictEqual(sentMessages.length, 1);
            assert.strictEqual(sentMessages[0].type, 'reviewSaved');
            assert.strictEqual(sentMessages[0].requestId, 'req_export_001');
            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.ok(sentMessages[0].payload.path, '应返回保存路径');
        });
    });

    // ===== 编辑保存流程 =====

    suite('编辑保存流程', () => {
        test('saveFile 成功 → 返回 fileSaved', async () => {
            const testFile = path.join(testDir, 'msg-save.md');
            fs.writeFileSync(testFile, '# 原始内容', 'utf-8');

            await handleMessage({
                type: 'saveFile',
                payload: { filePath: testFile, content: '# 修改后的内容' },
                requestId: 'req_save_001'
            });

            assert.strictEqual(sentMessages.length, 1);
            assert.strictEqual(sentMessages[0].type, 'fileSaved');
            assert.strictEqual(sentMessages[0].requestId, 'req_save_001');
            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.strictEqual(sentMessages[0].payload.changed, true);
            assert.ok(sentMessages[0].payload.backupFile, '应生成备份文件');

            fs.unlinkSync(testFile);
        });

        test('saveFile 相同内容 → changed: false', async () => {
            const testFile = path.join(testDir, 'msg-save-same.md');
            fs.writeFileSync(testFile, '# 不变的内容', 'utf-8');

            await handleMessage({
                type: 'saveFile',
                payload: { filePath: testFile, content: '# 不变的内容' },
                requestId: 'req_save_002'
            });

            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.strictEqual(sentMessages[0].payload.changed, false);

            fs.unlinkSync(testFile);
        });

        test('saveFile 文件不存在 → 返回错误', async () => {
            await handleMessage({
                type: 'saveFile',
                payload: { filePath: path.join(testDir, 'ghost.md'), content: '内容' },
                requestId: 'req_save_003'
            });

            assert.strictEqual(sentMessages[0].type, 'fileSaved');
            assert.strictEqual(sentMessages[0].payload.success, false);
            assert.ok(sentMessages[0].payload.error, '应包含错误信息');
        });
    });

    // ===== 应用批阅流程 =====

    suite('应用批阅流程', () => {
        test('applyReview 空批注 → 返回无有效指令', async () => {
            await handleMessage({
                type: 'applyReview',
                payload: { annotations: [], sourceFile: '', fileName: 'test.md' },
                requestId: 'req_apply_001'
            });

            assert.strictEqual(sentMessages[0].type, 'applyResult');
            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.strictEqual(sentMessages[0].payload.needsAi, 0);
            assert.strictEqual(sentMessages[0].payload.message, '无有效指令');
        });

        test('applyReview 有效批注 → 返回指令数量', async () => {
            const testFile = path.join(testDir, 'msg-apply.md');
            fs.writeFileSync(testFile, '# 标题\n\n段落内容', 'utf-8');

            await handleMessage({
                type: 'applyReview',
                payload: {
                    annotations: [
                        { type: 'comment', selectedText: '段落内容', comment: '修改', blockIndex: 1, startOffset: 0 }
                    ],
                    sourceFile: testFile,
                    fileName: 'msg-apply.md'
                },
                requestId: 'req_apply_002'
            });

            assert.strictEqual(sentMessages[0].type, 'applyResult');
            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.strictEqual(sentMessages[0].payload.needsAi, 1);

            fs.unlinkSync(testFile);
        });
    });

    // ===== 图片处理流程 =====

    suite('图片处理流程', () => {
        const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        test('saveAnnotationImage 成功 → 返回路径', async () => {
            await handleMessage({
                type: 'saveAnnotationImage',
                payload: { base64Data: base64Png },
                requestId: 'req_img_001'
            });

            assert.strictEqual(sentMessages[0].type, 'annotationImageSaved');
            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.ok(sentMessages[0].payload.imagePath, '应返回图片路径');
        });

        test('saveAnnotationImage 无效数据 → 返回错误', async () => {
            await handleMessage({
                type: 'saveAnnotationImage',
                payload: { base64Data: 'invalid-data' },
                requestId: 'req_img_002'
            });

            assert.strictEqual(sentMessages[0].type, 'annotationImageSaved');
            assert.strictEqual(sentMessages[0].payload.success, false);
            assert.ok(sentMessages[0].payload.error, '应包含错误信息');
        });

        test('deleteAnnotationImage 不存在 → success: false', async () => {
            await handleMessage({
                type: 'deleteAnnotationImage',
                payload: { imagePath: 'images/nonexistent.png' },
                requestId: 'req_img_003'
            });

            assert.strictEqual(sentMessages[0].type, 'annotationImageDeleted');
            assert.strictEqual(sentMessages[0].payload.success, false);
        });
    });

    // ===== 设置同步流程 =====

    suite('设置同步流程', () => {
        test('getSettings → 返回所有配置项', async () => {
            await handleMessage({
                type: 'getSettings',
                payload: {},
                requestId: 'req_settings_001'
            });

            assert.strictEqual(sentMessages[0].type, 'settingsData');
            assert.strictEqual(sentMessages[0].requestId, 'req_settings_001');

            const settings = sentMessages[0].payload;
            assert.strictEqual(typeof settings.fontSize, 'number');
            assert.strictEqual(typeof settings.lineHeight, 'number');
            assert.strictEqual(typeof settings.theme, 'string');
            assert.strictEqual(typeof settings.showToc, 'boolean');
            assert.strictEqual(typeof settings.autoSave, 'boolean');
            assert.strictEqual(typeof settings.codeTheme, 'string');
        });
    });

    // ===== 批阅记录管理流程 =====

    suite('批阅记录管理流程', () => {
        test('getReviewRecords → 返回记录数组', async () => {
            await handleMessage({
                type: 'getReviewRecords',
                payload: { fileName: 'nonexistent.md' },
                requestId: 'req_records_001'
            });

            assert.strictEqual(sentMessages[0].type, 'reviewRecords');
            assert.ok(Array.isArray(sentMessages[0].payload.records), '应返回数组');
        });

        test('deleteReviewRecords → 返回删除结果', async () => {
            await handleMessage({
                type: 'deleteReviewRecords',
                payload: { fileName: 'nonexistent.md' },
                requestId: 'req_records_002'
            });

            assert.strictEqual(sentMessages[0].type, 'deleteReviewRecordsResult');
            assert.strictEqual(sentMessages[0].payload.success, true);
            assert.ok(Array.isArray(sentMessages[0].payload.deleted));
        });
    });

    // ===== requestId 传递验证 =====

    suite('requestId 传递验证', () => {
        test('所有响应消息应正确携带 requestId', async () => {
            const testFile = path.join(testDir, 'msg-reqid.md');
            fs.writeFileSync(testFile, '# Test', 'utf-8');

            const messages = [
                { type: 'readFile', payload: { filePath: testFile }, requestId: 'id_001' },
                { type: 'getState', payload: { key: 'test' }, requestId: 'id_002' },
                { type: 'getReviewRecords', payload: { fileName: 'test.md' }, requestId: 'id_003' },
                { type: 'getSettings', payload: {}, requestId: 'id_004' }
            ];

            for (const msg of messages) {
                await handleMessage(msg);
            }

            assert.strictEqual(sentMessages.length, 4);
            assert.strictEqual(sentMessages[0].requestId, 'id_001');
            assert.strictEqual(sentMessages[1].requestId, 'id_002');
            assert.strictEqual(sentMessages[2].requestId, 'id_003');
            assert.strictEqual(sentMessages[3].requestId, 'id_004');

            fs.unlinkSync(testFile);
        });

        test('setState 不发送响应消息', async () => {
            await handleMessage({
                type: 'setState',
                payload: { key: 'test', value: 'data' },
                requestId: 'id_no_response'
            });

            assert.strictEqual(sentMessages.length, 0, 'setState 不应发送响应');
        });
    });

    // ===== 消息类型映射验证 =====

    suite('消息类型映射', () => {
        test('请求-响应类型应正确配对', async () => {
            const testFile = path.join(testDir, 'msg-mapping.md');
            fs.writeFileSync(testFile, '# Mapping Test', 'utf-8');

            const typeMap: Record<string, string> = {
                'readFile': 'fileContent',
                'saveReview': 'reviewSaved',
                'getState': 'stateValue',
                'getReviewRecords': 'reviewRecords',
                'deleteReviewRecords': 'deleteReviewRecordsResult',
                'getSettings': 'settingsData'
            };

            const payloads: Record<string, any> = {
                'readFile': { filePath: testFile },
                'saveReview': { fileName: '批阅记录_mapping_v1.md', content: '# Test' },
                'getState': { key: 'test' },
                'getReviewRecords': { fileName: 'test.md' },
                'deleteReviewRecords': { fileName: 'nonexistent.md' },
                'getSettings': {}
            };

            for (const [reqType, resType] of Object.entries(typeMap)) {
                sentMessages = [];
                await handleMessage({
                    type: reqType,
                    payload: payloads[reqType],
                    requestId: `map_${reqType}`
                });

                assert.strictEqual(sentMessages.length, 1, `${reqType} 应产生一条响应`);
                assert.strictEqual(sentMessages[0].type, resType, `${reqType} → ${resType}`);
            }

            fs.unlinkSync(testFile);
        });
    });

    // ===== 完整通信流程 =====

    suite('完整通信流程', () => {
        test('读取 → 保存 → 导出 → 查询 的完整消息链', async () => {
            const testFile = path.join(testDir, 'msg-chain.md');
            fs.writeFileSync(testFile, '# 原始内容\n\n段落', 'utf-8');

            // Step 1: 读取文件
            await handleMessage({
                type: 'readFile',
                payload: { filePath: testFile },
                requestId: 'chain_001'
            });
            assert.strictEqual(sentMessages[0].type, 'fileContent');
            assert.strictEqual(sentMessages[0].payload.name, 'msg-chain.md');

            // Step 2: 保存编辑
            await handleMessage({
                type: 'saveFile',
                payload: { filePath: testFile, content: '# 修改后\n\n新段落' },
                requestId: 'chain_002'
            });
            assert.strictEqual(sentMessages[1].type, 'fileSaved');
            assert.strictEqual(sentMessages[1].payload.success, true);
            assert.strictEqual(sentMessages[1].payload.changed, true);

            // Step 3: 保存批阅记录
            await handleMessage({
                type: 'saveReview',
                payload: {
                    fileName: '批阅记录_msg-chain_v1.md',
                    content: '# 批阅记录\n\n```json\n{"annotationCount":1}\n```'
                },
                requestId: 'chain_003'
            });
            assert.strictEqual(sentMessages[2].type, 'reviewSaved');
            assert.strictEqual(sentMessages[2].payload.success, true);

            // Step 4: 查询批阅记录
            await handleMessage({
                type: 'getReviewRecords',
                payload: { fileName: 'msg-chain.md' },
                requestId: 'chain_004'
            });
            assert.strictEqual(sentMessages[3].type, 'reviewRecords');
            assert.ok(sentMessages[3].payload.records.length > 0, '应有批阅记录');

            // Step 5: 持久化状态
            await handleMessage({
                type: 'setState',
                payload: { key: 'chain_state', value: { step: 'done' } }
            });
            await handleMessage({
                type: 'getState',
                payload: { key: 'chain_state' },
                requestId: 'chain_005'
            });
            assert.strictEqual(sentMessages[4].payload.value.step, 'done');

            fs.unlinkSync(testFile);
        });
    });
});
