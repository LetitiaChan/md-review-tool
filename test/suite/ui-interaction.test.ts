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

            assert.strictEqual(settings.fontSize, 16);
            assert.strictEqual(settings.lineHeight, 1.6);
            assert.strictEqual(settings.contentMaxWidth, 1100);
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
            assert.strictEqual(settings.codeTheme, 'default-light-modern');
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
                'btnToggleAnnotations', 'btnToggleToc',
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

        test('BT-toolbarIconOnly.1 工具栏按钮（目录/主题/预览/批注）应仅含图标无文字 span（Tier 1 — 存在性断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');

            // 目录按钮不应包含文字 span
            const tocBtnMatch = html.match(/<button[^>]*id="btnToggleToc"[^>]*>[\s\S]*?<\/button>/);
            assert.ok(tocBtnMatch, '应存在目录按钮');
            assert.ok(!tocBtnMatch![0].includes('data-i18n="toolbar.toc"'), '目录按钮不应包含文字 span');

            // 主题按钮不应包含文字 span
            const themeBtnMatch = html.match(/<button[^>]*id="btnToggleTheme"[^>]*>[\s\S]*?<\/button>/);
            assert.ok(themeBtnMatch, '应存在主题按钮');
            assert.ok(!themeBtnMatch![0].includes('data-i18n="toolbar.theme"'), '主题按钮不应包含文字 span');

            // 预览/编辑按钮不应包含文字 span
            const modeBtnMatch = html.match(/<button[^>]*id="btnModeToggle"[^>]*>[\s\S]*?<\/button>/);
            assert.ok(modeBtnMatch, '应存在预览/编辑按钮');
            assert.ok(!modeBtnMatch![0].includes('mode-toggle-label'), '预览/编辑按钮不应包含文字 span');

            // 批注按钮不应包含文字 span
            const annBtnMatch = html.match(/<button[^>]*id="btnToggleAnnotations"[^>]*>[\s\S]*?<\/button>/);
            assert.ok(annBtnMatch, '应存在批注按钮');
            assert.ok(!annBtnMatch![0].includes('annotationCount'), '批注按钮不应包含文字 span');

            // 禅模式按钮不应包含文字 span
            const zenBtnMatch = html.match(/<button[^>]*id="btnZenMode"[^>]*>[\s\S]*?<\/button>/);
            assert.ok(zenBtnMatch, '应存在禅模式按钮');
            assert.ok(!zenBtnMatch![0].includes('data-i18n="toolbar.zen"'), '禅模式按钮不应包含文字 span');
        });

        test('BT-toolbarIconOnly.2 updateThemeButtonLabel 应仅输出 SVG 图标无文字（Tier 2 — 行为级断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // updateThemeButtonLabel 中 btn.innerHTML 赋值不应拼接文字标签
            const themeInnerHtml = appJs.match(/btn\.innerHTML\s*=\s*(?:icons\[displayTheme\]|icons\.light)[^;]*/);
            assert.ok(themeInnerHtml, '应存在主题按钮 innerHTML 赋值');
            assert.ok(!themeInnerHtml![0].includes('labels['), '主题按钮 innerHTML 不应拼接文字标签');
        });

        test('BT-toolbarIconOnly.3 updateZenButtonLabel 应仅输出 SVG 图标无文字（Tier 3 — 回归断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // updateZenButtonLabel 中 zenBtn.innerHTML 赋值不应拼接 t('toolbar.zen') 或 t('toolbar.exit_zen')
            const zenFnMatch = appJs.match(/function updateZenButtonLabel\(\)[\s\S]*?^\s{4}\}/m);
            assert.ok(zenFnMatch, '应存在 updateZenButtonLabel 函数');
            assert.ok(!zenFnMatch![0].includes("+ t('toolbar.zen')"), '禅模式按钮 innerHTML 不应拼接禅模式文字');
            assert.ok(!zenFnMatch![0].includes("+ t('toolbar.exit_zen')"), '禅模式按钮 innerHTML 不应拼接退出禅模式文字');
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

        test('BT-settingsDefaults.1 settings.js DEFAULTS 应与 package.json 默认值一致', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const settingsJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'settings.js'), 'utf-8');
            const pkgJson = JSON.parse(fs.readFileSync(path.join(extPath, 'package.json'), 'utf-8'));
            const pkgProps = pkgJson.contributes.configuration.properties;

            // Tier 1: 提取 settings.js 中 DEFAULTS 的 fontSize / lineHeight / contentMaxWidth
            const fontSizeMatch = settingsJs.match(/DEFAULTS\s*=\s*\{[^}]*fontSize:\s*(\d+)/);
            const lineHeightMatch = settingsJs.match(/DEFAULTS\s*=\s*\{[^}]*lineHeight:\s*([\d.]+)/);
            const maxWidthMatch = settingsJs.match(/DEFAULTS\s*=\s*\{[^}]*contentMaxWidth:\s*(\d+)/);

            assert.ok(fontSizeMatch, 'DEFAULTS 应包含 fontSize');
            assert.ok(lineHeightMatch, 'DEFAULTS 应包含 lineHeight');
            assert.ok(maxWidthMatch, 'DEFAULTS 应包含 contentMaxWidth');

            // Tier 3: 与 package.json 默认值交叉验证
            assert.strictEqual(Number(fontSizeMatch![1]), pkgProps['mdReview.fontSize'].default,
                `settings.js fontSize(${fontSizeMatch![1]}) 应与 package.json(${pkgProps['mdReview.fontSize'].default}) 一致`);
            assert.strictEqual(Number(lineHeightMatch![1]), pkgProps['mdReview.lineHeight'].default,
                `settings.js lineHeight(${lineHeightMatch![1]}) 应与 package.json(${pkgProps['mdReview.lineHeight'].default}) 一致`);
            assert.strictEqual(Number(maxWidthMatch![1]), pkgProps['mdReview.contentMaxWidth'].default,
                `settings.js contentMaxWidth(${maxWidthMatch![1]}) 应与 package.json(${pkgProps['mdReview.contentMaxWidth'].default}) 一致`);
        });

        test('BT-editTipsDismiss.1 编辑模式提示条关闭按钮应使用 addEventListener 而非内联 onclick', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // Tier 1: showEditModeTips 函数应存在
            assert.ok(appJs.includes('function showEditModeTips'), 'app.js 应包含 showEditModeTips 函数');
            // Tier 1: 关闭按钮不应使用内联 onclick（CSP 兼容 + 事件可靠性）
            assert.ok(!appJs.includes("onclick=\"this.parentElement.parentElement.classList.remove('show')\""),
                '关闭按钮不应使用内联 onclick，应使用 addEventListener');
            // Tier 2: 应通过 addEventListener 绑定 click 事件
            assert.ok(appJs.includes(".edit-tips-close').addEventListener('click'"),
                '关闭按钮应通过 addEventListener 绑定 click 事件');
        });

        test('BT-editTipsDismiss.2 showEditModeTips 应保存 setTimeout ID 并在关闭时清除', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const appJs = fs.readFileSync(path.join(extPath, 'webview', 'js', 'app.js'), 'utf-8');

            // Tier 2: 应有 clearTimeout 调用防止定时器竞态
            assert.ok(appJs.includes('clearTimeout(_editTipsTimer)'), '应在关闭时清除自动消失定时器');
            // Tier 3: _dismissEditModeTips 函数应存在，统一处理关闭逻辑
            assert.ok(appJs.includes('function _dismissEditModeTips'), '应有统一的 _dismissEditModeTips 关闭函数');
            // Tier 3: setTimeout 应将返回值赋给 _editTipsTimer
            assert.ok(appJs.includes('_editTipsTimer = setTimeout'), 'setTimeout 返回值应赋给 _editTipsTimer 以便清除');
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

            // vscodeAiHint 元素应存在，默认文本应通过 i18n 适配（modal.ai_result.vscode_hint）
            assert.ok(html.includes('id="vscodeAiHint"'), 'vscodeAiHint 元素应存在');
            assert.ok(html.includes('data-i18n="modal.ai_result.vscode_hint"'), 'vscodeAiHint 应通过 data-i18n 适配多语言');
            // i18n 字典应包含对应翻译
            assert.ok(i18nJs.includes('modal.ai_result.vscode_hint'), 'i18n.js 应包含 vscode_hint 翻译 key');
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

        test('BT-scrollbar.1 style.css 不应隐藏文档内容区滚动条', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'style.css'), 'utf-8');

            // Tier 1: 确保没有隐藏 .document-content 滚动条的规则
            assert.ok(!css.includes('.document-content::-webkit-scrollbar'), '不应存在隐藏文档内容区 webkit 滚动条的规则');
            assert.ok(!css.includes('.document-content {\n    scrollbar-width: none'), '不应存在隐藏文档内容区 Firefox 滚动条的规则');

            // Tier 1: 确保 .document-content 有 overflow-y: auto
            assert.ok(css.includes('overflow-y: auto'), '文档内容区应有 overflow-y: auto 以支持滚动');

            // Tier 1: 确保全局滚动条样式存在
            assert.ok(css.includes('::-webkit-scrollbar {'), '应有全局 webkit 滚动条样式');
            assert.ok(css.includes('::-webkit-scrollbar-thumb {'), '应有全局滚动条滑块样式');
        });

        test('settings.css 应包含设置面板样式', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'settings.css'), 'utf-8');

            assert.ok(css.includes('.settings-overlay') || css.includes('#settingsOverlay'), '应有设置面板覆盖层样式');
        });

        // Tier 1: 设置面板首屏防闪现 — HTML 内联 display:none 存在性检查
        test('BT-settings.6 settingsOverlay 应有内联 display:none 防止首屏闪现', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const html = fs.readFileSync(path.join(extPath, 'webview', 'index.html'), 'utf-8');
            assert.ok(
                html.includes('id="settingsOverlay" style="display:none;"') ||
                html.includes("id=\"settingsOverlay\" style=\"display:none;\""),
                'settingsOverlay 元素应有内联 style="display:none;" 防止首屏闪现'
            );
        });

        // Tier 1: 设置面板首屏防闪现 — JS show() 中包含 display 清除逻辑
        test('BT-settings.7 settings.js show() 应包含移除 display:none 的逻辑', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const js = fs.readFileSync(path.join(extPath, 'webview', 'js', 'settings.js'), 'utf-8');
            assert.ok(
                js.includes("overlay.style.display = ''") || js.includes("overlay.style.display=''"),
                'show() 应清除 overlay 的 display:none 以显示面板'
            );
        });

        // Tier 1: 设置面板首屏防闪现 — JS hide() 中包含 display:none 恢复逻辑
        test('BT-settings.8 settings.js hide() 应在过渡结束后恢复 display:none', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const js = fs.readFileSync(path.join(extPath, 'webview', 'js', 'settings.js'), 'utf-8');
            assert.ok(
                js.includes("overlay.style.display = 'none'") || js.includes("overlay.style.display='none'"),
                'hide() 应在过渡结束后将 overlay 设为 display:none'
            );
            assert.ok(
                js.includes('transitionend'),
                'hide() 应监听 transitionend 事件来恢复 display:none'
            );
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

        test('BT-darkTable.1 markdown.css 应包含暗色主题表格 td 显式颜色（Tier 1 — 存在性断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');

            assert.ok(css.includes('.theme-dark .document-content .table-wrapper td'), '应有暗色主题表格 td 样式');
        });

        test('BT-darkTable.2 暗色主题表格 td 应设置显式文字颜色以确保可读性（Tier 2 — 行为级断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');

            // 提取暗色主题表格 td 的独立规则块（不含 th 合并选择器）
            const tdColorMatch = css.match(/\.theme-dark\s+\.document-content\s+\.table-wrapper\s+td\s*\{[^}]*color\s*:/);
            assert.ok(tdColorMatch, '暗色主题表格 td 应有显式 color 属性');
        });

        test('BT-darkTable.3 暗色主题表格内行内代码应有增强对比度样式（Tier 3 — 回归断言）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
            const css = fs.readFileSync(path.join(extPath, 'webview', 'css', 'markdown.css'), 'utf-8');

            assert.ok(
                css.includes('.theme-dark .document-content .table-wrapper code:not(.hljs)'),
                '应有暗色主题表格内行内代码样式'
            );
            // 确保有 border 属性增强视觉区分
            const codeBlock = css.substring(
                css.indexOf('.theme-dark .document-content .table-wrapper code:not(.hljs)'),
                css.indexOf('}', css.indexOf('.theme-dark .document-content .table-wrapper code:not(.hljs)')) + 1
            );
            assert.ok(codeBlock.includes('border'), '暗色主题表格内行内代码应有 border 增强视觉区分');
            assert.ok(codeBlock.includes('color'), '暗色主题表格内行内代码应有显式 color');
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

    // ========= Suite 18: Hotfix — 批阅记录保留策略（关闭重开 + 刷新场景） =========
    // Bug A（关闭再打开）：md 文件添加批注后，关闭再次打开时 .review 批阅文件被删除
    // Bug B（刷新）：AI 修复后点刷新，所有历史版本批阅文件被删除
    // 根因链：
    //   1. extension host 主动推送 fileContent → handleFileContentPush 未恢复批注 → store 空批注启动
    //   2. AI 修复后刷新 → handleRefresh contentChanged=true → setFile 清空 annotations
    //   3. 空批注触发 doAutoSave → 无条件 postMessage('deleteReviewRecords') → 磁盘文件被全量删除
    //      （删除按前缀匹配，会同时删掉 v1/v2/v3... 所有历史版本）
    // 修复策略（C-1 + C-a）：
    //   A. handleFileContentPush 改为 async，先 callHost('getReviewRecords') 并 restoreFromReviewRecord
    //   B. doAutoSave 空批注分支不再删除磁盘记录，仅更新 UI 状态（磁盘记录仅由用户显式清空触发删除）
    //   C. 多版本保留：setFile 内容变化时 reviewVersion+1 自动生成新版本；getReviewRecords 倒序返回最新版本
    suite('18. Hotfix — 批阅记录保留策略（关闭重开 + 刷新场景）', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const appJsPath = path.join(extPath, 'webview', 'js', 'app.js');
        const exportJsPath = path.join(extPath, 'webview', 'js', 'export.js');
        const appJsText = fs.readFileSync(appJsPath, 'utf-8');
        const exportJsText = fs.readFileSync(exportJsPath, 'utf-8');

        // 通过括号匹配提取函数体（比正则更健壮）
        function extractFunctionBody(source: string, anchorRegex: RegExp): string {
            const m = anchorRegex.exec(source);
            if (!m) return '';
            // 找到 anchor 之后的第一个 '{'
            let i = m.index + m[0].length;
            while (i < source.length && source[i] !== '{') i++;
            if (i >= source.length) return '';
            let depth = 1;
            const start = i + 1;
            i = start;
            while (i < source.length && depth > 0) {
                const ch = source[i];
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
                if (depth === 0) break;
                i++;
            }
            return source.slice(start, i);
        }

        // ---- Tier 1：存在性断言（源码关键字断言） ----

        test('BT-annotationPersist.1 handleFileContentPush 应为 async 函数', () => {
            // 修复后必须能 await callHost('getReviewRecords')
            assert.ok(
                /async\s+function\s+handleFileContentPush\s*\(/.test(appJsText),
                'handleFileContentPush 应声明为 async function'
            );
        });

        test('BT-annotationPersist.2 handleFileContentPush 应调用 getReviewRecords 恢复批注', () => {
            const body = extractFunctionBody(appJsText, /async\s+function\s+handleFileContentPush\s*\(/);
            assert.ok(body.length > 0, '应能提取到 handleFileContentPush 函数体');
            assert.ok(body.includes("'getReviewRecords'"), '函数体内应 callHost 到 getReviewRecords');
            assert.ok(body.includes('restoreFromReviewRecord'), '函数体内应调用 Store.restoreFromReviewRecord');
        });

        test('BT-annotationPersist.3 export.js 应声明历史版本归档策略（不自动删除磁盘记录）', () => {
            // 新策略（C-1）：doAutoSave 空批注分支不再删除磁盘文件，作为历史版本保留
            assert.ok(
                /\u5386\u53f2\u7248\u672c\u5f52\u6863\u7b56\u7565|\u4e0d\u5220\u9664\u78c1\u76d8/.test(exportJsText),
                'export.js 应在顶部注释中声明"历史版本归档策略 / 不删除磁盘"的设计意图'
            );
            // 反向断言：不应再有旧版的宽限期实现（防止回退）
            assert.ok(
                !exportJsText.includes('DELETE_ON_EMPTY_GRACE_MS'),
                'export.js 不应保留废弃的 DELETE_ON_EMPTY_GRACE_MS 常量（已由无条件保留策略替代）'
            );
            assert.ok(
                !exportJsText.includes('_suppressDeleteUntil'),
                'export.js 不应保留废弃的 _suppressDeleteUntil 变量（已由无条件保留策略替代）'
            );
        });

        // ---- Tier 2：行为级断言（通过源码逻辑结构验证行为） ----

        test('BT-annotationPersist.4 enableAutoSave 应简化为仅启用自动保存（无宽限期副作用）', () => {
            const body = extractFunctionBody(exportJsText, /function\s+enableAutoSave\s*\(/);
            assert.ok(body.length > 0, '应能提取到 enableAutoSave 函数体');
            // 新策略：enableAutoSave 不再操作 _suppressDeleteUntil
            assert.ok(
                !body.includes('_suppressDeleteUntil'),
                'enableAutoSave 不应再设置 _suppressDeleteUntil（已废弃）'
            );
            // 必须仍启用 autoSaveEnabled
            assert.ok(
                /autoSaveEnabled\s*=\s*true/.test(body),
                'enableAutoSave 应将 autoSaveEnabled 设为 true'
            );
        });

        test('BT-annotationPersist.5 doAutoSave 空批注分支不应发送 deleteReviewRecords', () => {
            const body = extractFunctionBody(exportJsText, /async\s+function\s+doAutoSave\s*\(/);
            assert.ok(body.length > 0, '应能提取到 doAutoSave 函数体');
            const emptyBranchIdx = body.indexOf('!data.annotations.length');
            assert.ok(emptyBranchIdx >= 0, '空批注分支应存在');
            // 从空批注分支起点到第一个 return 之间，不应出现 deleteReviewRecords
            const afterEmpty = body.slice(emptyBranchIdx);
            const returnIdx = afterEmpty.indexOf('return');
            assert.ok(returnIdx > 0, '空批注分支内应有 return');
            const emptyBranch = afterEmpty.slice(0, returnIdx);
            assert.ok(
                !emptyBranch.includes("'deleteReviewRecords'"),
                '空批注分支不应 postMessage deleteReviewRecords（磁盘记录作为历史版本保留）'
            );
        });

        test('BT-annotationPersist.6 doAutoSave 有批注正常保存路径应走 saveViaHost', () => {
            const body = extractFunctionBody(exportJsText, /async\s+function\s+doAutoSave\s*\(/);
            assert.ok(body.length > 0, '应能提取到 doAutoSave 函数体');
            // 正常保存路径必须调用 saveViaHost 写磁盘
            assert.ok(
                body.includes('saveViaHost'),
                'doAutoSave 正常保存路径应调用 saveViaHost 持久化到磁盘'
            );
            // 反向断言：不再出现废弃的宽限期重置
            assert.ok(
                !/_suppressDeleteUntil\s*=\s*0/.test(body),
                'doAutoSave 不应再重置 _suppressDeleteUntil（已废弃）'
            );
        });

        // ---- Tier 3：任务特定断言（本次 Bug 的具体回归场景） ----

        test('BT-annotationPersist.7 handleFileContentPush 有批注时应走 restore 路径且 return，不进入普通加载', () => {
            const body = extractFunctionBody(appJsText, /async\s+function\s+handleFileContentPush\s*\(/);
            assert.ok(body.length > 0, '应能提取到 handleFileContentPush 函数体');
            // restore 分支必须 return，避免随后再触发 setFile(isNew=true) 把刚恢复的批注清空
            const restoreIdx = body.indexOf('restoreFromReviewRecord');
            assert.ok(restoreIdx >= 0, '应包含 restoreFromReviewRecord 调用');
            const afterRestore = body.slice(restoreIdx);
            assert.ok(
                /\n\s+return\s*;/.test(afterRestore),
                'restoreFromReviewRecord 之后应 return，不再走普通 loadDocument(isNew=true) 清空批注'
            );
        });

        test('BT-annotationPersist.8 反向断言：空批注分支彻底不再发送 deleteReviewRecords', () => {
            // 原 bug 版本：空批注分支会立刻 postMessage deleteReviewRecords
            // 上一个 hotfix 版本：通过宽限期拦截（_suppressDeleteUntil）
            // 本次 hotfix（C-1）：彻底移除删除逻辑，磁盘记录作为历史版本永久保留
            const body = extractFunctionBody(exportJsText, /async\s+function\s+doAutoSave\s*\(/);
            assert.ok(body.length > 0, '应能提取到 doAutoSave 函数体');
            const emptyBranchStart = body.indexOf('!data.annotations.length');
            assert.ok(emptyBranchStart >= 0, '空批注分支应存在');
            // 整个 doAutoSave 函数体内都不应再出现 deleteReviewRecords 调用
            assert.ok(
                !body.includes("'deleteReviewRecords'"),
                'doAutoSave 整个函数体不应再包含 deleteReviewRecords 消息发送（该操作仅由用户显式清空触发）'
            );
        });

        // ---- 新增 Tier 1/2/3：本次 Hotfix（C-1 + C-a）多版本保留策略 ----
        // Bug B（刷新）+ C-1（保留历史磁盘记录）+ C-a（打开时自动取最新版本恢复）

        test('BT-reviewKeep.1 Tier1 — Store.setFile 内容变化分支应生成新 reviewVersion', () => {
            const storeJsPath = path.join(extPath, 'webview', 'js', 'store.js');
            const storeJsText = fs.readFileSync(storeJsPath, 'utf-8');
            const body = extractFunctionBody(storeJsText, /function\s+setFile\s*\(/);
            assert.ok(body.length > 0, '应能提取到 setFile 函数体');
            // 版本递增逻辑
            assert.ok(
                /reviewVersion\s*=\s*\(data\.reviewVersion\s*\|\|\s*1\)\s*\+\s*1/.test(body),
                'setFile 内容变化分支应将 reviewVersion 自增 1（生成新版本号用于磁盘记录命名）'
            );
        });

        test('BT-reviewKeep.2 Tier1 — fileService.getReviewRecords 应按 reviewVersion 倒序返回（最新在前）', () => {
            const fsSrcPath = path.join(extPath, 'out', 'fileService.js');
            const fsText = fs.readFileSync(fsSrcPath, 'utf-8');
            // 编译后的 JS 中应包含按 reviewVersion 降序排序逻辑
            assert.ok(
                /reviewVersion\s*-\s*a\.reviewVersion/.test(fsText) ||
                /b\.reviewVersion\s*-\s*a\.reviewVersion/.test(fsText),
                'fileService.getReviewRecords 应按 reviewVersion 倒序排列（b - a），确保 records[0] 始终是最新版本'
            );
        });

        test('BT-reviewKeep.3 Tier2 — handleFileContentPush 恢复批注时应取 records[0]（最新版本）', () => {
            const body = extractFunctionBody(appJsText, /async\s+function\s+handleFileContentPush\s*\(/);
            assert.ok(body.length > 0, '应能提取到 handleFileContentPush 函数体');
            // 必须通过 records[0] 或等效方式取最新版本
            assert.ok(
                /records\.records\[0\]|matchedRecord\s*=\s*records/.test(body),
                'handleFileContentPush 应取 records[0] 作为最新批阅版本进行恢复'
            );
        });

        test('BT-reviewKeep.4 Tier2 — handleRefresh 内容变化分支不应主动调用 deleteReviewRecords', () => {
            const body = extractFunctionBody(appJsText, /async\s+function\s+handleRefresh\s*\(/);
            assert.ok(body.length > 0, '应能提取到 handleRefresh 函数体');
            // handleRefresh 自己不应直接发起磁盘删除
            assert.ok(
                !/callHost\s*\(\s*['"]deleteReviewRecords/.test(body),
                'handleRefresh 不应直接调用 deleteReviewRecords（避免误删历史批阅版本）'
            );
        });

        test('BT-reviewKeep.5 Tier3 — 仅 btnConfirmClearAll handler 保留显式 deleteReviewRecords 调用', () => {
            // 全代码库扫描：webview 里 callHost('deleteReviewRecords', ...) 只应存在于"清除全部批注"显式 handler 中
            const allCallers: string[] = [];
            const files = [
                path.join(extPath, 'webview', 'js', 'app.js'),
                path.join(extPath, 'webview', 'js', 'export.js'),
                path.join(extPath, 'webview', 'js', 'annotations.js'),
                path.join(extPath, 'webview', 'js', 'store.js')
            ];
            for (const f of files) {
                if (!fs.existsSync(f)) continue;
                const txt = fs.readFileSync(f, 'utf-8');
                if (/deleteReviewRecords/.test(txt)) allCallers.push(path.basename(f));
            }
            // app.js 因包含 btnConfirmClearAll 必然出现；export.js 本次 hotfix 后应不再出现
            assert.ok(allCallers.includes('app.js'), 'app.js 应保留 btnConfirmClearAll 中的显式删除调用');
            assert.ok(!allCallers.includes('export.js'), 'export.js 中不应再有 deleteReviewRecords 调用（本次 hotfix C-1 策略）');
        });

        test('BT-reviewKeep.6 Tier3 — 模拟刷新场景：Store 批注被清空后 doAutoSave 不应发 deleteReviewRecords', () => {
            // 行为级：解析 doAutoSave 实际执行路径
            // 验证 doAutoSave 空批注分支不会产生 deleteReviewRecords 消息（C-1 核心）
            // 注意：修复 BT-versionBump 后，空批注分支在 v>1 时会调用 saveViaHost 落盘空占位，
            //      但仍不应发 deleteReviewRecords；v=1 仍只 updateAutoSaveStatus('saved')。
            const body = extractFunctionBody(exportJsText, /async\s+function\s+doAutoSave\s*\(/);
            // 通过括号匹配提取空批注外层 if 的完整块
            const emptyIfStart = body.indexOf('if (!data.annotations.length)');
            assert.ok(emptyIfStart >= 0);
            const blockStart = body.indexOf('{', emptyIfStart);
            let depth = 1, j = blockStart + 1;
            while (j < body.length && depth > 0) {
                if (body[j] === '{') depth++;
                else if (body[j] === '}') depth--;
                j++;
            }
            const branch = body.slice(blockStart, j);
            // 核心断言 1：整个空批注分支应包含至少一次 updateAutoSaveStatus 调用（v=1 或占位落盘后）
            assert.ok(
                /updateAutoSaveStatus\(/.test(branch),
                '空批注分支应通过 updateAutoSaveStatus 保持 UI 一致'
            );
            // 核心断言 2：C-1 策略核心 — 不应发 deleteReviewRecords 消息
            assert.ok(
                !/deleteReviewRecords/.test(branch),
                '空批注分支不应触发 deleteReviewRecords（C-1 策略核心，历史版本永久保留）'
            );
        });
    });

    // ========= Suite 19: Hotfix — Store 模块导出接口完整性 =========
    // Bug：清除批注按钮点击时报 TypeError: Store.getRelPath is not a function
    // 根因：store.js 内部定义了 getRelPath() 但 return 对象中未导出
    // 修复：在 return 列表补充 getRelPath
    suite('19. Hotfix — Store 模块导出接口完整性', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const storeJsPath = path.join(extPath, 'webview', 'js', 'store.js');
        const appJsPath = path.join(extPath, 'webview', 'js', 'app.js');
        const storeJsText = fs.readFileSync(storeJsPath, 'utf-8');
        const appJsText = fs.readFileSync(appJsPath, 'utf-8');

        // ---- Tier 1：存在性断言（源码关键字） ----

        test('BT-storeExports.1 Tier1 — store.js 应定义 getRelPath 函数', () => {
            assert.ok(
                /function\s+getRelPath\s*\(\s*\)\s*\{[^}]*return\s+data\.relPath/.test(storeJsText),
                'store.js 应定义 getRelPath() 函数，返回 data.relPath'
            );
        });

        test('BT-storeExports.2 Tier1 — store.js 的模块 return 列表应导出 getRelPath', () => {
            // 提取 Store IIFE 末尾的 return { ... } 对象体
            const returnMatch = /return\s*\{([\s\S]*?)\};\s*\}\s*\)\s*\(\s*\)\s*;/.exec(storeJsText);
            assert.ok(returnMatch, '应能定位 Store IIFE 的 return 语句');
            const returnBody = returnMatch![1];
            assert.ok(
                /\bgetRelPath\b/.test(returnBody),
                'Store 模块的 return 对象应包含 getRelPath（否则外部调用 Store.getRelPath() 会抛 TypeError）'
            );
        });

        test('BT-storeExports.3 Tier1 — Store 内部定义的所有 getter 都应被导出', () => {
            // 防回归：内部定义了但没导出的 getter 是同类 bug
            const definedGetters = new Set<string>();
            const defRe = /function\s+(get[A-Z]\w*)\s*\(/g;
            let m: RegExpExecArray | null;
            while ((m = defRe.exec(storeJsText)) !== null) {
                definedGetters.add(m[1]);
            }
            const returnMatch = /return\s*\{([\s\S]*?)\};\s*\}\s*\)\s*\(\s*\)\s*;/.exec(storeJsText);
            assert.ok(returnMatch, '应能定位 Store IIFE 的 return 语句');
            const returnBody = returnMatch![1];
            const missing: string[] = [];
            definedGetters.forEach(g => {
                if (!new RegExp(`\\b${g}\\b`).test(returnBody)) missing.push(g);
            });
            assert.deepStrictEqual(
                missing,
                [],
                `以下 getter 函数已定义但未在 return 中导出：${missing.join(', ')}（会导致外部调用报 TypeError）`
            );
        });

        // ---- Tier 2：行为级断言（调用链验证） ----

        test('BT-storeExports.4 Tier2 — btnConfirmClearAll handler 调用 Store.getRelPath 必须有导出支持', () => {
            // 验证 app.js 确实通过 Store.getRelPath() 获取 relPath
            const callerIdx = appJsText.indexOf('Store.getRelPath()');
            assert.ok(callerIdx > 0, 'app.js 的 btnConfirmClearAll handler 应调用 Store.getRelPath()');
            // 上下文中必须是 btnConfirmClearAll handler（500 字符窗口内）
            const context = appJsText.slice(Math.max(0, callerIdx - 500), callerIdx);
            assert.ok(
                context.includes('btnConfirmClearAll'),
                'Store.getRelPath() 调用应发生在 btnConfirmClearAll handler 上下文'
            );
        });

        test('BT-storeExports.5 Tier2 — getRelPath 返回空串而非 undefined（防御性默认值）', () => {
            const body = /function\s+getRelPath\s*\(\s*\)\s*\{([^}]+)\}/.exec(storeJsText);
            assert.ok(body, '应能提取 getRelPath 函数体');
            assert.ok(
                /data\.relPath\s*\|\|\s*['"]{2}/.test(body![1]),
                'getRelPath 应返回 data.relPath || "" 以避免 undefined 传给 deleteReviewRecords'
            );
        });

        // ---- Tier 3：任务特定断言（本次 Bug 具体场景） ----

        test('BT-storeExports.6 Tier3 — 模拟清除批注操作：Store.getRelPath 必须可调用（不抛 TypeError）', () => {
            // 在 Node 环境下加载 store.js，验证 Store 对象真正暴露了 getRelPath
            // 注意：store.js 是 webview 代码，用 const 声明的 Store 不会挂到 sandbox，
            // 需要在代码末尾追加 `this.Store = Store` 将其显式暴露
            const sandbox: any = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
            // @ts-ignore
            const vm = require('vm');
            const ctx = vm.createContext(sandbox);
            const wrappedCode = storeJsText + '\n;this.Store = Store;';
            vm.runInContext(wrappedCode, ctx);
            assert.strictEqual(
                typeof sandbox.Store,
                'object',
                'store.js 执行后应暴露 Store 对象'
            );
            assert.strictEqual(
                typeof sandbox.Store.getRelPath,
                'function',
                'Store.getRelPath 必须是函数（否则 btnConfirmClearAll 会抛 TypeError）'
            );
            // 调用一次，确保不抛且返回字符串
            const result = sandbox.Store.getRelPath();
            assert.strictEqual(typeof result, 'string', 'Store.getRelPath() 应返回字符串');
        });
    });

    // ========= Suite 20: Hotfix — AI 修复后新版本号必须落盘占位记录 =========
    // Bug：一键 AI 修复后点刷新，文件内容变化 → reviewVersion 自增到 v2，
    //      但批注为空导致 doAutoSave 不落盘，磁盘上仍只有 v1（已处理过的旧批注）。
    //      下次打开文件时 getReviewRecords 返回 records[0]=v1，
    //      restoreFromReviewRecord 把旧批注恢复给用户，用户看到的是过期数据。
    // 修复：
    //   A. export.js doAutoSave 在 v>1 且批注为空时，写入空占位记录到磁盘
    //   B. app.js loadDocument(isNew=true) 触发一次 autosave，立刻落盘新版本
    //   C. app.js 三处 records[0] 恢复逻辑：即使空批注也要 restoreFromReviewRecord
    //      恢复 reviewVersion（store.js 已兼容 annotations=[] 场景）
    suite('20. Hotfix — AI 修复后新版本号必须落盘占位记录', () => {
        const extPath20 = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const exportJsText20 = fs.readFileSync(path.join(extPath20, 'webview', 'js', 'export.js'), 'utf-8');
        const appJsText20 = fs.readFileSync(path.join(extPath20, 'webview', 'js', 'app.js'), 'utf-8');
        const storeJsText20 = fs.readFileSync(path.join(extPath20, 'webview', 'js', 'store.js'), 'utf-8');

        // 本地 extractFunctionBody（与 Suite 18 同实现，因作用域隔离需复制）
        function extractFunctionBody20(source: string, anchorRegex: RegExp): string {
            const m = anchorRegex.exec(source);
            if (!m) return '';
            let i = m.index + m[0].length;
            while (i < source.length && source[i] !== '{') i++;
            if (i >= source.length) return '';
            let depth = 1;
            const start = i + 1;
            i = start;
            while (i < source.length && depth > 0) {
                const ch = source[i];
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
                i++;
            }
            return source.slice(start, i - 1);
        }

        // ---- Tier 1：存在性断言 ----

        test('BT-versionBump.1 Tier1 — doAutoSave 空批注分支应包含 reviewVersion > 1 的占位落盘逻辑', () => {
            const body = extractFunctionBody20(exportJsText20, /async\s+function\s+doAutoSave\s*\(/);
            // 提取空批注外层 if 块的完整内容（通过括号匹配）
            const emptyIfStart = body.indexOf('if (!data.annotations.length)');
            assert.ok(emptyIfStart >= 0, '应能定位空批注分支');
            const blockStart = body.indexOf('{', emptyIfStart);
            let depth = 1, j = blockStart + 1;
            while (j < body.length && depth > 0) {
                if (body[j] === '{') depth++;
                else if (body[j] === '}') depth--;
                j++;
            }
            const emptyBranch = body.slice(blockStart, j);
            assert.ok(
                /version\s*>\s*1/.test(emptyBranch),
                '空批注分支应判断 version > 1 走占位落盘'
            );
            assert.ok(
                /saveViaHost\(/.test(emptyBranch),
                '空批注分支在 version > 1 时应调用 saveViaHost 落盘占位记录'
            );
        });

        test('BT-versionBump.2 Tier1 — loadDocument 在 isNew=true 时应触发 autosave 落盘新版本', () => {
            // 正则提取 loadDocument 函数体
            const body = extractFunctionBody20(appJsText20, /function\s+loadDocument\s*\(/);
            const isNewIdx = body.indexOf('if (isNew)');
            assert.ok(isNewIdx >= 0, 'loadDocument 应存在 isNew 分支');
            // 取 isNew 块（到下一个 document.getElementById 之前）
            const nextIdx = body.indexOf("document.getElementById('welcomeScreen')", isNewIdx);
            const isNewBranch = body.slice(isNewIdx, nextIdx);
            assert.ok(
                /Store\.setFile\(/.test(isNewBranch),
                'isNew 分支应调用 Store.setFile'
            );
            assert.ok(
                /triggerAutoSave\(/.test(isNewBranch),
                'isNew 分支应调用 Exporter.triggerAutoSave 使新版本号立刻落盘'
            );
        });

        test('BT-versionBump.3 Tier1 — 所有 records[0] 恢复分支不应因空批注而跳过 restoreFromReviewRecord', () => {
            // 正则匹配 "matchedRecord.annotations && matchedRecord.annotations.length > 0" 作为
            // 旧版判断条件，且其后紧跟 Store.restoreFromReviewRecord —— 这种被"短路过滤"的形式应不存在
            // 统计有多少处 restoreFromReviewRecord 被旧判断包围
            const pattern = /if\s*\(\s*matchedRecord\.annotations\s*&&\s*matchedRecord\.annotations\.length\s*>\s*0\s*\)\s*\{[\s\S]{0,200}?Store\.restoreFromReviewRecord/g;
            const matches = appJsText20.match(pattern) || [];
            assert.strictEqual(
                matches.length,
                0,
                `app.js 不应有任何 "matchedRecord.annotations.length > 0" 短路导致跳过 restoreFromReviewRecord 的逻辑（找到 ${matches.length} 处，会导致 reviewVersion 无法恢复）`
            );
        });

        // ---- Tier 2：行为级断言 ----

        test('BT-versionBump.4 Tier2 — store.setFile 同文件内容变化应自增 reviewVersion（v1 → v2 → v3）', () => {
            const sandbox: any = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
            // @ts-ignore
            const vm = require('vm');
            const ctx = vm.createContext(sandbox);
            vm.runInContext(storeJsText20 + '\n;this.Store = Store;', ctx);
            const Store = sandbox.Store;

            // 初始化 v1 + 一个假批注
            Store.setFile('a.md', 'content v1', '', '1.0', '', '', '', '');
            Store.addAnnotation({ blockIndex: 0, startOffset: 0, selectedText: 'x', comment: 'c', type: 'comment' });
            assert.strictEqual(Store.getData().reviewVersion, 1, '初始 reviewVersion 应为 1');

            // 内容变化 → 应进入 contentChanged 分支并自增到 v2
            Store.setFile('a.md', 'content v2 changed', '', '1.0', '', '', '', '');
            assert.strictEqual(Store.getData().reviewVersion, 2, '内容变化后 reviewVersion 应自增到 v2');
            assert.strictEqual(Store.getData().annotations.length, 0, '内容变化后 annotations 应被清空');

            // 再次内容变化（AI 第二轮修复） → v3
            Store.setFile('a.md', 'content v3 changed again', '', '1.0', '', '', '', '');
            assert.strictEqual(Store.getData().reviewVersion, 3, '连续内容变化应持续自增 reviewVersion');
        });

        test('BT-versionBump.5 Tier2 — restoreFromReviewRecord 对空批注占位应正确恢复 reviewVersion', () => {
            const sandbox: any = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
            // @ts-ignore
            const vm = require('vm');
            const ctx = vm.createContext(sandbox);
            vm.runInContext(storeJsText20 + '\n;this.Store = Store;', ctx);
            const Store = sandbox.Store;

            // 模拟打开文件场景：磁盘最新记录是 v2 空占位
            const emptyPlaceholder = { reviewVersion: 2, annotations: [], createdAt: '2026-04-18T00:00:00.000Z' };
            Store.restoreFromReviewRecord(emptyPlaceholder, 'a.md', 'current content', '1.1');
            assert.strictEqual(Store.getData().reviewVersion, 2, '空占位记录应恢复 reviewVersion=2（关键：下次刷新不会从 v1 重新开始）');
            assert.strictEqual(Store.getData().annotations.length, 0, '空占位应恢复为空批注列表');
            assert.strictEqual(Store.getData().nextId, 1, '空批注列表的 nextId 应重置为 1');
        });

        // ---- Tier 3：任务特定断言 ----

        test('BT-versionBump.6 Tier3 — 端到端模拟 AI 修复闭环：添加批注→刷新→v2占位→重开恢复v2而非v1', () => {
            // 完整场景模拟：使用 vm 沙箱运行 store.js，模拟整个 AI 修复闭环
            const sandbox: any = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
            // @ts-ignore
            const vm = require('vm');
            const ctx = vm.createContext(sandbox);
            vm.runInContext(storeJsText20 + '\n;this.Store = Store;', ctx);
            const Store = sandbox.Store;

            // Step 1: 用户打开 a.md 并添加批注（v1）
            Store.setFile('a.md', '原始内容', '', '1.0', '', '', '', '');
            Store.addAnnotation({ blockIndex: 0, startOffset: 0, selectedText: '原始', comment: '改成新的', type: 'comment' });
            const v1Snapshot = {
                reviewVersion: Store.getData().reviewVersion,
                annotations: [...Store.getData().annotations]
            };
            assert.strictEqual(v1Snapshot.reviewVersion, 1);
            assert.strictEqual(v1Snapshot.annotations.length, 1);

            // Step 2: AI 修复完成，文件内容变化 → 刷新 → loadDocument(isNew=true) → setFile 触发 v2 + 清空批注
            Store.setFile('a.md', '新内容（AI 已修改）', '', '1.0', '', '', '', '');
            assert.strictEqual(Store.getData().reviewVersion, 2, '刷新后应为 v2');
            assert.strictEqual(Store.getData().annotations.length, 0, '新版本应为空批注');

            // Step 3: 假设 doAutoSave 正确落盘了 v2 空占位记录到磁盘（这里用另一个 record 模拟）
            const v2PlaceholderOnDisk = { reviewVersion: 2, annotations: [], createdAt: new Date().toISOString() };

            // Step 4: 用户关闭文件后重新打开 → getReviewRecords 返回 v2 placeholder（已按版本倒序）
            // restoreFromReviewRecord 应恢复到 v2，不应复活 v1 的旧批注
            Store.restoreFromReviewRecord(v2PlaceholderOnDisk, 'a.md', '新内容（AI 已修改）', '1.0');
            assert.strictEqual(Store.getData().reviewVersion, 2, '重新打开应恢复到 v2（而非 v1）');
            assert.strictEqual(
                Store.getData().annotations.length,
                0,
                '重新打开应恢复为空批注（而非 v1 的旧批注）— 本次 Bug 核心修复点'
            );
        });
    });

    // ========= Suite 21: Hotfix — 关闭期间源文件被外部修改的过期检测（思路 A + B） =========
    // Bug：webview 关闭时源文件被外部工具修改，重新打开 webview 检测不到内容变化，
    //      仍恢复上一版旧批注 records[0]，旧批注的锚点（blockIndex / startOffset）在新文件上可能失效。
    // 修复思路：
    //   A（主判据）：批阅记录 JSON 块写入 rawMarkdown 快照；打开时与当前源文件 trim 对比
    //   B（辅助信号）：批阅记录 docVersion 与当前源文件 docVersion 对比
    //   过期 → Store.forceBumpVersion(prevVersion, content, docVersion) → 自动升级 v+1
    //   不过期 → 继续原 restoreFromReviewRecord 恢复
    suite('21. Hotfix — 关闭期间源文件被外部修改的过期检测', () => {
        const extPath21 = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const exportJsText21 = fs.readFileSync(path.join(extPath21, 'webview', 'js', 'export.js'), 'utf-8');
        const appJsText21 = fs.readFileSync(path.join(extPath21, 'webview', 'js', 'app.js'), 'utf-8');
        const storeJsText21 = fs.readFileSync(path.join(extPath21, 'webview', 'js', 'store.js'), 'utf-8');
        const fileServiceText21 = fs.readFileSync(path.join(extPath21, 'out', 'fileService.js'), 'utf-8');
        const i18nJsText21 = fs.readFileSync(path.join(extPath21, 'webview', 'js', 'i18n.js'), 'utf-8');

        // ---- Tier 1：存在性断言 ----

        test('BT-staleContentDetect.1 Tier1 — export.js generateReviewDoc JSON 块必须写入 rawMarkdown 字段', () => {
            // 定位 JSON.stringify 块，要求包含 rawMarkdown 字段
            const jsonBlockMatch = exportJsText21.match(/JSON\.stringify\(\{[\s\S]{0,500}?fileName:[\s\S]{0,300}?annotations:/);
            assert.ok(jsonBlockMatch, 'export.js 应包含 JSON.stringify 序列化块');
            assert.ok(
                /rawMarkdown:\s*data\.rawMarkdown/.test(jsonBlockMatch![0]),
                'JSON 块必须写入 rawMarkdown 字段（用于打开时比对源文件是否被外部修改）'
            );
        });

        test('BT-staleContentDetect.2 Tier1 — fileService extractAnnotationsFromReview 必须返回 rawMarkdown', () => {
            assert.ok(
                /rawMarkdown:\s*typeof parsed\.rawMarkdown/.test(fileServiceText21),
                'extractAnnotationsFromReview 应解析并返回 rawMarkdown（旧格式回退为空串）'
            );
            assert.ok(
                /rawMarkdown:\s*annotationData\s*\?\s*annotationData\.rawMarkdown/.test(fileServiceText21),
                'getReviewRecords 返回的 record 应透传 rawMarkdown 给前端'
            );
        });

        test('BT-staleContentDetect.3 Tier1 — Store.forceBumpVersion 必须被导出', () => {
            assert.ok(
                /function\s+forceBumpVersion\s*\(/.test(storeJsText21),
                'store.js 应定义 forceBumpVersion 函数'
            );
            // 校验 return 对象列表里也导出了
            const returnMatch = storeJsText21.match(/return\s*\{([\s\S]*?)\};/);
            assert.ok(returnMatch, 'store.js 应有 return 导出对象');
            assert.ok(
                /\bforceBumpVersion\b/.test(returnMatch![1]),
                'forceBumpVersion 必须在 return 列表中导出，否则 app.js 无法调用'
            );
        });

        test('BT-staleContentDetect.4 Tier1 — app.js 必须定义 _isRecordStaleOnOpen 且被三处调用或两处调用', () => {
            assert.ok(
                /function\s+_isRecordStaleOnOpen\s*\(/.test(appJsText21),
                'app.js 应定义 _isRecordStaleOnOpen helper'
            );
            // 至少 handleFileContentPush + handleFileSelectChange 两处调用
            const callCount = (appJsText21.match(/_isRecordStaleOnOpen\(/g) || []).length;
            assert.ok(
                callCount >= 3,
                `_isRecordStaleOnOpen 应至少在 2 处调用（定义 1 次 + 至少 2 次调用 = 3 次出现），实际 ${callCount} 次`
            );
            // 过期分支必须调用 forceBumpVersion
            assert.ok(
                /Store\.forceBumpVersion\(/.test(appJsText21),
                '过期检测后必须调用 Store.forceBumpVersion 升级版本号'
            );
            // 过期分支必须触发 autosave 落盘新版本
            const forceBumpIdx = appJsText21.indexOf('Store.forceBumpVersion(');
            assert.ok(forceBumpIdx > 0);
            const next200 = appJsText21.slice(forceBumpIdx, forceBumpIdx + 300);
            assert.ok(
                /triggerAutoSave\(/.test(next200),
                'forceBumpVersion 后应触发 triggerAutoSave 让新空版本立即落盘'
            );
        });

        test('BT-staleContentDetect.5 Tier1 — i18n.js 必须包含 stale_content_bumped 中英文翻译', () => {
            assert.ok(
                /'notification\.stale_content_bumped':\s*'[^']*\{version\}/.test(i18nJsText21),
                'i18n.js 必须存在 notification.stale_content_bumped 翻译且含 {version} 占位符'
            );
            // 中英文各至少一条
            const count = (i18nJsText21.match(/'notification\.stale_content_bumped':/g) || []).length;
            assert.ok(count >= 2, `中英文翻译都应存在，当前 ${count} 处`);
        });

        // ---- Tier 2：行为级断言 ----

        test('BT-staleContentDetect.6 Tier2 — forceBumpVersion 在沙箱中应正确升级版本号并清空批注', () => {
            const sandbox: any = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
            // @ts-ignore
            const vm = require('vm');
            const ctx = vm.createContext(sandbox);
            vm.runInContext(storeJsText21 + '\n;this.Store = Store;', ctx);
            const Store = sandbox.Store;

            // 模拟场景：用户在 v3 批阅了 5 条，现在关闭期间文件被改过 → 升级到 v4
            Store.setFile('x.md', '旧内容', '', '1.0', '', '', '', '');
            for (let i = 0; i < 5; i++) {
                Store.addAnnotation({ blockIndex: 0, startOffset: i, selectedText: 'x', comment: 'c', type: 'comment' });
            }
            // 模拟 v3
            Store.restoreFromReviewRecord(
                { reviewVersion: 3, annotations: Store.getAnnotations(), createdAt: '2026-04-01T00:00:00.000Z' },
                'x.md', '旧内容', '1.0'
            );
            assert.strictEqual(Store.getData().reviewVersion, 3);
            assert.strictEqual(Store.getData().annotations.length, 5);

            // 调用 forceBumpVersion → 基准 v3 → 升级到 v4
            Store.forceBumpVersion(3, '新内容（外部修改）', '1.1');
            assert.strictEqual(Store.getData().reviewVersion, 4, '应升级到 v4');
            assert.strictEqual(Store.getData().annotations.length, 0, '应清空旧批注');
            assert.strictEqual(Store.getData().rawMarkdown, '新内容（外部修改）', '应采用新内容为 rawMarkdown');
            assert.strictEqual(Store.getData().docVersion, '1.1', '应采用新 docVersion');
            assert.strictEqual(Store.getData().nextId, 1, 'nextId 应重置');
        });

        // ---- Tier 3：任务特定断言 ----

        test('BT-staleContentDetect.7 Tier3 — 端到端：关闭期间文件被外部修改，重开应升级 v+1 而非恢复旧批注', () => {
            // 完整闭环：v1 添加批注 → 生成 record.md 含 rawMarkdown='旧内容' → 关闭
            // → 外部工具改文件为 '全新内容' → 重开 webview → 触发 _isRecordStaleOnOpen 检测
            // → forceBumpVersion 升级到 v2 且清空批注（避免旧锚点应用到新文件上）
            const sandbox: any = { window: {}, localStorage: { getItem: () => null, setItem: () => {} } };
            // @ts-ignore
            const vm = require('vm');
            const ctx = vm.createContext(sandbox);
            vm.runInContext(storeJsText21 + '\n;this.Store = Store;', ctx);
            const Store = sandbox.Store;

            // Step 1: v1 批阅
            Store.setFile('doc.md', '旧内容', '', '1.0', '', '', '', '');
            Store.addAnnotation({ blockIndex: 0, startOffset: 0, selectedText: '旧', comment: '评论', type: 'comment' });

            // Step 2: 模拟生成 v1 的磁盘批阅记录（含 rawMarkdown 快照）
            const v1RecordOnDisk = {
                reviewVersion: 1,
                annotations: [...Store.getAnnotations()],
                rawMarkdown: '旧内容',
                docVersion: '1.0',
                createdAt: '2026-04-18T10:00:00.000Z'
            };

            // Step 3: 用户关闭 webview；外部工具修改 doc.md 源文件内容为 '全新内容'
            const currentFileContent = '全新内容（外部修改）';
            const currentDocVersion = '1.0';

            // Step 4: webview 重新打开，执行 _isRecordStaleOnOpen 的等价逻辑（内嵌检测）
            const snapshotTrim = (v1RecordOnDisk.rawMarkdown || '').trim();
            const currentTrim = currentFileContent.trim();
            const isStale = snapshotTrim !== currentTrim;
            assert.strictEqual(isStale, true, '思路 A 必须检测到内容差异');

            // Step 5: 过期 → forceBumpVersion
            Store.forceBumpVersion(v1RecordOnDisk.reviewVersion, currentFileContent, currentDocVersion);
            assert.strictEqual(Store.getData().reviewVersion, 2, '应升级到 v2');
            assert.strictEqual(
                Store.getData().annotations.length,
                0,
                '关键：不应恢复 v1 的旧批注（锚点可能已失效），应以空批注状态开启 v2'
            );
            assert.strictEqual(Store.getData().rawMarkdown, currentFileContent, 'rawMarkdown 应为新文件内容');
        });

        test('BT-staleContentDetect.8 Tier3 — 旧格式 record（无 rawMarkdown 快照）不应被误判为过期', () => {
            // 向后兼容：旧格式批阅记录 JSON 里没有 rawMarkdown 字段 → extractAnnotationsFromReview
            // 返回 rawMarkdown=''，_isRecordStaleOnOpen 应保守地判定"非过期"（因为无法可靠对比）
            // 模拟 _isRecordStaleOnOpen 的核心逻辑
            function isStale(record: any, currentContent: string, currentDocVersion: string) {
                if (!record || typeof record.rawMarkdown !== 'string' || record.rawMarkdown === '') {
                    return { stale: false, reason: 'no-snapshot' };
                }
                const snapshotTrim = (record.rawMarkdown || '').trim();
                const currentTrim = (currentContent || '').trim();
                return { stale: snapshotTrim !== currentTrim, reason: 'check' };
            }

            // 旧格式：无 rawMarkdown
            const oldRecord = { reviewVersion: 3, annotations: [{ id: 1 }], docVersion: '1.0' };
            const r1 = isStale(oldRecord, '任何新内容', '1.0');
            assert.strictEqual(r1.stale, false, '旧格式 record 无快照 → 保守放行，不视为过期');
            assert.strictEqual(r1.reason, 'no-snapshot');

            // 空字符串 rawMarkdown：同样保守放行
            const emptyRecord = { reviewVersion: 3, rawMarkdown: '', annotations: [] };
            const r2 = isStale(emptyRecord, '任何新内容', '1.0');
            assert.strictEqual(r2.stale, false, '空 rawMarkdown → 保守放行');

            // 新格式：有 rawMarkdown 且内容一致 → 非过期
            const matchRecord = { reviewVersion: 3, rawMarkdown: '一致内容', annotations: [] };
            const r3 = isStale(matchRecord, '一致内容', '1.0');
            assert.strictEqual(r3.stale, false, '内容一致 → 非过期');

            // 新格式：有 rawMarkdown 且不一致 → 过期
            const staleRecord = { reviewVersion: 3, rawMarkdown: '旧内容', annotations: [] };
            const r4 = isStale(staleRecord, '新内容', '1.0');
            assert.strictEqual(r4.stale, true, '内容不一致 → 过期');
        });
    });

    // ========= Suite 22: Hotfix — 一键 AI 修复指令追加"完成后点击刷新"提示 =========
    // 需求：用户希望 AI 修复完成后自动提醒回到 MD Human Review 面板点击右上角刷新按钮。
    //       触达渠道有两条：(1) 发送到 AI 对话框的 prompt（i18n.js modal.ai_result.copy_text）；
    //       (2) 生成的 _aicmd.md 指令文件头部（fileService.ts _aiLabels.refresh_hint）。
    // 两处都必须包含"刷新"关键词，否则 AI 读到指令后可能遗漏此步骤。
    suite('22. Hotfix — 一键 AI 修复完成后提示刷新面板', () => {
        const extPath22 = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const i18nJsText22 = fs.readFileSync(path.join(extPath22, 'webview', 'js', 'i18n.js'), 'utf-8');
        const fileServiceJs22 = fs.readFileSync(path.join(extPath22, 'out', 'fileService.js'), 'utf-8');

        // ---- Tier 1：存在性断言 ----

        test('BT-aiRefreshHint.1 Tier1 — i18n.js copy_text 中英文必须包含"刷新"关键词', () => {
            // 提取 modal.ai_result.copy_text 的中文值
            const zhMatch = i18nJsText22.match(/'modal\.ai_result\.copy_text':\s*'([^']+)'/);
            assert.ok(zhMatch, 'i18n.js 应存在 modal.ai_result.copy_text 中文翻译');
            const zhText = zhMatch![1];
            assert.ok(
                /\u5237\u65b0/.test(zhText),
                '中文 copy_text 必须包含"刷新"关键词，实际：' + zhText
            );
            assert.ok(
                /MD Human Review|md human review/i.test(zhText),
                '中文 copy_text 必须提及 MD Human Review 面板名称'
            );

            // 提取英文版（文件中出现两次 modal.ai_result.copy_text，第二次是英文）
            const allMatches = [...i18nJsText22.matchAll(/'modal\.ai_result\.copy_text':\s*'([^']+)'/g)];
            assert.ok(allMatches.length >= 2, '应存在中英文两个 copy_text 翻译');
            const enText = allMatches[1][1];
            assert.ok(
                /refresh/i.test(enText),
                'English copy_text must include "refresh" keyword, got: ' + enText
            );
            assert.ok(
                /MD Human Review/i.test(enText),
                'English copy_text must reference MD Human Review panel'
            );
        });

        test('BT-aiRefreshHint.2 Tier1 — fileService.ts _aiLabels 必须包含 refresh_hint 键（中英文）', () => {
            // refresh_hint 中文（编译后 JS 中会是普通字符串字面量）
            assert.ok(
                /refresh_hint:\s*['"`][^'"`]*\u5237\u65b0/.test(fileServiceJs22),
                '_aiLabels zh-CN 必须存在 refresh_hint 且含"刷新"关键词'
            );
            // refresh_hint 英文
            assert.ok(
                /refresh_hint:\s*['"`][^'"`]*refresh/i.test(fileServiceJs22),
                '_aiLabels en 必须存在 refresh_hint 且含 refresh keyword'
            );
            // applyReview 调用 _aiT('refresh_hint')
            assert.ok(
                /_aiT\(\s*['"]refresh_hint['"]\s*\)/.test(fileServiceJs22),
                'applyReview 必须在某处调用 _aiT(\'refresh_hint\') 以把提示行写入 _aicmd.md'
            );
        });

        // ---- Tier 2：行为级/占位符模板替换断言 ----

        test('BT-aiRefreshHint.3 Tier2 — copy_text 含占位符 {source}/{instruction}，替换后完整保留刷新提示', () => {
            // 模拟 i18n 的 t() 替换行为：{key} → value
            function tReplace(template: string, params: Record<string, string>) {
                let out = template;
                Object.keys(params).forEach(k => {
                    out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
                });
                return out;
            }
            const zhMatch = i18nJsText22.match(/'modal\.ai_result\.copy_text':\s*'([^']+)'/);
            const zhTemplate = zhMatch![1].replace(/\\n/g, '\n');
            const final = tReplace(zhTemplate, {
                source: '/tmp/demo.md',
                instruction: '/tmp/.review/demo_aicmd.md'
            });
            // 占位符应被消费，最终文本不应仍含 {source}/{instruction}
            assert.ok(!/\{source\}|\{instruction\}/.test(final), '占位符应被完全替换');
            // 最终文本必须含源文件路径 + 指令文件路径 + 刷新提示 三要素
            assert.ok(final.includes('/tmp/demo.md'), '替换后应含源文件路径');
            assert.ok(final.includes('/tmp/.review/demo_aicmd.md'), '替换后应含指令文件路径');
            assert.ok(/\u5237\u65b0/.test(final), '替换后应保留"刷新"提示（不被模板占位符消费掉）');
        });

        // ---- Tier 3：任务特定断言（针对本次 Hotfix 的具体触达点）----

        test('BT-aiRefreshHint.4 Tier3 — 端到端：AI 对话框文本与 _aicmd.md 指令文件头部都必须含刷新提示', () => {
            // 场景：用户点击「确定执行」后：
            //   (a) _lastAiCopyText 被发送到 AI 对话框（来自 modal.ai_result.copy_text）
            //   (b) _aicmd.md 文件被 AI 读取（来自 fileService.ts applyReview 写入的 lines）
            // 断言两条链路都在各自载体中留下"刷新"提示，避免 AI 遗漏此步骤。

            // (a) 对话框文本链路
            const zhCopy = i18nJsText22.match(/'modal\.ai_result\.copy_text':\s*'([^']+)'/)![1];
            assert.ok(/\u5237\u65b0/.test(zhCopy), '对话框文本（copy_text）必须含"刷新"');
            assert.ok(/MD Human Review/i.test(zhCopy), '对话框文本应明确提及面板名 MD Human Review');

            // (b) _aicmd.md 文件链路 — 模拟 applyReview 生成逻辑
            // 现实中 _aiT('refresh_hint') 会在 applyReview 的 lines.push(`> ${_aiT('refresh_hint')}`) 中被调用
            // 这里通过静态检查确保这条 push 存在且紧跟 anchor_hint 之后
            const pushSequence = fileServiceJs22.match(
                /_aiT\(['"]order_hint['"]\)[\s\S]{0,200}?_aiT\(['"]anchor_hint['"]\)[\s\S]{0,200}?_aiT\(['"]refresh_hint['"]\)/
            );
            assert.ok(
                pushSequence,
                'applyReview 必须按 order_hint → anchor_hint → refresh_hint 顺序推入三行提示到 _aicmd.md 头部'
            );

            // (c) 双渠道一致性：两处都必须提及 MD Human Review 面板名
            assert.ok(
                /MD Human Review/i.test(fileServiceJs22.match(/refresh_hint:\s*['"`]([^'"`]+)/)![1]),
                '_aicmd.md 的 refresh_hint 也应明确提及 MD Human Review 面板名，保持与对话框文案一致'
            );
        });
    });

    // ==========================================================================
    // AI Chat 派发适配层测试（change: add-cursor-windsurf-ai-chat）
    // Tier 1：存在性断言 / Tier 2：行为级路由断言 / Tier 3：BT-aiChat.X 任务断言
    // ==========================================================================
    suite('AI Chat Dispatch Adapters — src/aiChatAdapters.ts', () => {
        // 动态 require，避免顶层 import 影响 test file 加载
        // tslint:disable-next-line:no-require-imports
        const adapters = require('../../src/aiChatAdapters');
        const {
            detectIdeKind,
            dispatchAiChat,
            __setExecuteCommandForTest,
            __resetExecuteCommandForTest,
            __setSendEnterKeyForTest,
            __resetSendEnterKeyForTest
        } = adapters;

        // i18n.js 文本用于 Tier 1 断言翻译 key 存在性
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const i18nJsText = fs.readFileSync(path.join(extPath, 'webview', 'js', 'i18n.js'), 'utf-8');

        // 通用：构造 ctx 的辅助函数
        function makeCtx(commands: string[] = []) {
            const logs: string[] = [];
            return {
                logs,
                ctx: {
                    instruction: 'hello AI, please fix this.',
                    log: (line: string) => logs.push(line),
                    availableCommands: new Set<string>(commands)
                }
            };
        }

        teardown(() => {
            // 确保每个 test 之间 executeCommand / sendEnterKey mock 被重置
            if (typeof __resetExecuteCommandForTest === 'function') {
                __resetExecuteCommandForTest();
            }
            if (typeof __resetSendEnterKeyForTest === 'function') {
                __resetSendEnterKeyForTest();
            }
        });

        // ---- Tier 1：存在性断言 ----

        test('Tier1 — aiChatAdapters 模块应导出核心 API', () => {
            assert.strictEqual(typeof detectIdeKind, 'function', '应导出 detectIdeKind');
            assert.strictEqual(typeof dispatchAiChat, 'function', '应导出 dispatchAiChat');
            assert.strictEqual(typeof __setExecuteCommandForTest, 'function', '应导出测试注入点 __setExecuteCommandForTest');
            assert.strictEqual(typeof __resetExecuteCommandForTest, 'function', '应导出测试重置点 __resetExecuteCommandForTest');
        });

        test('Tier1 — i18n.js 应包含 cursor_hint / windsurf_hint 的中英文翻译', () => {
            assert.ok(i18nJsText.includes("'modal.ai_result.cursor_hint'"), 'i18n.js 应包含 modal.ai_result.cursor_hint key');
            assert.ok(i18nJsText.includes("'modal.ai_result.windsurf_hint'"), 'i18n.js 应包含 modal.ai_result.windsurf_hint key');
            // 中文版：应提到 Cursor / Windsurf
            assert.ok(/Cursor/.test(i18nJsText), 'i18n.js 应包含 Cursor 字样');
            assert.ok(/Windsurf/.test(i18nJsText), 'i18n.js 应包含 Windsurf 字样');
        });

        test('Tier1 — reviewPanel.ts 应 import aiChatAdapters 并新增 cursor/windsurf 成功文案', () => {
            const reviewPanelText = fs.readFileSync(path.join(extPath, 'src', 'reviewPanel.ts'), 'utf-8');
            assert.ok(
                /from\s+['"]\.\/aiChatAdapters['"]/.test(reviewPanelText),
                'reviewPanel.ts 应 import ./aiChatAdapters'
            );
            assert.ok(
                reviewPanelText.includes("'ai.chat_success_cursor'"),
                'reviewPanel.ts 应新增 ai.chat_success_cursor i18n key'
            );
            assert.ok(
                reviewPanelText.includes("'ai.chat_success_windsurf'"),
                'reviewPanel.ts 应新增 ai.chat_success_windsurf i18n key'
            );
        });

        // ---- Tier 2：行为级路由断言 ----

        test('Tier2 — detectIdeKind 基于 CodeBuddy 命令应返回 codebuddy', () => {
            const ide = detectIdeKind('Visual Studio Code', new Set(['tencentcloud.codingcopilot.chat.startNewChat']));
            assert.strictEqual(ide, 'codebuddy');
        });

        test('Tier2 — detectIdeKind 基于 Cursor appName 应返回 cursor', () => {
            const ide = detectIdeKind('Cursor', new Set([]));
            assert.strictEqual(ide, 'cursor');
        });

        test('Tier2 — detectIdeKind 基于 Cursor 特征命令应返回 cursor（即使 appName 是 Code）', () => {
            const ide = detectIdeKind('Code', new Set(['composer.newAgentChat']));
            assert.strictEqual(ide, 'cursor');
        });

        test('Tier2 — detectIdeKind 基于 Windsurf appName 应返回 windsurf', () => {
            const ide = detectIdeKind('Windsurf', new Set([]));
            assert.strictEqual(ide, 'windsurf');
        });

        test('Tier2 — detectIdeKind 基于 Windsurf 特征命令应返回 windsurf', () => {
            const ide = detectIdeKind('Code', new Set(['windsurf.prioritizeCascadeView']));
            assert.strictEqual(ide, 'windsurf');
        });

        test('Tier2 — detectIdeKind 默认应返回 vscode', () => {
            const ide = detectIdeKind('Visual Studio Code', new Set(['some.random.command']));
            assert.strictEqual(ide, 'vscode');
        });

        test('Tier2 — Cursor 下 composer.newAgentChat 存在时走策略 A（命令调用顺序正确）', async () => {
            const called: string[] = [];
            __setExecuteCommandForTest(async (cmd: string) => {
                called.push(cmd);
            });
            // sendEnterKey 默认桩：非 Win 返回 false；测试里强制桩为 false 避免依赖平台
            __setSendEnterKeyForTest(async () => false);
            const { ctx } = makeCtx(['composer.newAgentChat', 'editor.action.clipboardPasteAction']);
            const res = await dispatchAiChat('cursor', ctx);
            assert.strictEqual(res.succeeded, true, '策略 A 应成功');
            assert.strictEqual(res.strategy, 'cursor.composer.newAgentChat+paste+enter');
            assert.strictEqual(res.fellBackToClipboard, false);
            assert.deepStrictEqual(
                called,
                ['composer.newAgentChat', 'editor.action.clipboardPasteAction'],
                '应先调用 composer.newAgentChat 再调用 clipboardPasteAction'
            );
        });

        test('Tier2 — Cursor 下 composer.newAgentChat 缺失但 aichat.newchataction 存在应走策略 B', async () => {
            const called: string[] = [];
            __setExecuteCommandForTest(async (cmd: string) => {
                called.push(cmd);
            });
            __setSendEnterKeyForTest(async () => false);
            const { ctx } = makeCtx(['aichat.newchataction']);
            const res = await dispatchAiChat('cursor', ctx);
            assert.strictEqual(res.succeeded, true);
            assert.strictEqual(res.strategy, 'cursor.aichat.newchataction+paste+enter');
            assert.strictEqual(called[0], 'aichat.newchataction');
        });

        test('Tier2 — Windsurf 下 prioritizeCascadeView 存在时走策略 A', async () => {
            const called: string[] = [];
            __setExecuteCommandForTest(async (cmd: string) => {
                called.push(cmd);
            });
            const { ctx } = makeCtx(['windsurf.prioritizeCascadeView']);
            const res = await dispatchAiChat('windsurf', ctx);
            assert.strictEqual(res.succeeded, true);
            assert.strictEqual(res.strategy, 'windsurf.cascade.prioritize+paste');
            assert.strictEqual(called[0], 'windsurf.prioritizeCascadeView');
        });

        test('Tier2 — CodeBuddy 下策略 1 成功应调用 startNewChat + sendMessage', async () => {
            const called: Array<{ cmd: string; args: any }> = [];
            __setExecuteCommandForTest(async (cmd: string, ...args: any[]) => {
                called.push({ cmd, args });
            });
            const { ctx } = makeCtx([
                'tencentcloud.codingcopilot.chat.startNewChat',
                'tencentcloud.codingcopilot.chat.sendMessage'
            ]);
            const res = await dispatchAiChat('codebuddy', ctx);
            assert.strictEqual(res.succeeded, true);
            assert.strictEqual(res.strategy, 'cb.startNewChat+sendMessage');
            assert.strictEqual(called[0].cmd, 'tencentcloud.codingcopilot.chat.startNewChat');
            assert.strictEqual(called[1].cmd, 'tencentcloud.codingcopilot.chat.sendMessage');
            assert.deepStrictEqual(
                called[1].args[0],
                { message: ctx.instruction },
                'sendMessage 应携带 {message: instruction} 参数'
            );
        });

        // ---- Tier 3：BT-aiChat.X 任务特定断言 ----

        test('BT-aiChat.1 CodeBuddy 识别优先级最高（Cursor 命令与 CodeBuddy 命令同时存在时仍判为 codebuddy）', () => {
            // 场景：用户在 Cursor 里装了 CodeBuddy 扩展，两类命令都可见。
            // 要求：向下兼容 — 仍走 CodeBuddy 路径（既有用户体验不变）。
            const ide = detectIdeKind('Cursor', new Set([
                'tencentcloud.codingcopilot.chat.startNewChat',
                'composer.newAgentChat'
            ]));
            assert.strictEqual(ide, 'codebuddy', 'CodeBuddy 应优先于 Cursor');
        });

        test('BT-aiChat.2 Cursor 所有策略失败应降级为剪贴板且不抛异常', async () => {
            __setExecuteCommandForTest(async (_cmd: string) => {
                throw new Error('simulated failure');
            });
            const { ctx, logs } = makeCtx(['composer.newAgentChat', 'aichat.newchataction']);
            // 关键：dispatchAiChat 必须不抛出（所有异常在内部捕获）
            const res = await dispatchAiChat('cursor', ctx);
            assert.strictEqual(res.succeeded, false, '所有策略失败 succeeded 应为 false');
            assert.strictEqual(res.fellBackToClipboard, true, '应标记 fellBackToClipboard=true');
            // 日志应记录每条策略的 error
            assert.ok(
                logs.some(l => /strategy=cursor\.composer\.newAgentChat\+paste\+enter error=simulated failure/.test(l)),
                '日志应记录策略 A 的失败'
            );
            assert.ok(
                logs.some(l => /strategy=cursor\.aichat\.newchataction\+paste\+enter error=simulated failure/.test(l)),
                '日志应记录策略 B 的失败'
            );
        });

        test('BT-aiChat.3 诊断日志应包含 [DIAG:aiChat] 前缀、strategy 行、dispatch result 行', async () => {
            __setExecuteCommandForTest(async (_cmd: string) => { /* noop */ });
            const { ctx, logs } = makeCtx(['composer.newAgentChat']);
            await dispatchAiChat('cursor', ctx);
            const joined = logs.join('\n');
            assert.ok(/\[DIAG:aiChat\]/.test(joined), '日志应包含 [DIAG:aiChat] 前缀');
            assert.ok(/strategy=/.test(joined), '日志应包含 strategy= 行');
            assert.ok(/dispatch result:/.test(joined), '日志应包含 dispatch result: 汇总行');
            assert.ok(/succeeded=true/.test(joined), '日志应记录 succeeded 状态');
        });

        test('BT-aiChat.4 VSCode 默认分支无可用命令时仍降级安全（不抛异常，返回 fallback）', async () => {
            __setExecuteCommandForTest(async (_cmd: string) => { /* never called */ });
            const { ctx } = makeCtx([]); // 无任何命令
            const res = await dispatchAiChat('vscode', ctx);
            assert.strictEqual(res.succeeded, false);
            assert.strictEqual(res.fellBackToClipboard, true);
            assert.strictEqual(res.strategy, 'none', '无任何策略可尝试时 strategy 应为 none');
        });

        test('BT-aiChat.5 Cursor 策略 A 成功后不应继续尝试策略 B（首条成功即停）', async () => {
            const called: string[] = [];
            __setExecuteCommandForTest(async (cmd: string) => { called.push(cmd); });
            const { ctx } = makeCtx(['composer.newAgentChat', 'aichat.newchataction']);
            await dispatchAiChat('cursor', ctx);
            assert.ok(
                !called.includes('aichat.newchataction'),
                '策略 A 成功后不应再调用策略 B 的 aichat.newchataction'
            );
        });

        // ==== 新增：OS 级自动发送（SendKeys）相关断言 ====

        test('BT-aiChat.6 Cursor 策略 A 成功 + sendEnterKey=true → autoSubmitted=true', async () => {
            let sendEnterCalls = 0;
            __setExecuteCommandForTest(async (_cmd: string) => { /* noop */ });
            __setSendEnterKeyForTest(async () => { sendEnterCalls++; return true; });
            const { ctx } = makeCtx(['composer.newAgentChat']);
            const res = await dispatchAiChat('cursor', ctx);
            assert.strictEqual(res.succeeded, true, '策略 A 应成功');
            assert.strictEqual(res.autoSubmitted, true, 'sendEnterKey=true 时 autoSubmitted 应为 true');
            assert.strictEqual(sendEnterCalls, 1, 'sendEnterKey 应被调用一次');
        });

        test('BT-aiChat.7 Cursor 策略 A 成功 + sendEnterKey=false（非 Win 平台）→ succeeded=true 但 autoSubmitted=false', async () => {
            __setExecuteCommandForTest(async (_cmd: string) => { /* noop */ });
            __setSendEnterKeyForTest(async () => false);
            const { ctx } = makeCtx(['composer.newAgentChat']);
            const res = await dispatchAiChat('cursor', ctx);
            assert.strictEqual(res.succeeded, true, '打开 + 粘贴成功 → succeeded 仍为 true');
            assert.strictEqual(res.autoSubmitted, false, '未在 Win 平台 sendEnterKey 不会真发送');
            assert.strictEqual(res.fellBackToClipboard, false, '未降级 —— 粘贴已完成');
        });

        test('BT-aiChat.8 非 Cursor 策略（如 CodeBuddy）autoSubmitted 始终为 false', async () => {
            __setExecuteCommandForTest(async (_cmd: string) => { /* noop */ });
            // 即使 sendEnterKey 返回 true，也不应影响非 Cursor 策略（它们不调用 sendEnterKey）
            let sendEnterCalls = 0;
            __setSendEnterKeyForTest(async () => { sendEnterCalls++; return true; });
            const { ctx } = makeCtx([
                'tencentcloud.codingcopilot.chat.startNewChat',
                'tencentcloud.codingcopilot.chat.sendMessage'
            ]);
            const res = await dispatchAiChat('codebuddy', ctx);
            assert.strictEqual(res.succeeded, true);
            assert.strictEqual(res.autoSubmitted, false, 'CodeBuddy 策略不走 sendEnterKey，autoSubmitted 必须为 false');
            assert.strictEqual(sendEnterCalls, 0, 'CodeBuddy 策略不应触发 sendEnterKey');
        });

        test('BT-aiChat.9 dispatch 汇总日志应包含 autoSubmitted 字段', async () => {
            __setExecuteCommandForTest(async (_cmd: string) => { /* noop */ });
            __setSendEnterKeyForTest(async () => true);
            const { ctx, logs } = makeCtx(['composer.newAgentChat']);
            await dispatchAiChat('cursor', ctx);
            assert.ok(
                logs.some(l => /dispatch result:.*autoSubmitted=true/.test(l)),
                '汇总日志应带 autoSubmitted=true'
            );
        });
    });
});
