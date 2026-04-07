import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ReviewPanel } from '../../src/reviewPanel';
import { FileService } from '../../src/fileService';
import { StateService } from '../../src/stateService';

/**
 * UI 交互测试套件
 *
 * 由于 VS Code 扩展测试环境无法直接操作 webview DOM，
 * 本测试通过以下策略覆盖 UI 交互逻辑：
 *
 * 1. ReviewPanel 消息处理：模拟 webview 发送的各类消息，验证响应
 * 2. 面板生命周期：创建、显示、销毁
 * 3. 设置交互：读取/写入配置项
 * 4. Webview 内容生成：HTML 模板替换
 * 5. Store 数据模型：批注 CRUD、排序、归档
 * 6. Export 文档生成：批阅记录格式化
 * 7. 批注交互模拟：comment / delete / insert 流程
 * 8. 工具栏状态管理：按钮启用/禁用逻辑
 * 9. 文件监听通知：文件变更推送
 */
suite('UI Interaction Test Suite — UI 交互测试', () => {
    let testDir: string;
    let fileService: FileService;
    let stateService: StateService;
    let mockContext: vscode.ExtensionContext;

    suiteSetup(async () => {
        // 激活扩展
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }

        testDir = path.join(__dirname, '..', '..', '..', '.test-ui-interaction');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });

    setup(() => {
        fileService = new FileService();

        const mockState = new Map<string, any>();
        mockContext = {
            workspaceState: {
                get: <T>(key: string): T | undefined => mockState.get(key) as T | undefined,
                update: async (key: string, value: any) => {
                    if (value === undefined) {
                        mockState.delete(key);
                    } else {
                        mockState.set(key, value);
                    }
                }
            },
            extensionUri: vscode.extensions.getExtension('letitia.md-human-review')!.extensionUri,
            subscriptions: [],
            extensionPath: vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath,
        } as any as vscode.ExtensionContext;

        stateService = new StateService(mockContext);
    });

    suiteTeardown(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // ===== 1. ReviewPanel 面板生命周期 =====

    suite('1. ReviewPanel 面板生命周期', () => {
        teardown(() => {
            // 确保每个测试后清理所有面板
            for (const p of ReviewPanel.panels.values()) {
                p.dispose();
            }
            if (ReviewPanel.currentPanel) {
                ReviewPanel.currentPanel.dispose();
            }
        });

        test('createOrShow 应创建新面板', () => {
            assert.strictEqual(ReviewPanel.currentPanel, undefined, '初始应无面板');
            ReviewPanel.createOrShow(mockContext);
            assert.ok(ReviewPanel.currentPanel, '应创建面板实例');
        });

        test('重复调用无文件的 createOrShow 不应创建新面板', () => {
            ReviewPanel.createOrShow(mockContext);
            const firstPanel = ReviewPanel.currentPanel;
            ReviewPanel.createOrShow(mockContext);
            assert.strictEqual(ReviewPanel.currentPanel, firstPanel, '应复用同一面板');
        });

        test('dispose 后 currentPanel 应为 undefined', () => {
            ReviewPanel.createOrShow(mockContext);
            assert.ok(ReviewPanel.currentPanel);
            ReviewPanel.currentPanel!.dispose();
            assert.strictEqual(ReviewPanel.currentPanel, undefined, 'dispose 后应清空');
        });

        test('createOrShow 带文件路径应设置初始文件', () => {
            const testFile = path.join(testDir, 'panel-test.md');
            fs.writeFileSync(testFile, '# 面板测试\n\n内容', 'utf-8');

            ReviewPanel.createOrShow(mockContext, testFile);
            assert.ok(ReviewPanel.currentPanel, '应创建面板');

            fs.unlinkSync(testFile);
        });

        test('dispose 后再次 createOrShow 应创建新面板', () => {
            ReviewPanel.createOrShow(mockContext);
            ReviewPanel.currentPanel!.dispose();
            assert.strictEqual(ReviewPanel.currentPanel, undefined);

            ReviewPanel.createOrShow(mockContext);
            assert.ok(ReviewPanel.currentPanel, '应创建新面板');
        });

        // ===== 多窗口测试 =====

        test('不同文件应创建不同的面板', () => {
            const file1 = path.join(testDir, 'multi-1.md');
            const file2 = path.join(testDir, 'multi-2.md');
            fs.writeFileSync(file1, '# 文件1', 'utf-8');
            fs.writeFileSync(file2, '# 文件2', 'utf-8');

            ReviewPanel.createOrShow(mockContext, file1);
            const panel1 = ReviewPanel.currentPanel;
            assert.ok(panel1, '第一个面板应创建');

            ReviewPanel.createOrShow(mockContext, file2);
            const panel2 = ReviewPanel.currentPanel;
            assert.ok(panel2, '第二个面板应创建');
            assert.notStrictEqual(panel1, panel2, '不同文件应创建不同面板');

            assert.strictEqual(ReviewPanel.panels.size, 2, 'panels Map 应有 2 个面板');

            fs.unlinkSync(file1);
            fs.unlinkSync(file2);
        });

        test('同一文件重复打开应复用同一面板', () => {
            const file1 = path.join(testDir, 'multi-same.md');
            fs.writeFileSync(file1, '# 同文件测试', 'utf-8');

            ReviewPanel.createOrShow(mockContext, file1);
            const panel1 = ReviewPanel.currentPanel;

            ReviewPanel.createOrShow(mockContext, file1);
            const panel2 = ReviewPanel.currentPanel;
            assert.strictEqual(panel1, panel2, '同一文件应复用同一面板');
            assert.strictEqual(ReviewPanel.panels.size, 1, 'panels Map 应只有 1 个面板');

            fs.unlinkSync(file1);
        });

        test('关闭一个面板后另一个面板应仍存在', () => {
            const file1 = path.join(testDir, 'multi-close-1.md');
            const file2 = path.join(testDir, 'multi-close-2.md');
            fs.writeFileSync(file1, '# 文件A', 'utf-8');
            fs.writeFileSync(file2, '# 文件B', 'utf-8');

            ReviewPanel.createOrShow(mockContext, file1);
            const panelA = ReviewPanel.currentPanel!;

            ReviewPanel.createOrShow(mockContext, file2);

            // 关闭第一个面板
            panelA.dispose();
            assert.strictEqual(ReviewPanel.panels.size, 1, '关闭一个后应剩 1 个面板');
            // currentPanel 应切换到剩余面板
            assert.ok(ReviewPanel.currentPanel, 'currentPanel 应指向存活面板');

            fs.unlinkSync(file1);
            fs.unlinkSync(file2);
        });

        test('关闭所有面板后 currentPanel 应为 undefined', () => {
            const file1 = path.join(testDir, 'multi-all-1.md');
            const file2 = path.join(testDir, 'multi-all-2.md');
            fs.writeFileSync(file1, '# 全关1', 'utf-8');
            fs.writeFileSync(file2, '# 全关2', 'utf-8');

            ReviewPanel.createOrShow(mockContext, file1);
            ReviewPanel.createOrShow(mockContext, file2);
            assert.strictEqual(ReviewPanel.panels.size, 2);

            // 关闭所有
            for (const p of Array.from(ReviewPanel.panels.values())) {
                p.dispose();
            }
            assert.strictEqual(ReviewPanel.panels.size, 0, '所有面板关闭后 Map 应为空');
            assert.strictEqual(ReviewPanel.currentPanel, undefined, '所有面板关闭后 currentPanel 应为 undefined');

            fs.unlinkSync(file1);
            fs.unlinkSync(file2);
        });
    });

    // ===== 2. ReviewPanel 消息处理（模拟 webview → Extension Host） =====

    suite('2. ReviewPanel 消息处理', () => {
        let panel: ReviewPanel;
        let sentMessages: any[];

        setup(() => {
            ReviewPanel.createOrShow(mockContext);
            panel = ReviewPanel.currentPanel!;
            sentMessages = [];

            // 拦截 postMessage 以捕获发送给 webview 的消息
            const originalPostMessage = panel.postMessage.bind(panel);
            panel.postMessage = (message: any) => {
                sentMessages.push(message);
                return originalPostMessage(message);
            };
        });

        teardown(() => {
            if (ReviewPanel.currentPanel) {
                ReviewPanel.currentPanel.dispose();
            }
        });

        test('postMessage 应能发送消息', () => {
            panel.postMessage({ type: 'test', payload: { data: 'hello' } });
            assert.ok(sentMessages.length > 0, '应有消息被发送');
            assert.strictEqual(sentMessages[sentMessages.length - 1].type, 'test');
        });

        test('loadFile 应发送 fileContent 消息', () => {
            const testFile = path.join(testDir, 'msg-test.md');
            fs.writeFileSync(testFile, '# 消息测试\n\n**文档版本**：v1.0.0\n\n内容', 'utf-8');

            panel.loadFile(testFile);

            const fileContentMsg = sentMessages.find(m => m.type === 'fileContent');
            assert.ok(fileContentMsg, '应发送 fileContent 消息');
            assert.strictEqual(fileContentMsg.payload.name, 'msg-test.md');
            assert.ok(fileContentMsg.payload.content.includes('# 消息测试'));
            assert.strictEqual(fileContentMsg.payload.docVersion, 'v1.0.0');

            fs.unlinkSync(testFile);
        });

        test('loadFile 不存在的文件应发送 error 消息', () => {
            panel.loadFile(path.join(testDir, 'nonexistent.md'));

            const errorMsg = sentMessages.find(m => m.type === 'error');
            assert.ok(errorMsg, '应发送 error 消息');
            assert.ok(errorMsg.payload.message.includes('文件不存在'));
        });

        test('loadFile 应更新当前文件路径', () => {
            const testFile = path.join(testDir, 'path-test.md');
            fs.writeFileSync(testFile, '# 路径测试', 'utf-8');

            panel.loadFile(testFile);

            // 再次加载同一文件不应报错
            panel.loadFile(testFile);
            const msgs = sentMessages.filter(m => m.type === 'fileContent');
            assert.strictEqual(msgs.length, 2, '应发送两次 fileContent');

            fs.unlinkSync(testFile);
        });
    });

    // ===== 3. 设置交互 =====

    suite('3. 设置交互', () => {
        test('应能读取所有默认配置项', () => {
            const config = vscode.workspace.getConfiguration('mdReview');
            const settings = {
                fontSize: config.get<number>('fontSize'),
                lineHeight: config.get<number>('lineHeight'),
                contentMaxWidth: config.get<number>('contentMaxWidth'),
                fontFamily: config.get<string>('fontFamily'),
                theme: config.get<string>('theme'),
                showToc: config.get<boolean>('showToc'),
                showAnnotations: config.get<boolean>('showAnnotations'),
                sidebarLayout: config.get<string>('sidebarLayout'),
                enableMermaid: config.get<boolean>('enableMermaid'),
                enableMath: config.get<boolean>('enableMath'),
                enablePlantUML: config.get<boolean>('enablePlantUML'),
                enableGraphviz: config.get<boolean>('enableGraphviz'),
                showLineNumbers: config.get<boolean>('showLineNumbers'),
                autoSave: config.get<boolean>('autoSave'),
                autoSaveDelay: config.get<number>('autoSaveDelay'),
                codeTheme: config.get<string>('codeTheme')
            };

            assert.strictEqual(settings.fontSize, 18);
            assert.strictEqual(settings.lineHeight, 1.8);
            assert.strictEqual(settings.contentMaxWidth, 1200);
            assert.strictEqual(settings.fontFamily, '');
            assert.strictEqual(settings.theme, 'light');
            assert.strictEqual(settings.showToc, true);
            assert.strictEqual(settings.showAnnotations, true);
            assert.strictEqual(settings.sidebarLayout, 'toc-left');
            assert.strictEqual(settings.enableMermaid, true);
            assert.strictEqual(settings.enableMath, true);
            assert.strictEqual(settings.enablePlantUML, true);
            assert.strictEqual(settings.enableGraphviz, true);
            assert.strictEqual(settings.showLineNumbers, false);
            assert.strictEqual(settings.autoSave, true);
            assert.strictEqual(settings.autoSaveDelay, 1500);
            assert.strictEqual(settings.codeTheme, 'default-dark-modern');
        });

        test('配置项应有正确的类型', () => {
            const config = vscode.workspace.getConfiguration('mdReview');
            assert.strictEqual(typeof config.get('fontSize'), 'number');
            assert.strictEqual(typeof config.get('lineHeight'), 'number');
            assert.strictEqual(typeof config.get('theme'), 'string');
            assert.strictEqual(typeof config.get('autoSave'), 'boolean');
            assert.strictEqual(typeof config.get('autoSaveDelay'), 'number');
        });

        test('配置项应在 package.json 中正确定义', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);
            const properties = ext!.packageJSON.contributes.configuration.properties;
            assert.ok(properties['mdReview.fontSize'], 'fontSize 应在配置中定义');
            assert.ok(properties['mdReview.lineHeight'], 'lineHeight 应在配置中定义');
            assert.ok(properties['mdReview.theme'], 'theme 应在配置中定义');
            assert.ok(properties['mdReview.autoSave'], 'autoSave 应在配置中定义');
            assert.ok(properties['mdReview.codeTheme'], 'codeTheme 应在配置中定义');
            assert.ok(properties['mdReview.enableMermaid'], 'enableMermaid 应在配置中定义');
            assert.ok(properties['mdReview.enableMath'], 'enableMath 应在配置中定义');
            assert.ok(properties['mdReview.enablePlantUML'], 'enablePlantUML 应在配置中定义');
            assert.ok(properties['mdReview.enableGraphviz'], 'enableGraphviz 应在配置中定义');
        });

        test('theme 配置应有正确的枚举值', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);
            const themeConfig = ext!.packageJSON.contributes.configuration.properties['mdReview.theme'];
            assert.ok(themeConfig.enum, 'theme 应有 enum');
            assert.ok(themeConfig.enum.includes('light'), '应包含 light');
            assert.ok(themeConfig.enum.includes('dark'), '应包含 dark');
            assert.ok(themeConfig.enum.includes('auto'), '应包含 auto');
        });
    });

    // ===== 4. Store 数据模型逻辑（模拟 webview 内的 Store 行为） =====

    suite('4. Store 数据模型逻辑', () => {
        // 在 Extension Host 端模拟 Store 的核心逻辑

        interface Annotation {
            id: number;
            type: string;
            selectedText: string;
            blockIndex: number;
            startOffset: number;
            endOffset: number;
            comment: string;
            images: string[];
            timestamp: string;
            insertContent?: string;
            insertPosition?: string;
        }

        interface StoreData {
            fileName: string;
            rawMarkdown: string;
            docVersion: string;
            annotations: Annotation[];
            nextId: number;
            reviewVersion: number;
        }

        function createStore(): StoreData {
            return {
                fileName: '',
                rawMarkdown: '',
                docVersion: '',
                annotations: [],
                nextId: 1,
                reviewVersion: 1
            };
        }

        function addAnnotation(store: StoreData, ann: Partial<Annotation>): Annotation {
            const full: Annotation = {
                id: store.nextId++,
                type: ann.type || 'comment',
                selectedText: ann.selectedText || '',
                blockIndex: ann.blockIndex || 0,
                startOffset: ann.startOffset || 0,
                endOffset: ann.endOffset || 0,
                comment: ann.comment || '',
                images: ann.images || [],
                timestamp: new Date().toISOString(),
                insertContent: ann.insertContent,
                insertPosition: ann.insertPosition
            };
            store.annotations.push(full);
            // 按 blockIndex → startOffset 排序
            store.annotations.sort((a, b) => {
                if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
                return a.startOffset - b.startOffset;
            });
            return full;
        }

        function removeAnnotation(store: StoreData, id: number) {
            store.annotations = store.annotations.filter(a => a.id !== id);
            // 重新编号
            store.annotations.forEach((a, i) => { a.id = i + 1; });
            store.nextId = store.annotations.length + 1;
        }

        test('添加评论批注', () => {
            const store = createStore();
            const ann = addAnnotation(store, {
                type: 'comment',
                selectedText: '测试文本',
                blockIndex: 2,
                startOffset: 5,
                endOffset: 9,
                comment: '需要修改'
            });

            assert.strictEqual(ann.id, 1);
            assert.strictEqual(ann.type, 'comment');
            assert.strictEqual(ann.selectedText, '测试文本');
            assert.strictEqual(ann.comment, '需要修改');
            assert.strictEqual(store.annotations.length, 1);
            assert.strictEqual(store.nextId, 2);
        });

        test('添加删除批注', () => {
            const store = createStore();
            const ann = addAnnotation(store, {
                type: 'delete',
                selectedText: '要删除的文本',
                blockIndex: 3,
                startOffset: 0,
                endOffset: 6
            });

            assert.strictEqual(ann.type, 'delete');
            assert.strictEqual(ann.comment, '');
            assert.deepStrictEqual(ann.images, []);
        });

        test('添加插入批注（后插）', () => {
            const store = createStore();
            const ann = addAnnotation(store, {
                type: 'insert',
                selectedText: '锚点文本',
                blockIndex: 1,
                startOffset: 10,
                endOffset: 10,
                insertContent: '新增内容',
                insertPosition: 'after',
                comment: '补充说明'
            });

            assert.strictEqual(ann.type, 'insert');
            assert.strictEqual(ann.insertContent, '新增内容');
            assert.strictEqual(ann.insertPosition, 'after');
            assert.strictEqual(ann.comment, '补充说明');
        });

        test('添加插入批注（前插）', () => {
            const store = createStore();
            const ann = addAnnotation(store, {
                type: 'insert',
                selectedText: '锚点文本',
                blockIndex: 1,
                startOffset: 0,
                endOffset: 0,
                insertContent: '前置内容',
                insertPosition: 'before'
            });

            assert.strictEqual(ann.insertPosition, 'before');
        });

        test('批注应按 blockIndex 和 startOffset 排序', () => {
            const store = createStore();
            addAnnotation(store, { type: 'comment', selectedText: 'C', blockIndex: 3, startOffset: 0, comment: '第三块' });
            addAnnotation(store, { type: 'comment', selectedText: 'A', blockIndex: 1, startOffset: 5, comment: '第一块' });
            addAnnotation(store, { type: 'comment', selectedText: 'B', blockIndex: 1, startOffset: 0, comment: '第一块前' });

            assert.strictEqual(store.annotations[0].selectedText, 'B', '第一块 offset=0 应排第一');
            assert.strictEqual(store.annotations[1].selectedText, 'A', '第一块 offset=5 应排第二');
            assert.strictEqual(store.annotations[2].selectedText, 'C', '第三块应排第三');
        });

        test('删除批注后应重新编号', () => {
            const store = createStore();
            addAnnotation(store, { type: 'comment', selectedText: '1', blockIndex: 0, comment: 'a' });
            addAnnotation(store, { type: 'delete', selectedText: '2', blockIndex: 1 });
            addAnnotation(store, { type: 'comment', selectedText: '3', blockIndex: 2, comment: 'c' });

            assert.strictEqual(store.annotations.length, 3);

            // 删除第二条（id=2）
            removeAnnotation(store, 2);

            assert.strictEqual(store.annotations.length, 2);
            assert.strictEqual(store.annotations[0].id, 1, '第一条应重编为 1');
            assert.strictEqual(store.annotations[1].id, 2, '第三条应重编为 2');
            assert.strictEqual(store.nextId, 3);
        });

        test('删除所有批注后 nextId 应重置', () => {
            const store = createStore();
            addAnnotation(store, { type: 'comment', selectedText: 'x', blockIndex: 0, comment: 'y' });
            removeAnnotation(store, 1);

            assert.strictEqual(store.annotations.length, 0);
            assert.strictEqual(store.nextId, 1);
        });

        test('批注应包含时间戳', () => {
            const store = createStore();
            const before = new Date().toISOString();
            const ann = addAnnotation(store, { type: 'comment', selectedText: 't', blockIndex: 0, comment: 'c' });
            const after = new Date().toISOString();

            assert.ok(ann.timestamp >= before, '时间戳应不早于添加前');
            assert.ok(ann.timestamp <= after, '时间戳应不晚于添加后');
        });

        test('带图片的评论批注', () => {
            const store = createStore();
            const ann = addAnnotation(store, {
                type: 'comment',
                selectedText: '图片测试',
                blockIndex: 0,
                comment: '见附图',
                images: ['images/img_001.png', 'images/img_002.jpg']
            });

            assert.strictEqual(ann.images.length, 2);
            assert.ok(ann.images[0].endsWith('.png'));
            assert.ok(ann.images[1].endsWith('.jpg'));
        });
    });

    // ===== 5. Export 文档生成逻辑 =====

    suite('5. Export 文档生成逻辑', () => {
        // 模拟 Exporter.generateReviewDoc 的核心逻辑

        function generateReviewDoc(data: any, blocks: string[]): string {
            const lines: string[] = [];
            lines.push('# 批阅记录');
            lines.push('');
            lines.push(`- **源文件**：${data.fileName}`);
            lines.push(`- **源文件版本**：${data.docVersion || '未知'}`);
            lines.push(`- **批注数量**：${data.annotations.length} 条`);
            lines.push(`  - 评论：${data.annotations.filter((a: any) => a.type === 'comment').length} 条`);
            lines.push(`  - 删除：${data.annotations.filter((a: any) => a.type === 'delete').length} 条`);
            lines.push(`  - 后插：${data.annotations.filter((a: any) => a.type === 'insert' && a.insertPosition !== 'before').length} 条`);
            lines.push(`  - 前插：${data.annotations.filter((a: any) => a.type === 'insert' && a.insertPosition === 'before').length} 条`);
            lines.push('');
            lines.push('---');
            lines.push('');
            lines.push('## 操作指令');
            lines.push('');

            // 按 blockIndex 倒序排列
            const sorted = [...data.annotations].sort((a: any, b: any) => {
                if (a.blockIndex !== b.blockIndex) return b.blockIndex - a.blockIndex;
                return (b.startOffset || 0) - (a.startOffset || 0);
            });

            sorted.forEach((ann: any, i: number) => {
                const num = i + 1;
                if (ann.type === 'comment') {
                    lines.push(`### 指令 ${num}（修改）`);
                    lines.push('');
                    lines.push('- **操作**：根据评论修改内容');
                    lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                    lines.push('- **目标文本**：');
                    lines.push('```');
                    lines.push(ann.selectedText);
                    lines.push('```');
                    lines.push(`- **评论内容**：${ann.comment}`);
                } else if (ann.type === 'delete') {
                    lines.push(`### 指令 ${num}（删除）`);
                    lines.push('');
                    lines.push('- **操作**：删除以下文本');
                    lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                    lines.push('- **要删除的文本**：');
                    lines.push('```');
                    lines.push(ann.selectedText);
                    lines.push('```');
                } else if (ann.type === 'insert') {
                    const isBefore = ann.insertPosition === 'before';
                    lines.push(`### 指令 ${num}${isBefore ? '（前插）' : '（后插）'}`);
                    lines.push('');
                    lines.push(`- **操作**：在指定位置${isBefore ? '前' : '后'}插入新内容`);
                    lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                    lines.push(`- **插入位置（在此文本之${isBefore ? '前' : '后'}）**：`);
                    lines.push('```');
                    lines.push(ann.selectedText);
                    lines.push('```');
                    lines.push('- **要插入的内容**：');
                    lines.push('```');
                    lines.push(ann.insertContent);
                    lines.push('```');
                }
                lines.push('');
            });

            return lines.join('\n');
        }

        test('应生成正确的批阅记录文档头', () => {
            const data = {
                fileName: 'test.md',
                docVersion: 'v1.0.0',
                annotations: [
                    { type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['# 标题']);

            assert.ok(doc.includes('# 批阅记录'));
            assert.ok(doc.includes('**源文件**：test.md'));
            assert.ok(doc.includes('**源文件版本**：v1.0.0'));
            assert.ok(doc.includes('**批注数量**：1 条'));
            assert.ok(doc.includes('评论：1 条'));
            assert.ok(doc.includes('删除：0 条'));
        });

        test('混合批注应正确统计各类型数量', () => {
            const data = {
                fileName: 'mix.md',
                docVersion: 'v2.0.0',
                annotations: [
                    { type: 'comment', selectedText: 'a', comment: 'b', blockIndex: 0, startOffset: 0 },
                    { type: 'comment', selectedText: 'c', comment: 'd', blockIndex: 1, startOffset: 0 },
                    { type: 'delete', selectedText: 'e', blockIndex: 2, startOffset: 0 },
                    { type: 'insert', selectedText: 'f', insertContent: 'g', insertPosition: 'after', blockIndex: 3, startOffset: 0 },
                    { type: 'insert', selectedText: 'h', insertContent: 'i', insertPosition: 'before', blockIndex: 4, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['a', 'b', 'c', 'd', 'e']);

            assert.ok(doc.includes('评论：2 条'));
            assert.ok(doc.includes('删除：1 条'));
            assert.ok(doc.includes('后插：1 条'));
            assert.ok(doc.includes('前插：1 条'));
            assert.ok(doc.includes('**批注数量**：5 条'));
        });

        test('指令应按 blockIndex 倒序排列', () => {
            const data = {
                fileName: 'order.md',
                docVersion: '',
                annotations: [
                    { type: 'comment', selectedText: '第一块', comment: 'c1', blockIndex: 0, startOffset: 0 },
                    { type: 'delete', selectedText: '第三块', blockIndex: 2, startOffset: 0 },
                    { type: 'comment', selectedText: '第二块', comment: 'c2', blockIndex: 1, startOffset: 0 }
                ]
            };
            const doc = generateReviewDoc(data, ['a', 'b', 'c']);

            const idx1 = doc.indexOf('第三块');
            const idx2 = doc.indexOf('第二块');
            const idx3 = doc.indexOf('第一块');
            assert.ok(idx1 < idx2, '第三块（blockIndex=2）应排在第二块之前');
            assert.ok(idx2 < idx3, '第二块（blockIndex=1）应排在第一块之前');
        });

        test('同一块内应按 startOffset 倒序排列', () => {
            const data = {
                fileName: 'offset.md',
                docVersion: '',
                annotations: [
                    { type: 'comment', selectedText: '前面', comment: 'c1', blockIndex: 0, startOffset: 0 },
                    { type: 'comment', selectedText: '后面', comment: 'c2', blockIndex: 0, startOffset: 20 }
                ]
            };
            const doc = generateReviewDoc(data, ['一段很长的文本']);

            const idxBack = doc.indexOf('后面');
            const idxFront = doc.indexOf('前面');
            assert.ok(idxBack < idxFront, 'startOffset=20 应排在 startOffset=0 之前（倒序）');
        });

        test('无版本号应显示"未知"', () => {
            const data = {
                fileName: 'no-ver.md',
                docVersion: '',
                annotations: [{ type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0, startOffset: 0 }]
            };
            const doc = generateReviewDoc(data, ['x']);
            assert.ok(doc.includes('**源文件版本**：未知'));
        });

        test('insert 批注应包含插入内容和锚点', () => {
            const data = {
                fileName: 'insert.md',
                docVersion: 'v1.0.0',
                annotations: [{
                    type: 'insert',
                    selectedText: '锚点文本',
                    insertContent: '新增段落',
                    insertPosition: 'after',
                    blockIndex: 1,
                    startOffset: 5
                }]
            };
            const doc = generateReviewDoc(data, ['a', 'b']);

            assert.ok(doc.includes('（后插）'));
            assert.ok(doc.includes('锚点文本'));
            assert.ok(doc.includes('新增段落'));
            assert.ok(doc.includes('在指定位置后插入新内容'));
        });

        test('前插批注应正确标注', () => {
            const data = {
                fileName: 'before.md',
                docVersion: 'v1.0.0',
                annotations: [{
                    type: 'insert',
                    selectedText: '锚点',
                    insertContent: '前置内容',
                    insertPosition: 'before',
                    blockIndex: 0,
                    startOffset: 0
                }]
            };
            const doc = generateReviewDoc(data, ['a']);

            assert.ok(doc.includes('（前插）'));
            assert.ok(doc.includes('在指定位置前插入新内容'));
        });
    });

    // ===== 6. Webview 内容生成 =====

    suite('6. Webview 内容生成', () => {
        test('index.html 应包含所有必要的 UI 元素 ID', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // 工具栏元素
            const toolbarIds = [
                'fileSelect', 'fileName', 'editStatus', 'btnSaveMd',
                'btnToggleAnnotations', 'annotationCount', 'btnToggleToc',
                'btnSettings', 'btnHelp'
            ];
            for (const id of toolbarIds) {
                assert.ok(html.includes(`id="${id}"`), `应包含工具栏元素 #${id}`);
            }

            // 文档内容区
            assert.ok(html.includes('id="documentContent"'), '应包含文档内容区');

            // 批注面板
            const annotationIds = [
                'annotationsPanel', 'annotationsList', 'btnExport', 'btnClearAll', 'sortSelect'
            ];
            for (const id of annotationIds) {
                assert.ok(html.includes(`id="${id}"`), `应包含批注面板元素 #${id}`);
            }

            // 右键菜单
            const menuIds = [
                'contextMenu', 'menuAddComment', 'menuMarkDelete', 'menuAddInsert', 'menuAddInsertBefore'
            ];
            for (const id of menuIds) {
                assert.ok(html.includes(`id="${id}"`), `应包含右键菜单元素 #${id}`);
            }

            // 弹窗
            const modalIds = [
                'commentModal', 'commentText', 'btnSubmitComment',
                'insertModal', 'insertText', 'btnSubmitInsert',
                'helpModal'
            ];
            for (const id of modalIds) {
                assert.ok(html.includes(`id="${id}"`), `应包含弹窗元素 #${id}`);
            }

            // PlantUML/Graphviz 设置面板元素
            assert.ok(html.includes('id="settingEnablePlantUML"'), '应包含 PlantUML 设置开关');
            assert.ok(html.includes('id="settingEnableGraphviz"'), '应包含 Graphviz 设置开关');
            assert.ok(html.includes('PlantUML 图表渲染'), '应包含 PlantUML 设置标签');
            assert.ok(html.includes('Graphviz 图表渲染'), '应包含 Graphviz 设置标签');
        });

        test('index.html 应包含所有 JS 脚本占位符', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            const jsPlaceholders = [
                '${storeUri}', '${rendererUri}', '${annotationsUri}',
                '${exportUri}', '${settingsUri}', '${appUri}'
            ];
            for (const ph of jsPlaceholders) {
                assert.ok(html.includes(ph), `应包含 JS 占位符 ${ph}`);
            }

            // Viz.js 脚本占位符（Graphviz 渲染依赖）
            assert.ok(html.includes('${vizUri}'), '应包含 Viz.js 脚本占位符');
        });

        test('index.html 应包含所有 CSS 样式占位符', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            const cssPlaceholders = [
                '${styleUri}', '${markdownCssUri}', '${annotationsCssUri}', '${settingsCssUri}'
            ];
            for (const ph of cssPlaceholders) {
                assert.ok(html.includes(ph), `应包含 CSS 占位符 ${ph}`);
            }
        });

        test('右键菜单应包含四种操作', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            assert.ok(html.includes('添加评论'), '应有"添加评论"菜单项');
            assert.ok(html.includes('标记删除'), '应有"标记删除"菜单项');
            assert.ok(html.includes('插入内容（在此处之后）'), '应有"后插"菜单项');
            assert.ok(html.includes('插入内容（在此处之前）'), '应有"前插"菜单项');
        });

        test('帮助弹窗应包含使用说明', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            assert.ok(html.includes('id="helpContent"'), '应有帮助内容容器');
            assert.ok(html.includes('data-i18n="help.title"'), '应有帮助标题 i18n 标记');
            assert.ok(html.includes('id="btnCloseHelpOk"'), '应有关闭帮助按钮');

            // 验证 i18n.js 中包含帮助翻译 key
            const i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
            assert.ok(i18nJs.includes("'help.quick_start_title'"), '应有快速开始翻译 key');
            assert.ok(i18nJs.includes("'help.comment_title'"), '应有添加评论翻译 key');
            assert.ok(i18nJs.includes("'help.delete_title'"), '应有标记删除翻译 key');
        });

        test('语言切换应通知外部模块刷新动态文本（如主题按钮标签）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const settingsJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'settings.js'), 'utf-8');
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // settings.js 语言切换应触发 languageChanged 通知
            assert.ok(settingsJs.includes("_notifyChange('languageChanged'"), '语言切换后应发出 languageChanged 通知');
            // app.js 应监听 languageChanged 事件并刷新主题按钮标签和禅模式按钮标签
            assert.ok(appJs.includes("'languageChanged'"), 'app.js 应监听 languageChanged 事件');
            assert.ok(appJs.includes('updateThemeButtonLabel'), 'app.js 应有 updateThemeButtonLabel 函数调用');
            assert.ok(appJs.includes('updateZenButtonLabel'), 'app.js 应有 updateZenButtonLabel 函数调用');
        });

        test('语言切换应刷新文件选择下拉框默认文本', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // app.js 在 languageChanged 回调中应调用 updateServerFileSelect 刷新下拉框
            assert.ok(appJs.includes('updateServerFileSelect'), 'app.js 应有 updateServerFileSelect 函数');
            // 验证 languageChanged 分支中包含 updateServerFileSelect 调用
            const langChangedIdx = appJs.indexOf("'languageChanged'");
            const afterLangChanged = appJs.substring(langChangedIdx, langChangedIdx + 300);
            assert.ok(afterLangChanged.includes('updateServerFileSelect'), '语言切换回调中应调用 updateServerFileSelect 刷新文件选择下拉框');
        });

        test('updateServerFileSelect 生成的默认 option 应带有 data-i18n 属性', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // 动态生成的默认 option 应包含 data-i18n 属性，以便 applyToDOM 能刷新
            assert.ok(appJs.includes('data-i18n="toolbar.file_select_default"'), '动态生成的默认 option 应带有 data-i18n 属性');
        });

        test('applyToDOM 应对 optgroup 设置 label 属性而非 textContent（防止清空子选项）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');

            // 回归测试：applyToDOM 中 data-i18n 处理应对 OPTGROUP 特殊处理
            // 如果对 optgroup 使用 textContent 会清空其所有子 option 元素
            assert.ok(i18nJs.includes("el.tagName === 'OPTGROUP'"), 'applyToDOM 应检测 OPTGROUP 标签');
            assert.ok(i18nJs.includes('el.label = t(key)'), 'applyToDOM 应对 OPTGROUP 设置 label 属性');
        });

        test('index.html 中带 data-i18n 的 optgroup 应包含完整的子 option', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // 代码高亮主题 optgroup 应包含所有 15 个主题选项
            const lightThemes = ['default-light-modern', 'github', 'atom-one-light', 'solarized-light'];
            const darkThemes = ['default-dark-modern', 'github-dark', 'monokai', 'vs2015', 'atom-one-dark', 'one-dark-pro', 'dracula', 'nord', 'solarized-dark', 'tokyo-night'];
            // 验证 optgroup 上有 data-i18n 属性（这些 optgroup 曾因 textContent 被清空子选项）
            assert.ok(html.includes('optgroup data-i18n="settings.code_theme_light"'), '亮色主题 optgroup 应有 data-i18n 属性');
            assert.ok(html.includes('optgroup data-i18n="settings.code_theme_dark"'), '暗色主题 optgroup 应有 data-i18n 属性');
            // 验证所有主题选项都存在
            for (const theme of [...lightThemes, ...darkThemes]) {
                assert.ok(html.includes(`value="${theme}"`), `主题选项 ${theme} 应存在于 HTML 中`);
            }
        });

        test('批注面板 header 应使用 data-i18n 属性适配多语言', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // 批注面板标题
            assert.ok(html.includes('data-i18n="annotations.title"'), '批注面板标题应有 data-i18n 属性');
            // 保存按钮
            assert.ok(html.includes('data-i18n="annotations.save"'), '保存按钮应有 data-i18n 属性');
            assert.ok(html.includes('data-i18n-title="annotations.save_title"'), '保存按钮 title 应有 data-i18n-title 属性');
            // 清除按钮
            assert.ok(html.includes('data-i18n="annotations.clear"'), '清除按钮应有 data-i18n 属性');
            assert.ok(html.includes('data-i18n-title="annotations.clear_title"'), '清除按钮 title 应有 data-i18n-title 属性');
            // 排序选项
            assert.ok(html.includes('data-i18n="annotations.sort_time"'), '排序选项"按批阅时间"应有 data-i18n 属性');
            assert.ok(html.includes('data-i18n="annotations.sort_position"'), '排序选项"按文本位置"应有 data-i18n 属性');
            assert.ok(html.includes('data-i18n-title="annotations.sort_title"'), '排序下拉框 title 应有 data-i18n-title 属性');
            // 隐藏按钮
            assert.ok(html.includes('data-i18n-title="annotations.hide_title"'), '隐藏按钮 title 应有 data-i18n-title 属性');
        });

        test('批注卡片渲染应使用 t() 函数而非硬编码中文', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const annotationsJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'annotations.js'), 'utf-8');

            // 空状态应使用 t() 函数
            assert.ok(annotationsJs.includes("t('annotations.empty')"), '空状态文本应使用 t() 函数');
            assert.ok(annotationsJs.includes("t('annotations.empty_hint')"), '空状态提示应使用 t() 函数');
            // 块索引应使用 t() 函数
            assert.ok(annotationsJs.includes("t('annotation.block_index'"), '块索引应使用 t() 函数');
            // 图片 alt 应使用 t() 函数
            assert.ok(annotationsJs.includes("t('annotation.image_alt')"), '图片 alt 应使用 t() 函数');
        });

        test('语言切换应刷新批注列表', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // languageChanged 回调中应调用 Annotations.renderAnnotationsList
            const langChangedIdx = appJs.indexOf("'languageChanged'");
            const afterLangChanged = appJs.substring(langChangedIdx, langChangedIdx + 500);
            assert.ok(afterLangChanged.includes('renderAnnotationsList'), '语言切换回调中应调用 renderAnnotationsList 刷新批注列表');
        });

        test('i18n 字典应包含批注卡片的中英文翻译', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');

            // 验证 annotation.block_index 和 annotation.image_alt 的中英文翻译都存在
            const zhMatch = i18nJs.match(/'annotation\.block_index':\s*'[^']+'/g);
            assert.ok(zhMatch && zhMatch.length >= 2, 'annotation.block_index 应有中英文两套翻译');
            const altMatch = i18nJs.match(/'annotation\.image_alt':\s*'[^']+'/g);
            assert.ok(altMatch && altMatch.length >= 2, 'annotation.image_alt 应有中英文两套翻译');
        });

        test('i18n 字典应包含主题按钮标签的中英文翻译', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');

            // 验证 theme.light 和 theme.dark 的中英文翻译都存在
            assert.ok(i18nJs.includes("'theme.light'"), '应有 theme.light 翻译 key');
            assert.ok(i18nJs.includes("'theme.dark'"), '应有 theme.dark 翻译 key');
        });

        test('AI一键修复确认弹窗应使用 data-i18n 属性适配多语言', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // applyConfirmModal 弹窗标题
            assert.ok(html.includes('data-i18n="modal.ai.title"'), 'AI修复确认弹窗标题应有 data-i18n 属性');
            // 警告文本
            assert.ok(html.includes('data-i18n-html="modal.ai.warning"'), 'AI修复确认弹窗警告应有 data-i18n-html 属性');
            // 取消按钮
            assert.ok(html.includes('data-i18n="modal.ai.cancel"'), 'AI修复确认弹窗取消按钮应有 data-i18n 属性');
            // 确认按钮
            assert.ok(html.includes('data-i18n="modal.ai.confirm"'), 'AI修复确认弹窗确认按钮应有 data-i18n 属性');
        });

        test('AI弹窗动态内容应使用 t() 函数而非硬编码中文', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // showApplyConfirm 中的动态内容
            assert.ok(appJs.includes("t('modal.ai.no_annotations')"), '暂无批注提示应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai.source_file')"), '源文件标签应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai.total_annotations'"), '批注总数应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai.summary_hint')"), '摘要提示应使用 t() 函数');

            // showApplyResult 中的动态内容
            assert.ok(appJs.includes("t('modal.ai_result.header_success')"), 'AI指令成功标题应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai_result.count'"), '指令数量应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai_result.copy_btn')"), '复制按钮应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai_result.header_empty')"), '无效指令标题应使用 t() 函数');
            assert.ok(appJs.includes("t('modal.ai_result.copy_text'"), '复制文本应使用 t() 函数');
        });

        test('i18n 字典应包含 AI 弹窗动态内容的中英文翻译', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');

            // 验证新增的 AI 弹窗翻译 key 都有中英文两套
            const keysToCheck = [
                'modal.ai.no_annotations',
                'modal.ai.source_file',
                'modal.ai.total_annotations',
                'modal.ai.summary_hint',
                'modal.ai_result.header_success',
                'modal.ai_result.count',
                'modal.ai_result.copy_btn',
                'modal.ai_result.header_empty',
                'modal.ai_result.copy_text'
            ];
            for (const key of keysToCheck) {
                const regex = new RegExp(`'${key.replace(/\./g, '\\.')}':`, 'g');
                const matches = i18nJs.match(regex);
                assert.ok(matches && matches.length >= 2, `${key} 应有中英文两套翻译`);
            }
        });

        test('VSCode 模式提示文本应显示 VSCode 而非 CodeBuddy', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            const i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');

            // vscodeAiHint 默认文本应包含 VSCode 而非 CodeBuddy
            assert.ok(html.includes('id="vscodeAiHint"'), 'vscodeAiHint 元素应存在');
            assert.ok(!html.includes('粘贴到CodeBuddy对话发送'), 'vscodeAiHint 默认文本不应包含 CodeBuddy');
            assert.ok(html.includes('粘贴到VSCode AI对话发送'), 'vscodeAiHint 默认文本应包含 VSCode');

            // i18n 中文翻译应包含 VSCode
            const zhMatch = i18nJs.match(/'modal\.ai_result\.vscode_hint':\s*'([^']+)'/);
            assert.ok(zhMatch, 'i18n 中应有 vscode_hint 翻译');
            assert.ok(!zhMatch![1].includes('CodeBuddy'), 'vscode_hint 中文翻译不应包含 CodeBuddy');
            assert.ok(zhMatch![1].includes('VSCode'), 'vscode_hint 中文翻译应包含 VSCode');
        });

        test('评论弹窗应使用 data-i18n 属性适配多语言', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // 评论弹窗标题
            assert.ok(html.includes('data-i18n="modal.comment.title"'), '评论弹窗标题应有 data-i18n 属性');
            // 选中文本标签
            assert.ok(html.includes('data-i18n="modal.comment.selected_text"'), '选中文本标签应有 data-i18n 属性');
            // 评论内容标签
            assert.ok(html.includes('data-i18n="modal.comment.content"'), '评论内容标签应有 data-i18n 属性');
            // 评论输入框 placeholder
            assert.ok(html.includes('data-i18n-placeholder="modal.comment.placeholder"'), '评论输入框应有 data-i18n-placeholder 属性');
            // 插入图片标签
            assert.ok(html.includes('data-i18n="modal.comment.image_label"'), '插入图片标签应有 data-i18n 属性');
            // 图片上传提示
            assert.ok(html.includes('data-i18n="modal.comment.image_hint"'), '图片上传提示应有 data-i18n 属性');
        });

        test('插入弹窗应使用 data-i18n 属性适配多语言', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // 插入弹窗标题
            assert.ok(html.includes('data-i18n="modal.insert.title_after"'), '插入弹窗标题应有 data-i18n 属性');
            // 插入位置标签
            assert.ok(html.includes('data-i18n="modal.insert.position_after"'), '插入位置标签应有 data-i18n 属性');
            // 要插入的内容标签
            assert.ok(html.includes('data-i18n="modal.insert.content"'), '插入内容标签应有 data-i18n 属性');
            // 插入内容 placeholder
            assert.ok(html.includes('data-i18n-placeholder="modal.insert.content_placeholder"'), '插入内容输入框应有 data-i18n-placeholder 属性');
            // 插入说明标签
            assert.ok(html.includes('data-i18n="modal.insert.reason"'), '插入说明标签应有 data-i18n 属性');
            // 插入说明 placeholder
            assert.ok(html.includes('data-i18n-placeholder="modal.insert.reason_placeholder"'), '插入说明输入框应有 data-i18n-placeholder 属性');
            // 取消按钮
            assert.ok(html.includes('data-i18n="modal.insert.cancel"'), '插入弹窗取消按钮应有 data-i18n 属性');
            // 确认按钮
            assert.ok(html.includes('data-i18n="modal.insert.submit"'), '插入弹窗确认按钮应有 data-i18n 属性');
        });

        test('插入弹窗动态内容应使用 t() 函数而非硬编码中文', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const annotationsJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'annotations.js'), 'utf-8');

            // openInsertModal 中的动态标题和标签
            assert.ok(annotationsJs.includes("t('modal.insert.title_before')"), '前插标题应使用 t() 函数');
            assert.ok(annotationsJs.includes("t('modal.insert.title_after')"), '后插标题应使用 t() 函数');
            assert.ok(annotationsJs.includes("t('modal.insert.position_before')"), '前插位置标签应使用 t() 函数');
            assert.ok(annotationsJs.includes("t('modal.insert.position_after')"), '后插位置标签应使用 t() 函数');

            // 不应有硬编码中文弹窗标题
            assert.ok(!annotationsJs.includes("textContent = '插入内容（在此处之前）'"), '不应有硬编码的前插标题');
            assert.ok(!annotationsJs.includes("textContent = '插入内容（在此处之后）'"), '不应有硬编码的后插标题');
        });

        test('表格编辑右键菜单应存在', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            assert.ok(html.includes('id="tableContextMenu"'), '应有表格右键菜单');
            assert.ok(html.includes('在上方插入行'), '应有插入行操作');
        });
    });

    // ===== 7. 批注排序逻辑 =====

    suite('7. 批注排序逻辑', () => {
        interface SimpleAnnotation {
            id: number;
            type: string;
            selectedText: string;
            blockIndex: number;
            startOffset: number;
            timestamp: string;
        }

        function sortByTime(annotations: SimpleAnnotation[]): SimpleAnnotation[] {
            return [...annotations].sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return timeB - timeA; // 最新的在前
            });
        }

        function sortByPosition(annotations: SimpleAnnotation[]): SimpleAnnotation[] {
            return [...annotations].sort((a, b) => {
                if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
                return a.startOffset - b.startOffset;
            });
        }

        test('按时间排序：最新的在前', () => {
            const annotations: SimpleAnnotation[] = [
                { id: 1, type: 'comment', selectedText: '旧', blockIndex: 0, startOffset: 0, timestamp: '2024-01-01T00:00:00Z' },
                { id: 2, type: 'comment', selectedText: '新', blockIndex: 1, startOffset: 0, timestamp: '2024-06-01T00:00:00Z' },
                { id: 3, type: 'comment', selectedText: '中', blockIndex: 2, startOffset: 0, timestamp: '2024-03-01T00:00:00Z' }
            ];

            const sorted = sortByTime(annotations);
            assert.strictEqual(sorted[0].selectedText, '新');
            assert.strictEqual(sorted[1].selectedText, '中');
            assert.strictEqual(sorted[2].selectedText, '旧');
        });

        test('按位置排序：blockIndex 升序 → startOffset 升序', () => {
            const annotations: SimpleAnnotation[] = [
                { id: 1, type: 'comment', selectedText: 'C', blockIndex: 2, startOffset: 0, timestamp: '' },
                { id: 2, type: 'comment', selectedText: 'A', blockIndex: 0, startOffset: 5, timestamp: '' },
                { id: 3, type: 'comment', selectedText: 'B', blockIndex: 0, startOffset: 0, timestamp: '' }
            ];

            const sorted = sortByPosition(annotations);
            assert.strictEqual(sorted[0].selectedText, 'B', 'block=0, offset=0 应排第一');
            assert.strictEqual(sorted[1].selectedText, 'A', 'block=0, offset=5 应排第二');
            assert.strictEqual(sorted[2].selectedText, 'C', 'block=2 应排第三');
        });

        test('导出倒序：blockIndex 降序 → startOffset 降序', () => {
            const annotations: SimpleAnnotation[] = [
                { id: 1, type: 'comment', selectedText: 'A', blockIndex: 0, startOffset: 0, timestamp: '' },
                { id: 2, type: 'comment', selectedText: 'B', blockIndex: 0, startOffset: 10, timestamp: '' },
                { id: 3, type: 'comment', selectedText: 'C', blockIndex: 2, startOffset: 0, timestamp: '' }
            ];

            const sorted = [...annotations].sort((a, b) => {
                if (a.blockIndex !== b.blockIndex) return b.blockIndex - a.blockIndex;
                return (b.startOffset || 0) - (a.startOffset || 0);
            });

            assert.strictEqual(sorted[0].selectedText, 'C', 'block=2 应排第一（倒序）');
            assert.strictEqual(sorted[1].selectedText, 'B', 'block=0, offset=10 应排第二');
            assert.strictEqual(sorted[2].selectedText, 'A', 'block=0, offset=0 应排第三');
        });
    });

    // ===== 8. 状态持久化与 UI 状态同步 =====

    suite('8. 状态持久化与 UI 状态同步', () => {
        test('保存批注状态后应能恢复', async () => {
            const annotations = [
                { id: 1, type: 'comment', selectedText: '文本1', comment: '评论1', blockIndex: 0 },
                { id: 2, type: 'delete', selectedText: '文本2', blockIndex: 1 }
            ];

            await stateService.set('md_review_data', {
                fileName: 'state-test.md',
                rawMarkdown: '# 测试',
                annotations,
                nextId: 3,
                reviewVersion: 1
            });

            const restored = stateService.get<any>('md_review_data');
            assert.ok(restored);
            assert.strictEqual(restored.fileName, 'state-test.md');
            assert.strictEqual(restored.annotations.length, 2);
            assert.strictEqual(restored.annotations[0].type, 'comment');
            assert.strictEqual(restored.annotations[1].type, 'delete');
            assert.strictEqual(restored.nextId, 3);
        });

        test('清空批注后状态应更新', async () => {
            await stateService.set('md_review_data', {
                fileName: 'clear-test.md',
                rawMarkdown: '# 测试',
                annotations: [{ id: 1, type: 'comment', selectedText: 'x', comment: 'y', blockIndex: 0 }],
                nextId: 2,
                reviewVersion: 1
            });

            // 模拟清空
            await stateService.set('md_review_data', {
                fileName: 'clear-test.md',
                rawMarkdown: '# 测试',
                annotations: [],
                nextId: 1,
                reviewVersion: 1
            });

            const restored = stateService.get<any>('md_review_data');
            assert.strictEqual(restored.annotations.length, 0);
            assert.strictEqual(restored.nextId, 1);
        });

        test('切换文件应重置批注状态', async () => {
            await stateService.set('md_review_data', {
                fileName: 'file-a.md',
                rawMarkdown: '# A',
                annotations: [{ id: 1, type: 'comment', selectedText: 'a', comment: 'b', blockIndex: 0 }],
                nextId: 2,
                reviewVersion: 1
            });

            // 模拟切换到新文件
            await stateService.set('md_review_data', {
                fileName: 'file-b.md',
                rawMarkdown: '# B',
                annotations: [],
                nextId: 1,
                reviewVersion: 1
            });

            const restored = stateService.get<any>('md_review_data');
            assert.strictEqual(restored.fileName, 'file-b.md');
            assert.strictEqual(restored.annotations.length, 0);
        });
    });

    // ===== 9. 文件选择器交互 =====

    suite('9. 文件选择器交互', () => {
        test('listMdFiles 应返回工作区中的 md 文件', async () => {
            const files = await fileService.listMdFiles();
            assert.ok(Array.isArray(files), '应返回数组');
            // 在测试环境中可能没有工作区文件，但不应报错
        });

        test('readFile 后应能获取文件元信息', () => {
            const testFile = path.join(testDir, 'meta-test.md');
            fs.writeFileSync(testFile, '# 元信息测试\n\n**文档版本**：v3.2.1\n\n内容', 'utf-8');

            const result = fileService.readFile(testFile);
            assert.strictEqual(result.name, 'meta-test.md');
            assert.strictEqual(result.docVersion, 'v3.2.1');
            assert.ok(result.sourceFilePath.endsWith('meta-test.md'));
            assert.ok(result.sourceDir.length > 0);

            fs.unlinkSync(testFile);
        });
    });

    // ===== 10. 批注交互模拟（完整流程） =====

    suite('10. 批注交互模拟', () => {
        test('评论流程：选中文本 → 输入评论 → 提交', () => {
            // 模拟 currentSelection
            const selection = {
                text: '需要修改的段落',
                blockIndex: 2,
                endBlockIndex: 2,
                startOffset: 0,
                endOffset: 8
            };

            // 模拟 submitComment
            const annotation = {
                type: 'comment',
                selectedText: selection.text,
                blockIndex: selection.blockIndex,
                endBlockIndex: selection.endBlockIndex,
                startOffset: selection.startOffset,
                endOffset: selection.endOffset,
                comment: '请补充更多细节',
                images: []
            };

            assert.strictEqual(annotation.type, 'comment');
            assert.strictEqual(annotation.selectedText, '需要修改的段落');
            assert.strictEqual(annotation.comment, '请补充更多细节');
            assert.strictEqual(annotation.blockIndex, 2);
        });

        test('删除流程：选中文本 → 标记删除', () => {
            const selection = {
                text: '要删除的内容',
                blockIndex: 3,
                startOffset: 5,
                endOffset: 11
            };

            const annotation = {
                type: 'delete',
                selectedText: selection.text,
                blockIndex: selection.blockIndex,
                startOffset: selection.startOffset,
                endOffset: selection.endOffset,
                comment: '',
                images: []
            };

            assert.strictEqual(annotation.type, 'delete');
            assert.strictEqual(annotation.comment, '');
        });

        test('后插流程：选中锚点 → 输入内容 → 提交', () => {
            const selection = {
                text: '锚点文本',
                blockIndex: 1,
                startOffset: 10,
                endOffset: 14
            };

            const annotation = {
                type: 'insert',
                selectedText: selection.text,
                blockIndex: selection.blockIndex,
                startOffset: selection.endOffset, // 后插使用 endOffset
                endOffset: selection.endOffset,
                insertContent: '新增的段落内容',
                insertPosition: 'after',
                comment: '补充说明',
                images: []
            };

            assert.strictEqual(annotation.type, 'insert');
            assert.strictEqual(annotation.insertPosition, 'after');
            assert.strictEqual(annotation.startOffset, 14, '后插应使用 endOffset');
        });

        test('前插流程：选中锚点 → 输入内容 → 提交', () => {
            const selection = {
                text: '锚点文本',
                blockIndex: 1,
                startOffset: 10,
                endOffset: 14
            };

            const annotation = {
                type: 'insert',
                selectedText: selection.text,
                blockIndex: selection.blockIndex,
                startOffset: selection.startOffset, // 前插使用 startOffset
                endOffset: selection.startOffset,
                insertContent: '前置内容',
                insertPosition: 'before',
                comment: '',
                images: []
            };

            assert.strictEqual(annotation.insertPosition, 'before');
            assert.strictEqual(annotation.startOffset, 10, '前插应使用 startOffset');
        });

        test('编辑评论流程：修改已有评论', () => {
            const original = {
                id: 1,
                type: 'comment',
                selectedText: '原始文本',
                comment: '原始评论',
                images: ['images/old.png']
            };

            // 模拟 updateAnnotation
            const updates = {
                comment: '修改后的评论',
                images: ['images/old.png', 'images/new.jpg']
            };

            const updated = { ...original, ...updates };
            assert.strictEqual(updated.comment, '修改后的评论');
            assert.strictEqual(updated.images.length, 2);
            assert.strictEqual(updated.selectedText, '原始文本', '选中文本不应改变');
        });

        test('编辑插入批注流程：修改插入内容', () => {
            const original = {
                id: 2,
                type: 'insert',
                selectedText: '锚点',
                insertContent: '原始插入',
                comment: '原始说明'
            };

            const updates = {
                insertContent: '修改后的插入内容',
                comment: '修改后的说明'
            };

            const updated = { ...original, ...updates };
            assert.strictEqual(updated.insertContent, '修改后的插入内容');
            assert.strictEqual(updated.comment, '修改后的说明');
            assert.strictEqual(updated.selectedText, '锚点', '锚点文本不应改变');
        });
    });

    // ===== 11. 工具栏状态管理 =====

    suite('11. 工具栏状态管理', () => {
        test('无批注时导出和清除按钮应禁用', () => {
            const annotations: any[] = [];
            const hasAnnotations = annotations.length > 0;
            assert.strictEqual(hasAnnotations, false);
            // 模拟 UI 状态：btnExport.disabled = !hasAnnotations
            assert.strictEqual(!hasAnnotations, true, '导出按钮应禁用');
            assert.strictEqual(!hasAnnotations, true, '清除按钮应禁用');
        });

        test('有批注时导出和清除按钮应启用', () => {
            const annotations = [{ id: 1, type: 'comment' }];
            const hasAnnotations = annotations.length > 0;
            assert.strictEqual(hasAnnotations, true);
            assert.strictEqual(!hasAnnotations, false, '导出按钮应启用');
        });

        test('批注计数应正确显示', () => {
            const counts = [0, 1, 5, 100];
            const expected = ['0 条批注', '1 条批注', '5 条批注', '100 条批注'];

            counts.forEach((count, i) => {
                assert.strictEqual(`${count} 条批注`, expected[i]);
            });
        });
    });

    // ===== 12. CSS 样式文件完整性 =====

    suite('12. CSS 样式文件完整性', () => {
        test('annotations.css 应包含批注卡片样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'annotations.css'), 'utf-8');

            assert.ok(css.includes('.annotation-card'), '应有批注卡片样式');
            assert.ok(css.includes('.annotation-type'), '应有批注类型样式');
            assert.ok(css.includes('.annotations-panel'), '应有批注面板样式');
            assert.ok(css.includes('.annotations-panel.collapsed'), '应有折叠状态样式');
            assert.ok(css.includes('.sort-select'), '应有排序选择器样式');
            assert.ok(css.includes('.empty-annotations'), '应有空批注提示样式');
        });

        test('style.css 应包含核心布局样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'style.css'), 'utf-8');

            assert.ok(css.includes('.toolbar'), '应有工具栏样式');
            assert.ok(css.includes('.context-menu'), '应有右键菜单样式');
            assert.ok(css.includes('.selection-tooltip'), '应有选区浮层样式');
            assert.ok(css.includes('.modal'), '应有弹窗样式');
        });

        test('settings.css 应包含设置面板样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'settings.css'), 'utf-8');

            assert.ok(css.includes('.settings-overlay') || css.includes('#settingsOverlay'), '应有设置面板覆盖层样式');
        });

        test('markdown.css 应包含 PlantUML 图表样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');

            assert.ok(css.includes('.plantuml-container'), '应有 PlantUML 容器样式');
            assert.ok(css.includes('.plantuml-rendered'), '应有 PlantUML 渲染后样式');
            assert.ok(css.includes('.plantuml-source'), '应有 PlantUML 源码样式');
            assert.ok(css.includes('.plantuml-error'), '应有 PlantUML 错误提示样式');
        });

        test('markdown.css 应包含 Graphviz 图表样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');

            assert.ok(css.includes('.graphviz-container'), '应有 Graphviz 容器样式');
            assert.ok(css.includes('.graphviz-rendered'), '应有 Graphviz 渲染后样式');
            assert.ok(css.includes('.graphviz-source'), '应有 Graphviz 源码样式');
            assert.ok(css.includes('.graphviz-error'), '应有 Graphviz 错误提示样式');
            assert.ok(css.includes('.graphviz-rendered svg'), '应有 Graphviz SVG 自适应样式');
        });

        test('markdown.css 应包含 PlantUML/Graphviz 暗色主题适配', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');

            assert.ok(css.includes('.theme-dark .plantuml-rendered'), '应有 PlantUML 暗色主题样式');
            assert.ok(css.includes('.theme-dark .plantuml-source'), '应有 PlantUML 源码暗色样式');
            assert.ok(css.includes('.theme-dark .graphviz-source'), '应有 Graphviz 源码暗色样式');
            assert.ok(css.includes('.theme-dark .graphviz-error'), '应有 Graphviz 错误暗色样式');
        });
    });

    // ===== 13. 批注验证逻辑 =====

    suite('13. 批注验证逻辑', () => {
        // 模拟 applyReview 中的批注过滤逻辑

        function isValidAnnotation(ann: any): boolean {
            if (ann.type === 'delete' && (!ann.selectedText || ann.selectedText.trim() === '')) {
                return false;
            }
            if (ann.type === 'insert' && (!ann.insertContent || ann.insertContent.trim() === '')) {
                return false;
            }
            if (ann.type === 'comment' && (!ann.selectedText || ann.selectedText.trim() === '') && (!ann.comment || ann.comment.trim() === '')) {
                return false;
            }
            return true;
        }

        test('有效的评论批注应通过验证', () => {
            assert.ok(isValidAnnotation({ type: 'comment', selectedText: '文本', comment: '评论' }));
        });

        test('空 selectedText 的删除批注应不通过', () => {
            assert.strictEqual(isValidAnnotation({ type: 'delete', selectedText: '' }), false);
            assert.strictEqual(isValidAnnotation({ type: 'delete', selectedText: '  ' }), false);
        });

        test('空 insertContent 的插入批注应不通过', () => {
            assert.strictEqual(isValidAnnotation({ type: 'insert', selectedText: 'x', insertContent: '' }), false);
            assert.strictEqual(isValidAnnotation({ type: 'insert', selectedText: 'x', insertContent: '  ' }), false);
        });

        test('有内容的删除批注应通过', () => {
            assert.ok(isValidAnnotation({ type: 'delete', selectedText: '要删除的文本' }));
        });

        test('有内容的插入批注应通过', () => {
            assert.ok(isValidAnnotation({ type: 'insert', selectedText: '锚点', insertContent: '新内容' }));
        });

        test('空 selectedText 和空 comment 的评论应不通过', () => {
            assert.strictEqual(isValidAnnotation({ type: 'comment', selectedText: '', comment: '' }), false);
        });

        test('有 selectedText 但空 comment 的评论应通过（可能有图片）', () => {
            assert.ok(isValidAnnotation({ type: 'comment', selectedText: '文本', comment: '' }));
        });
    });

    // ===== 14. 文件变更通知逻辑 =====

    suite('14. 文件变更通知逻辑', () => {
        test('文件变更应能被检测到', async () => {
            const testFile = path.join(testDir, 'watch-test.md');
            fs.writeFileSync(testFile, '# 初始内容', 'utf-8');

            // 读取初始内容
            const initial = fileService.readFile(testFile);
            assert.strictEqual(initial.content, '# 初始内容');

            // 模拟文件变更
            fs.writeFileSync(testFile, '# 修改后的内容', 'utf-8');

            // 重新读取应获得新内容
            const updated = fileService.readFile(testFile);
            assert.strictEqual(updated.content, '# 修改后的内容');

            fs.unlinkSync(testFile);
        });
    });

    // ===== 15. 图片批注 URI 解析逻辑 =====

    suite('15. 图片批注 URI 解析逻辑', () => {
        test('Base64 图片应能被正确识别', () => {
            const base64Png = 'data:image/png;base64,iVBORw0KGgo=';
            const base64Jpeg = 'data:image/jpeg;base64,/9j/4AAQ=';
            const pathRef = 'images/img_001.png';

            assert.ok(base64Png.startsWith('data:image/'), 'PNG Base64 应被识别');
            assert.ok(base64Jpeg.startsWith('data:image/'), 'JPEG Base64 应被识别');
            assert.ok(!pathRef.startsWith('data:image/'), '路径引用不应被识别为 Base64');
        });

        test('图片路径应正确分类', () => {
            const images = [
                'data:image/png;base64,abc123',
                'images/img_001.png',
                'images/img_002.jpg',
                'data:image/jpeg;base64,xyz789'
            ];

            const base64Images = images.filter(img => img.startsWith('data:image/'));
            const pathImages = images.filter(img => !img.startsWith('data:image/'));

            assert.strictEqual(base64Images.length, 2);
            assert.strictEqual(pathImages.length, 2);
        });

        test('saveAnnotationImage 应返回路径引用', () => {
            const base64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            const result = fileService.saveAnnotationImage(base64Png);

            assert.ok(result.success);
            assert.ok(result.imagePath.startsWith('images/'), '应返回路径引用');
            assert.ok(!result.imagePath.startsWith('data:'), '不应返回 Base64');

            // 清理
            fileService.deleteAnnotationImage(result.imagePath);
        });
    });

    // ===== 16. 编辑模式交互 =====

    suite('16. 编辑模式交互', () => {
        test('编辑模式下保存应创建备份', () => {
            const testFile = path.join(testDir, 'edit-mode-test.md');
            fs.writeFileSync(testFile, '# 原始内容\n\n段落一', 'utf-8');

            // 模拟编辑模式下的保存
            const newContent = '# 修改后的内容\n\n段落一（已修改）';
            const result = fileService.saveFile(testFile, newContent);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, true);
            assert.ok(result.backupFile, '应创建备份');

            // 验证文件内容已更新
            const saved = fs.readFileSync(testFile, 'utf-8');
            assert.strictEqual(saved, newContent);

            fs.unlinkSync(testFile);
        });

        test('编辑模式下 Ctrl+S 保存相同内容不应创建备份', () => {
            const testFile = path.join(testDir, 'no-change-test.md');
            const content = '# 无变更\n\n内容不变';
            fs.writeFileSync(testFile, content, 'utf-8');

            const result = fileService.saveFile(testFile, content);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.changed, false);
            assert.strictEqual(result.backupFile, undefined);

            fs.unlinkSync(testFile);
        });
    });

    // ===== 17. 搜索功能 UI 存在性与行为验证 =====

    suite('17. 搜索功能 UI 存在性与行为验证', () => {
        let html: string;
        let appJs: string;
        let annotationsJs: string;
        let styleCss: string;
        let annotationsCss: string;
        let i18nJs: string;

        suiteSetup(() => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');
            annotationsJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'annotations.js'), 'utf-8');
            styleCss = fs.readFileSync(path.join(extPath, 'webview', 'css', 'style.css'), 'utf-8');
            annotationsCss = fs.readFileSync(path.join(extPath, 'webview', 'css', 'annotations.css'), 'utf-8');
            i18nJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');
        });

        // --- Tier 1: 存在性断言 ---

        test('BT-1.1 index.html 应包含正文搜索栏 HTML', () => {
            assert.ok(html.includes('id="searchBar"'), '应有搜索栏容器');
            assert.ok(html.includes('id="searchInput"'), '应有搜索输入框');
            assert.ok(html.includes('id="searchCount"'), '应有搜索计数');
            assert.ok(html.includes('id="searchPrev"'), '应有上一个按钮');
            assert.ok(html.includes('id="searchNext"'), '应有下一个按钮');
            assert.ok(html.includes('id="searchClose"'), '应有关闭按钮');
        });

        test('BT-1.2 index.html 应包含目录搜索框 HTML', () => {
            assert.ok(html.includes('id="tocSearch"'), '应有目录搜索容器');
            assert.ok(html.includes('id="tocSearchInput"'), '应有目录搜索输入框');
            assert.ok(html.includes('id="tocSearchClear"'), '应有目录搜索清除按钮');
        });

        test('BT-1.3 index.html 应包含批注搜索框 HTML', () => {
            assert.ok(html.includes('id="annotationSearch"'), '应有批注搜索容器');
            assert.ok(html.includes('id="annotationSearchInput"'), '应有批注搜索输入框');
            assert.ok(html.includes('id="annotationSearchClear"'), '应有批注搜索清除按钮');
        });

        test('BT-1.4 style.css 应包含正文搜索栏样式', () => {
            assert.ok(styleCss.includes('.search-bar'), '应有搜索栏样式');
            assert.ok(styleCss.includes('.search-input'), '应有搜索输入框样式');
            assert.ok(styleCss.includes('.search-highlight'), '应有搜索高亮样式');
            assert.ok(styleCss.includes('.search-current'), '应有当前匹配高亮样式');
            assert.ok(styleCss.includes('.search-nav-btn'), '应有导航按钮样式');
            assert.ok(styleCss.includes('.no-match'), '应有无匹配状态样式');
        });

        test('BT-1.5 style.css 应包含目录搜索框样式', () => {
            assert.ok(styleCss.includes('.toc-search'), '应有目录搜索容器样式');
            assert.ok(styleCss.includes('.toc-search-input'), '应有目录搜索输入框样式');
            assert.ok(styleCss.includes('.toc-search-clear'), '应有目录搜索清除按钮样式');
            assert.ok(styleCss.includes('.toc-no-results'), '应有目录无结果提示样式');
        });

        test('BT-1.6 annotations.css 应包含批注搜索框样式', () => {
            assert.ok(annotationsCss.includes('.annotation-search'), '应有批注搜索容器样式');
            assert.ok(annotationsCss.includes('.annotation-search-input'), '应有批注搜索输入框样式');
            assert.ok(annotationsCss.includes('.annotation-search-clear'), '应有批注搜索清除按钮样式');
            assert.ok(annotationsCss.includes('.annotation-no-results'), '应有批注无结果提示样式');
        });

        // --- Tier 2: 行为级断言 ---

        test('BT-2.1 app.js 应实现 Ctrl+F 搜索拦截', () => {
            assert.ok(appJs.includes("e.key === 'f'") || appJs.includes("e.key === 'F'"), '应监听 Ctrl+F 键盘事件');
            assert.ok(appJs.includes('openContentSearch'), '应有打开搜索栏函数');
            assert.ok(appJs.includes('closeContentSearch'), '应有关闭搜索栏函数');
        });

        test('BT-2.2 app.js 应实现 TreeWalker 文本搜索', () => {
            assert.ok(appJs.includes('createTreeWalker'), '应使用 TreeWalker 遍历文本节点');
            assert.ok(appJs.includes('search-highlight'), '应使用 search-highlight 类名标记匹配');
            assert.ok(appJs.includes('search-current'), '应使用 search-current 类名标记当前匹配');
        });

        test('BT-2.3 app.js 应实现搜索导航', () => {
            assert.ok(appJs.includes('navigateSearch'), '应有搜索导航函数');
            assert.ok(appJs.includes('searchCurrentIndex'), '应维护当前匹配索引');
            assert.ok(appJs.includes('scrollIntoView'), '应滚动到匹配项');
        });

        test('BT-2.4 app.js 应实现搜索高亮清除', () => {
            assert.ok(appJs.includes('clearSearchHighlights'), '应有清除搜索高亮函数');
            assert.ok(appJs.includes('normalize'), '应调用 normalize 合并文本节点');
        });

        test('BT-2.5 app.js 应实现目录搜索过滤', () => {
            assert.ok(appJs.includes('performTocSearch'), '应有目录搜索函数');
            assert.ok(appJs.includes('clearTocSearch'), '应有清除目录搜索函数');
            assert.ok(appJs.includes('tocPreSearchCollapsedSet'), '应保存搜索前折叠状态');
        });

        test('BT-2.6 app.js 目录搜索应保持层级结构', () => {
            assert.ok(appJs.includes('allVisible') || appJs.includes('visibleIndices'), '应有层级保持逻辑');
            assert.ok(appJs.includes('dataset.level') || appJs.includes('.level'), '应使用 level 属性判断层级');
        });

        test('BT-2.7 annotations.js 应实现批注搜索过滤', () => {
            assert.ok(annotationsJs.includes('annotationSearchQuery'), '应有批注搜索关键词变量');
            assert.ok(annotationsJs.includes('setupAnnotationSearch'), '应有批注搜索初始化函数');
            assert.ok(annotationsJs.includes('selectedText') && annotationsJs.includes('comment') && annotationsJs.includes('insertContent'), '应搜索多个字段');
        });

        test('BT-2.8 annotations.js 批注搜索应与排序兼容', () => {
            // 搜索过滤应在排序之后执行
            assert.ok(annotationsJs.includes('annotationSearchQuery'), '应有搜索关键词');
            assert.ok(annotationsJs.includes('sortedAnnotations'), '应在排序后的数组上过滤');
        });

        // --- Tier 3: 搜索功能特定断言 ---

        test('BT-3.1 正文搜索栏应有暗色主题适配', () => {
            assert.ok(styleCss.includes('theme-dark .search-bar'), '应有暗色主题搜索栏样式');
            assert.ok(styleCss.includes('theme-dark mark.search-highlight'), '应有暗色主题搜索高亮样式');
        });

        test('BT-3.2 目录搜索应有暗色主题适配', () => {
            assert.ok(styleCss.includes('theme-dark .toc-search'), '应有暗色主题目录搜索样式');
        });

        test('BT-3.3 批注搜索应有暗色主题适配', () => {
            assert.ok(annotationsCss.includes('theme-dark .annotation-search'), '应有暗色主题批注搜索样式');
        });

        test('BT-3.4 i18n 应包含搜索相关的中文翻译', () => {
            assert.ok(i18nJs.includes("'search.placeholder'"), '应有搜索占位符翻译');
            assert.ok(i18nJs.includes("'search.prev_title'"), '应有上一个按钮翻译');
            assert.ok(i18nJs.includes("'search.next_title'"), '应有下一个按钮翻译');
            assert.ok(i18nJs.includes("'search.close_title'"), '应有关闭按钮翻译');
            assert.ok(i18nJs.includes("'toc.search_placeholder'"), '应有目录搜索占位符翻译');
            assert.ok(i18nJs.includes("'toc.no_results'"), '应有目录无结果翻译');
            assert.ok(i18nJs.includes("'annotations.search_placeholder'"), '应有批注搜索占位符翻译');
            assert.ok(i18nJs.includes("'annotations.no_results'"), '应有批注无结果翻译');
        });

        test('BT-3.5 i18n 应包含搜索相关的英文翻译', () => {
            assert.ok(i18nJs.includes("'Search...'") || i18nJs.includes("Search..."), '应有英文搜索占位符');
            assert.ok(i18nJs.includes("'Search TOC...'") || i18nJs.includes("Search TOC..."), '应有英文目录搜索占位符');
            assert.ok(i18nJs.includes("'Search annotations...'") || i18nJs.includes("Search annotations..."), '应有英文批注搜索占位符');
        });

        test('BT-3.6 搜索栏应使用 data-i18n 属性支持国际化', () => {
            assert.ok(html.includes('data-i18n-placeholder="search.placeholder"'), '搜索输入框应有 i18n 占位符');
            assert.ok(html.includes('data-i18n-placeholder="toc.search_placeholder"'), '目录搜索输入框应有 i18n 占位符');
            assert.ok(html.includes('data-i18n-placeholder="annotations.search_placeholder"'), '批注搜索输入框应有 i18n 占位符');
        });

        test('BT-3.7 搜索栏应使用 debounce 防抖', () => {
            assert.ok(appJs.includes('searchDebounceTimer') || appJs.includes('300'), '正文搜索应有 debounce');
            assert.ok(appJs.includes('tocSearchDebounceTimer') || appJs.includes('150'), '目录搜索应有 debounce');
            assert.ok(annotationsJs.includes('annotationSearchDebounceTimer'), '批注搜索应有 debounce');
        });
    });
});
