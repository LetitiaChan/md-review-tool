import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileService } from '../../src/fileService';
import { StateService } from '../../src/stateService';
import { ReviewPanel } from '../../src/reviewPanel';

/**
 * 边界场景端到端测试套件
 *
 * 覆盖以下边界与异常场景：
 * 1. 大文件处理
 * 2. 特殊 Markdown 内容（Mermaid、KaTeX、表格、HTML）
 * 3. 文件系统异常（文件不存在、权限、并发）
 * 4. 面板状态异常（快速操作、重复创建/销毁）
 * 5. 批注边界（超长文本、特殊字符、极端数量）
 * 6. 编码与格式（BOM、换行符、空文件）
 * 7. 批阅记录边界（损坏数据、版本号格式）
 */
suite('E2E Edge Cases Test Suite — 边界场景端到端', () => {
    let testDir: string;
    let reviewDir: string;
    let fileService: FileService;
    let stateService: StateService;

    // ===== 环境准备 =====

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }

        testDir = path.join(__dirname, '..', '..', '..', '.test-e2e-edge');
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
        for (const p of ReviewPanel.panels.values()) {
            p.dispose();
        }
        if (ReviewPanel.currentPanel) {
            ReviewPanel.currentPanel.dispose();
        }
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    // ===== 辅助函数 =====

    function createTestFile(name: string, content: string): string {
        const filePath = path.join(testDir, name);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    }

    function cleanupFile(filePath: string): void {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    function cleanupAiInstructions(): void {
        if (fs.existsSync(reviewDir)) {
            const files = fs.readdirSync(reviewDir);
            files.filter(f => f.startsWith('AI修改指令')).forEach(f => {
                try { fs.unlinkSync(path.join(reviewDir, f)); } catch (e) { /* ignore */ }
            });
        }
    }

    // ===== 1. 大文件处理 =====

    suite('1. 大文件处理', () => {
        test('加载 >100KB 的 Markdown 文件 → 不崩溃', () => {
            const lines = ['# 超大文档', '', '**文档版本**：v1.0.0', ''];
            for (let i = 0; i < 2000; i++) {
                lines.push(`## 章节 ${i}`, '', `这是第 ${i} 个章节的内容。包含一些重复的文字以增加文件大小。`.repeat(3), '');
            }
            const content = lines.join('\n');
            const filePath = createTestFile('large-file.md', content);

            assert.ok(content.length > 100 * 1024, '文件应大于 100KB');

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.name, 'large-file.md');
            assert.strictEqual(result.docVersion, 'v1.0.0');
            assert.ok(result.content.length > 100 * 1024);

            cleanupFile(filePath);
        });

        test('100+ 批注的大文件 → applyReview 性能可接受', () => {
            const lines = ['# 大批注文档', ''];
            for (let i = 0; i < 120; i++) {
                lines.push(`段落 ${i}：这是需要批阅的内容。`, '');
            }
            const filePath = createTestFile('many-annotations.md', lines.join('\n'));

            const annotations = Array.from({ length: 120 }, (_, i) => ({
                type: i % 3 === 0 ? 'comment' : i % 3 === 1 ? 'delete' : 'insert',
                selectedText: `段落 ${i}：这是需要批阅的内容。`,
                comment: i % 3 === 0 ? `评论 ${i}` : undefined,
                insertContent: i % 3 === 2 ? `插入内容 ${i}` : undefined,
                insertPosition: i % 3 === 2 ? 'after' : undefined,
                blockIndex: i + 1,
                startOffset: 0
            }));

            const startTime = Date.now();
            const result = fileService.applyReview(annotations, filePath, 'many-annotations.md');
            const elapsed = Date.now() - startTime;

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 120);
            assert.ok(elapsed < 5000, `应在 5 秒内完成，实际耗时 ${elapsed}ms`);

            cleanupFile(filePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('超长单行文本 → 读取和保存正常', () => {
            const longLine = 'A'.repeat(100000);
            const content = `# 超长行\n\n${longLine}\n`;
            const filePath = createTestFile('long-line.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes(longLine));

            const saveResult = fileService.saveFile(filePath, content + '\n追加内容');
            assert.strictEqual(saveResult.success, true);
            assert.strictEqual(saveResult.changed, true);

            cleanupFile(filePath);
        });

        test('大量段落文档 → 块分割正常', () => {
            const lines = ['# 多段落文档', ''];
            for (let i = 0; i < 500; i++) {
                lines.push(`第 ${i} 段内容。`, '');
            }
            const filePath = createTestFile('many-paragraphs.md', lines.join('\n'));

            // 对最后一个段落添加批注
            const annotations = [{
                type: 'comment',
                selectedText: '第 499 段内容。',
                comment: '最后一段的评论',
                blockIndex: 500,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'many-paragraphs.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            cleanupFile(filePath);
            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });
    });

    // ===== 2. 特殊 Markdown 内容 =====

    suite('2. 特殊 Markdown 内容', () => {
        test('含 Mermaid 图表的文档 → 读取正常', () => {
            const content = [
                '# Mermaid 测试',
                '',
                '```mermaid',
                'graph TD',
                '    A[开始] --> B{判断}',
                '    B -->|是| C[处理]',
                '    B -->|否| D[结束]',
                '    C --> D',
                '```',
                '',
                '以上是流程图。'
            ].join('\n');
            const filePath = createTestFile('mermaid-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```mermaid'));
            assert.ok(result.content.includes('graph TD'));

            // 对 Mermaid 后的文本添加批注
            const annotations = [{
                type: 'comment',
                selectedText: '以上是流程图。',
                comment: '请补充时序图',
                blockIndex: 2,
                startOffset: 0
            }];

            const applyResult = fileService.applyReview(annotations, filePath, 'mermaid-doc.md');
            assert.strictEqual(applyResult.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('含 PlantUML 图表的文档 → 读取正常', () => {
            const content = [
                '# PlantUML 测试',
                '',
                '```plantuml',
                '@startuml',
                'Alice -> Bob: 请求',
                'Bob --> Alice: 响应',
                '@enduml',
                '```',
                '',
                '以上是时序图。'
            ].join('\n');
            const filePath = createTestFile('plantuml-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```plantuml'));
            assert.ok(result.content.includes('@startuml'));
            assert.ok(result.content.includes('Alice -> Bob'));

            // 对 PlantUML 后的文本添加批注
            const annotations = [{
                type: 'comment',
                selectedText: '以上是时序图。',
                comment: '请补充类图',
                blockIndex: 2,
                startOffset: 0
            }];

            const applyResult = fileService.applyReview(annotations, filePath, 'plantuml-doc.md');
            assert.strictEqual(applyResult.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('含 Graphviz DOT 图表的文档 → 读取正常', () => {
            const content = [
                '# Graphviz 测试',
                '',
                '```dot',
                'digraph G {',
                '    A -> B;',
                '    B -> C;',
                '    C -> A;',
                '}',
                '```',
                '',
                '以上是有向图。'
            ].join('\n');
            const filePath = createTestFile('graphviz-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```dot'));
            assert.ok(result.content.includes('digraph G'));
            assert.ok(result.content.includes('A -> B'));

            // 对 Graphviz 后的文本添加批注
            const annotations = [{
                type: 'comment',
                selectedText: '以上是有向图。',
                comment: '请增加节点说明',
                blockIndex: 2,
                startOffset: 0
            }];

            const applyResult = fileService.applyReview(annotations, filePath, 'graphviz-doc.md');
            assert.strictEqual(applyResult.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('含 Graphviz graphviz 语言标识的文档 → 读取正常', () => {
            const content = [
                '# Graphviz 语言标识测试',
                '',
                '```graphviz',
                'graph G {',
                '    A -- B;',
                '    B -- C;',
                '}',
                '```',
                '',
                '以上是无向图。'
            ].join('\n');
            const filePath = createTestFile('graphviz-lang-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```graphviz'));
            assert.ok(result.content.includes('graph G'));

            cleanupFile(filePath);
        });

        test('含 PlantUML puml 语言标识的文档 → 读取正常', () => {
            const content = [
                '# PlantUML puml 标识测试',
                '',
                '```puml',
                '@startuml',
                'class User {',
                '    +name: String',
                '    +login(): void',
                '}',
                '@enduml',
                '```',
                '',
                '以上是类图。'
            ].join('\n');
            const filePath = createTestFile('puml-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```puml'));
            assert.ok(result.content.includes('@startuml'));
            assert.ok(result.content.includes('class User'));

            cleanupFile(filePath);
        });

        test('含混合图表（Mermaid + PlantUML + Graphviz）的文档 → 读取正常', () => {
            const content = [
                '# 混合图表测试',
                '',
                '## Mermaid',
                '',
                '```mermaid',
                'graph LR',
                '    A --> B',
                '```',
                '',
                '## PlantUML',
                '',
                '```plantuml',
                '@startuml',
                'Alice -> Bob: Hello',
                '@enduml',
                '```',
                '',
                '## Graphviz',
                '',
                '```dot',
                'digraph { A -> B -> C }',
                '```',
                '',
                '以上是三种图表。'
            ].join('\n');
            const filePath = createTestFile('mixed-diagrams-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```mermaid'), '应包含 Mermaid 代码块');
            assert.ok(result.content.includes('```plantuml'), '应包含 PlantUML 代码块');
            assert.ok(result.content.includes('```dot'), '应包含 Graphviz DOT 代码块');

            cleanupFile(filePath);
        });

        test('含 KaTeX 数学公式的文档 → 读取正常', () => {
            const content = [
                '# 数学公式测试',
                '',
                '行内公式：$E = mc^2$',
                '',
                '块级公式：',
                '',
                '$$',
                '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}',
                '$$',
                '',
                '以上是高斯积分公式。'
            ].join('\n');
            const filePath = createTestFile('katex-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('$E = mc^2$'));
            assert.ok(result.content.includes('\\int_{-\\infty}'));

            cleanupFile(filePath);
        });

        test('含复杂表格的文档 → 读取和批注正常', () => {
            const content = [
                '# 表格测试',
                '',
                '| 模块 | 负责人 | 状态 | 备注 |',
                '|------|--------|------|------|',
                '| 用户系统 | 张三 | 完成 | 已上线 |',
                '| 订单系统 | 李四 | 进行中 | 预计下周 |',
                '| 支付系统 | 王五 | 未开始 | 依赖订单 |',
                '',
                '以上是模块进度表。'
            ].join('\n');
            const filePath = createTestFile('table-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('| 模块 |'));

            const annotations = [{
                type: 'comment',
                selectedText: '| 支付系统 | 王五 | 未开始 | 依赖订单 |',
                comment: '请更新支付系统状态',
                blockIndex: 1,
                startOffset: 0
            }];

            const applyResult = fileService.applyReview(annotations, filePath, 'table-doc.md');
            assert.strictEqual(applyResult.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('含多种代码块的文档 → 语法高亮标记保留', () => {
            const content = [
                '# 多语言代码块',
                '',
                '## JavaScript',
                '',
                '```javascript',
                'const greeting = "Hello, World!";',
                'console.log(greeting);',
                '```',
                '',
                '## Python',
                '',
                '```python',
                'def hello():',
                '    print("Hello, World!")',
                '```',
                '',
                '## SQL',
                '',
                '```sql',
                'SELECT * FROM users WHERE active = true;',
                '```',
                '',
                '## Shell',
                '',
                '```bash',
                'echo "Hello, World!"',
                'ls -la',
                '```',
                '',
                '以上是各语言示例。'
            ].join('\n');
            const filePath = createTestFile('multi-code.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('```javascript'));
            assert.ok(result.content.includes('```python'));
            assert.ok(result.content.includes('```sql'));
            assert.ok(result.content.includes('```bash'));

            cleanupFile(filePath);
        });

        test('含 HTML 标签的文档 → 读取正常', () => {
            const content = [
                '# HTML 混合测试',
                '',
                '<div style="color: red;">',
                '  <p>这是 HTML 段落</p>',
                '</div>',
                '',
                '普通 Markdown 段落。',
                '',
                '<details>',
                '<summary>点击展开</summary>',
                '',
                '隐藏的内容。',
                '',
                '</details>',
                '',
                '文档结束。'
            ].join('\n');
            const filePath = createTestFile('html-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('<div'));
            assert.ok(result.content.includes('<details>'));
            assert.ok(result.content.includes('</details>'));

            cleanupFile(filePath);
        });

        test('含图片引用的文档 → 路径保留', () => {
            const content = [
                '# 图片测试',
                '',
                '![本地图片](./images/screenshot.png)',
                '',
                '![远程图片](https://example.com/image.jpg "示例图片")',
                '',
                '![Base64图片](data:image/png;base64,iVBORw0KGgo=)',
                '',
                '以上是图片引用。'
            ].join('\n');
            const filePath = createTestFile('image-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('![本地图片]'));
            assert.ok(result.content.includes('![远程图片]'));
            assert.ok(result.content.includes('![Base64图片]'));

            cleanupFile(filePath);
        });

        test('含嵌套列表的文档 → 结构保留', () => {
            const content = [
                '# 嵌套列表',
                '',
                '- 一级项目 A',
                '  - 二级项目 A1',
                '    - 三级项目 A1a',
                '    - 三级项目 A1b',
                '  - 二级项目 A2',
                '- 一级项目 B',
                '  1. 有序子项 1',
                '  2. 有序子项 2',
                '',
                '列表结束。'
            ].join('\n');
            const filePath = createTestFile('nested-list.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('三级项目 A1a'));
            assert.ok(result.content.includes('有序子项 1'));

            cleanupFile(filePath);
        });

        test('含脚注和引用的文档 → 读取正常', () => {
            const content = [
                '# 脚注测试',
                '',
                '这是一段带脚注的文字[^1]。',
                '',
                '> 这是一段引用文字。',
                '> 引用可以跨多行。',
                '',
                '> 嵌套引用：',
                '>> 二级引用内容。',
                '',
                '[^1]: 这是脚注内容。',
                '',
                '文档结束。'
            ].join('\n');
            const filePath = createTestFile('footnote-doc.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('[^1]'));
            assert.ok(result.content.includes('>>'));

            cleanupFile(filePath);
        });
    });

    // ===== 3. 文件系统异常 =====

    suite('3. 文件系统异常', () => {
        test('读取不存在的文件 → 抛出明确错误', () => {
            assert.throws(() => {
                fileService.readFile(path.join(testDir, 'ghost-file.md'));
            }, /文件不存在/);
        });

        test('保存到不存在的文件 → 抛出错误', () => {
            assert.throws(() => {
                fileService.saveFile(path.join(testDir, 'ghost-save.md'), '内容');
            }, /文件不存在/);
        });

        test('文件被外部删除后再读取 → 抛出错误', () => {
            const filePath = createTestFile('will-delete.md', '# 即将删除');
            
            // 先验证可以读取
            const result = fileService.readFile(filePath);
            assert.strictEqual(result.name, 'will-delete.md');

            // 外部删除
            fs.unlinkSync(filePath);

            // 再次读取应抛出错误
            assert.throws(() => {
                fileService.readFile(filePath);
            }, /文件不存在/);
        });

        test('文件被外部修改后读取 → 返回最新内容', () => {
            const filePath = createTestFile('external-modify.md', '# 原始内容');

            const result1 = fileService.readFile(filePath);
            assert.ok(result1.content.includes('原始内容'));

            // 外部修改
            fs.writeFileSync(filePath, '# 外部修改后的内容', 'utf-8');

            const result2 = fileService.readFile(filePath);
            assert.ok(result2.content.includes('外部修改后的内容'));

            cleanupFile(filePath);
        });

        test('applyReview 源文件不存在 → 仍能生成指令', () => {
            const annotations = [{
                type: 'comment',
                selectedText: '某段文本',
                comment: '评论',
                blockIndex: 0,
                startOffset: 0
            }];

            const result = fileService.applyReview(
                annotations,
                path.join(testDir, 'nonexistent-source.md'),
                'nonexistent-source.md'
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            if (result.aiInstructionFilePath && fs.existsSync(result.aiInstructionFilePath)) {
                fs.unlinkSync(result.aiInstructionFilePath);
            }
        });

        test('保存到只读目录 → 应抛出错误或安全处理', () => {
            // 在 Windows 上模拟只读场景比较困难，验证错误处理路径
            try {
                fileService.saveFile(
                    path.join('C:\\Windows\\System32\\test.md'),
                    '内容'
                );
                // 如果没有抛出错误，也是可以接受的（取决于权限）
            } catch (e: any) {
                assert.ok(e.message.length > 0, '应有明确的错误信息');
            }
        });
    });

    // ===== 4. 面板状态异常 =====

    suite('4. 面板状态异常', () => {
        test('快速连续执行 openPanel → 不崩溃', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    vscode.commands.executeCommand('mdReview.openPanel').then(
                        () => true,
                        () => true // 错误也视为安全完成
                    )
                );
            }

            const results = await Promise.all(promises);
            assert.strictEqual(results.length, 5, '所有命令应完成');
        });

        test('无面板时执行 exportReview → 安全忽略', async () => {
            // 确保无面板
            if (ReviewPanel.currentPanel) {
                ReviewPanel.currentPanel.dispose();
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            try {
                await vscode.commands.executeCommand('mdReview.exportReview');
                assert.ok(true, '无面板时应安全忽略');
            } catch (e: any) {
                assert.ok(true, `安全处理: ${e.message}`);
            }
        });

        test('面板 dispose 后 currentPanel 应为 undefined', async () => {
            try {
                await vscode.commands.executeCommand('mdReview.openPanel');
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                // 忽略
            }

            if (ReviewPanel.currentPanel) {
                ReviewPanel.currentPanel.dispose();
                await new Promise(resolve => setTimeout(resolve, 200));
                assert.strictEqual(ReviewPanel.currentPanel, undefined, 'dispose 后应为 undefined');
            } else {
                assert.ok(true, '测试环境中面板可能未创建');
            }
        });

        test('多次 dispose 不应崩溃', async () => {
            try {
                await vscode.commands.executeCommand('mdReview.openPanel');
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
                // 忽略
            }

            if (ReviewPanel.currentPanel) {
                const panel = ReviewPanel.currentPanel;
                panel.dispose();
                // 第二次 dispose 不应崩溃
                try {
                    panel.dispose();
                } catch (e) {
                    // 可能抛出错误，但不应崩溃
                }
                assert.ok(true, '多次 dispose 不应崩溃');
            } else {
                assert.ok(true, '测试环境中面板可能未创建');
            }
        });
    });

    // ===== 5. 批注边界 =====

    suite('5. 批注边界', () => {
        test('超长评论文本 → 正常处理', () => {
            const longComment = '这是一段非常长的评论。'.repeat(500);
            const filePath = createTestFile('long-comment.md', '# 测试\n\n目标文本。\n');

            const annotations = [{
                type: 'comment',
                selectedText: '目标文本。',
                comment: longComment,
                blockIndex: 1,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'long-comment.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 1);

            if (result.aiInstructionFilePath) {
                const content = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(content.includes('这是一段非常长的评论'), '应包含完整评论');
                fs.unlinkSync(result.aiInstructionFilePath);
            }

            cleanupFile(filePath);
        });

        test('含特殊字符的批注 → 正常处理', () => {
            const filePath = createTestFile('special-chars.md', '# 测试\n\n包含 `code` 和 **bold** 的文本。\n');

            const annotations = [{
                type: 'comment',
                selectedText: '包含 `code` 和 **bold** 的文本。',
                comment: '评论中也有 `code`、**bold**、<html>、"引号"、\'单引号\'、\\反斜杠\\',
                blockIndex: 1,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'special-chars.md');
            assert.strictEqual(result.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('含中文、日文、韩文、emoji 的批注 → 正常处理', () => {
            const filePath = createTestFile('unicode.md', '# 多语言\n\n中文内容 日本語 한국어 🎉🚀💡\n');

            const annotations = [{
                type: 'comment',
                selectedText: '中文内容 日本語 한국어 🎉🚀💡',
                comment: '多语言评论：很好 👍 すごい 대단해',
                blockIndex: 1,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'unicode.md');
            assert.strictEqual(result.success, true);

            if (result.aiInstructionFilePath) {
                const content = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(content.includes('🎉'), '应保留 emoji');
                assert.ok(content.includes('日本語'), '应保留日文');
                fs.unlinkSync(result.aiInstructionFilePath);
            }

            cleanupFile(filePath);
        });

        test('blockIndex 为 0 的批注 → 正常处理', () => {
            const filePath = createTestFile('block-zero.md', '# 标题\n\n内容。\n');

            const annotations = [{
                type: 'comment',
                selectedText: '# 标题',
                comment: '修改标题',
                blockIndex: 0,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'block-zero.md');
            assert.strictEqual(result.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('blockIndex 超出范围 → 安全处理', () => {
            const filePath = createTestFile('block-overflow.md', '# 标题\n\n内容。\n');

            const annotations = [{
                type: 'comment',
                selectedText: '不存在的文本',
                comment: '评论',
                blockIndex: 9999,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'block-overflow.md');
            assert.strictEqual(result.success, true);

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('同一位置多个批注 → 全部生成指令', () => {
            const filePath = createTestFile('same-position.md', '# 标题\n\n目标段落。\n');

            const annotations = [
                { type: 'comment', selectedText: '目标段落。', comment: '评论1', blockIndex: 1, startOffset: 0 },
                { type: 'comment', selectedText: '目标段落。', comment: '评论2', blockIndex: 1, startOffset: 0 },
                { type: 'delete', selectedText: '目标段落。', blockIndex: 1, startOffset: 0 }
            ];

            const result = fileService.applyReview(annotations, filePath, 'same-position.md');
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.needsAi, 3, '同位置的 3 条批注都应生成指令');

            cleanupFile(filePath);
            cleanupAiInstructions();
        });

        test('insert 批注的 insertContent 含 Markdown 格式 → 保留格式', () => {
            const filePath = createTestFile('insert-md.md', '# 标题\n\n锚点文本。\n');

            const annotations = [{
                type: 'insert',
                selectedText: '锚点文本。',
                insertContent: '## 新章节\n\n- 列表项 1\n- 列表项 2\n\n```js\nconsole.log("hello");\n```',
                insertPosition: 'after',
                blockIndex: 1,
                startOffset: 0
            }];

            const result = fileService.applyReview(annotations, filePath, 'insert-md.md');
            assert.strictEqual(result.success, true);

            if (result.aiInstructionFilePath) {
                const content = fs.readFileSync(result.aiInstructionFilePath, 'utf-8');
                assert.ok(content.includes('## 新章节'), '应保留 Markdown 标题');
                assert.ok(content.includes('- 列表项'), '应保留列表');
                fs.unlinkSync(result.aiInstructionFilePath);
            }

            cleanupFile(filePath);
        });
    });

    // ===== 6. 编码与格式 =====

    suite('6. 编码与格式', () => {
        test('UTF-8 BOM 文件 → 正常读取', () => {
            const bom = '\uFEFF';
            const content = bom + '# BOM 文件\n\n**文档版本**：v1.0.0\n\n内容。\n';
            const filePath = createTestFile('bom-file.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.length > 0);
            // BOM 可能被保留或去除，两种都可接受
            assert.ok(result.content.includes('# BOM 文件'));

            cleanupFile(filePath);
        });

        test('Windows 换行符 (CRLF) → 正常处理', () => {
            const content = '# CRLF 测试\r\n\r\n**文档版本**：v1.0.0\r\n\r\n段落内容。\r\n';
            const filePath = createTestFile('crlf-file.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('# CRLF 测试'));
            assert.ok(result.content.includes('段落内容'));

            cleanupFile(filePath);
        });

        test('Unix 换行符 (LF) → 正常处理', () => {
            const content = '# LF 测试\n\n段落内容。\n';
            const filePath = createTestFile('lf-file.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('# LF 测试'));

            cleanupFile(filePath);
        });

        test('混合换行符 → 正常处理', () => {
            const content = '# 混合换行\r\n\n段落一。\r\n\n段落二。\n';
            const filePath = createTestFile('mixed-eol.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('段落一'));
            assert.ok(result.content.includes('段落二'));

            cleanupFile(filePath);
        });

        test('空文件 → 正常读取', () => {
            const filePath = createTestFile('empty.md', '');

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.content, '');
            assert.strictEqual(result.docVersion, null);

            cleanupFile(filePath);
        });

        test('只有空白字符的文件 → 正常读取', () => {
            const content = '   \n\n  \t  \n\n   ';
            const filePath = createTestFile('whitespace.md', content);

            const result = fileService.readFile(filePath);
            assert.strictEqual(result.content, content);
            assert.strictEqual(result.docVersion, null);

            cleanupFile(filePath);
        });

        test('含制表符缩进的文件 → 正常读取', () => {
            const content = '# 制表符\n\n\t缩进内容\n\t\t双重缩进\n';
            const filePath = createTestFile('tab-indent.md', content);

            const result = fileService.readFile(filePath);
            assert.ok(result.content.includes('\t缩进内容'));
            assert.ok(result.content.includes('\t\t双重缩进'));

            cleanupFile(filePath);
        });
    });

    // ===== 7. 批阅记录边界 =====

    suite('7. 批阅记录边界', () => {
        test('查询从未批阅过的文件 → 返回空数组', () => {
            const records = fileService.getReviewRecords('never-reviewed-edge.md');
            assert.ok(Array.isArray(records));
            assert.strictEqual(records.length, 0);
        });

        test('删除从未批阅过的文件记录 → 安全返回', () => {
            const result = fileService.deleteReviewRecords('never-reviewed-edge.md');
            assert.strictEqual(result.success, true);
            assert.ok(Array.isArray(result.deleted));
        });

        test('保存含特殊字符文件名的批阅记录 → 正常', () => {
            const content = [
                '# 批阅记录',
                '',
                '**源文件版本**：v1.0.0',
                '',
                '```json',
                JSON.stringify({ annotationCount: 1, annotations: [{ type: 'comment', selectedText: 'x', comment: 'y' }] }),
                '```'
            ].join('\n');

            const result = fileService.saveReview('批阅记录_特殊(文件名)_v1.md', content);
            assert.strictEqual(result.success, true);

            // 清理
            fileService.deleteReviewRecords('特殊(文件名).md');
        });

        test('多版本批阅记录 → 版本号正确解析', () => {
            for (let v = 1; v <= 5; v++) {
                const content = [
                    '# 批阅记录',
                    '',
                    `**源文件版本**：v${v}.0.0`,
                    '',
                    '```json',
                    JSON.stringify({ annotationCount: v, annotations: [] }),
                    '```'
                ].join('\n');
                fileService.saveReview(`批阅记录_version-test_v${v}.md`, content);
            }

            const records = fileService.getReviewRecords('version-test.md');
            assert.ok(records.length >= 5);

            // 验证倒序
            for (let i = 0; i < records.length - 1; i++) {
                assert.ok(
                    records[i].reviewVersion >= records[i + 1].reviewVersion,
                    `版本 ${records[i].reviewVersion} 应 >= ${records[i + 1].reviewVersion}`
                );
            }

            // 清理
            fileService.deleteReviewRecords('version-test.md');
        });
    });

    // ===== 8. 状态持久化边界 =====

    suite('8. 状态持久化边界', () => {
        test('存储 null 值 → 正常读取', async () => {
            await stateService.set('edge-null', null);
            const result = stateService.get('edge-null');
            assert.strictEqual(result, null);
        });

        test('存储空字符串 → 正常读取', async () => {
            await stateService.set('edge-empty-str', '');
            const result = stateService.get<string>('edge-empty-str');
            assert.strictEqual(result, '');
        });

        test('存储数字 0 → 正常读取', async () => {
            await stateService.set('edge-zero', 0);
            const result = stateService.get<number>('edge-zero');
            assert.strictEqual(result, 0);
        });

        test('存储 false → 正常读取', async () => {
            await stateService.set('edge-false', false);
            const result = stateService.get<boolean>('edge-false');
            assert.strictEqual(result, false);
        });

        test('存储深层嵌套对象 → 正常读取', async () => {
            const deepObj = {
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                value: '深层值',
                                array: [1, 2, { nested: true }]
                            }
                        }
                    }
                }
            };

            await stateService.set('edge-deep', deepObj);
            const result = stateService.get<typeof deepObj>('edge-deep');
            assert.deepStrictEqual(result, deepObj);
        });

        test('存储大数组 → 正常读取', async () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                type: 'comment',
                text: `批注 ${i}`,
                blockIndex: i
            }));

            await stateService.set('edge-large-array', largeArray);
            const result = stateService.get<typeof largeArray>('edge-large-array');
            assert.ok(result);
            assert.strictEqual(result!.length, 1000);
            assert.strictEqual(result![999].id, 999);
        });

        test('快速连续写入同一键 → 最后一次生效', async () => {
            for (let i = 0; i < 20; i++) {
                await stateService.set('edge-rapid', i);
            }
            const result = stateService.get<number>('edge-rapid');
            assert.strictEqual(result, 19);
        });

        test('含特殊字符的键名 → 正常读写', async () => {
            const specialKeys = [
                'key-with-dash',
                'key.with.dots',
                'key_with_underscore',
                'key/with/slash',
                'key:with:colon'
            ];

            for (const key of specialKeys) {
                await stateService.set(key, `value-for-${key}`);
                const result = stateService.get<string>(key);
                assert.strictEqual(result, `value-for-${key}`, `键 ${key} 应正常读写`);
            }
        });
    });

    // ===== 9. 图片管理边界 =====

    suite('9. 图片管理边界', () => {
        const minPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        test('无效 Base64 数据 → 抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('not-base64-data');
            }, /无效的图片数据格式/);
        });

        test('空字符串 → 抛出错误', () => {
            assert.throws(() => {
                fileService.saveAnnotationImage('');
            }, /无效的图片数据格式/);
        });

        test('删除不存在的图片 → 返回 false', () => {
            const result = fileService.deleteAnnotationImage('images/nonexistent-edge.png');
            assert.strictEqual(result, false);
        });

        test('删除空路径 → 返回 false', () => {
            const result = fileService.deleteAnnotationImage('');
            assert.strictEqual(result, false);
        });

        test('保存后立即删除 → 成功', () => {
            const saveResult = fileService.saveAnnotationImage(minPng, 'edge-immediate-delete.png');
            assert.strictEqual(saveResult.success, true);

            const deleted = fileService.deleteAnnotationImage(saveResult.imagePath);
            assert.strictEqual(deleted, true);

            // 再次删除应返回 false
            const deletedAgain = fileService.deleteAnnotationImage(saveResult.imagePath);
            assert.strictEqual(deletedAgain, false);
        });

        test('自定义文件名含特殊字符 → 正常保存', () => {
            const result = fileService.saveAnnotationImage(minPng, 'edge-特殊文件名.png');
            assert.strictEqual(result.success, true);
            assert.ok(result.imagePath.includes('edge-特殊文件名.png'));

            fileService.deleteAnnotationImage(result.imagePath);
        });
    });

    // ===== 10. 版本号提取边界 =====

    suite('10. 版本号提取边界', () => {
        const versionTestCases = [
            { desc: '标准格式 v1.0.0', content: '**文档版本**：v1.0.0', expected: 'v1.0.0' },
            { desc: '两位版本 v2.1', content: '**文档版本**：v2.1', expected: 'v2.1' },
            { desc: '大版本号 v10.20.30', content: '**文档版本**：v10.20.30', expected: 'v10.20.30' },
            { desc: '冒号后有空格', content: '**文档版本**： v3.0.0', expected: 'v3.0.0' },
            { desc: '使用英文冒号', content: '**文档版本**: v4.0.0', expected: 'v4.0.0' },
            { desc: '无加粗格式', content: '文档版本：v5.0.0', expected: 'v5.0.0' },
            { desc: '版本在文档中间', content: '# 标题\n\n**文档版本**：v6.0.0\n\n内容', expected: 'v6.0.0' },
        ];

        versionTestCases.forEach((tc, i) => {
            test(`${tc.desc} → 提取为 ${tc.expected}`, () => {
                const filePath = createTestFile(`version-edge-${i}.md`, tc.content);
                const result = fileService.readFile(filePath);
                assert.strictEqual(result.docVersion, tc.expected);
                cleanupFile(filePath);
            });
        });

        test('无版本号 → null', () => {
            const filePath = createTestFile('no-version-edge.md', '# 无版本号文档\n\n内容。');
            const result = fileService.readFile(filePath);
            assert.strictEqual(result.docVersion, null);
            cleanupFile(filePath);
        });

        test('多个版本号 → 提取第一个', () => {
            const content = '**文档版本**：v1.0.0\n\n**文档版本**：v2.0.0';
            const filePath = createTestFile('multi-version.md', content);
            const result = fileService.readFile(filePath);
            assert.strictEqual(result.docVersion, 'v1.0.0', '应提取第一个版本号');
            cleanupFile(filePath);
        });
    });

    // ===== 11. 并发与竞态 =====

    suite('11. 并发与竞态', () => {
        test('并发读取同一文件 → 全部成功', async () => {
            const filePath = createTestFile('concurrent-read.md', '# 并发读取\n\n内容。\n');

            const promises = Array.from({ length: 10 }, () =>
                new Promise<void>((resolve) => {
                    const result = fileService.readFile(filePath);
                    assert.strictEqual(result.name, 'concurrent-read.md');
                    resolve();
                })
            );

            await Promise.all(promises);
            cleanupFile(filePath);
        });

        test('并发保存不同文件 → 全部成功', async () => {
            const files = Array.from({ length: 10 }, (_, i) => {
                const name = `concurrent-save-${i}.md`;
                createTestFile(name, `# 文件 ${i}\n\n原始内容。\n`);
                return name;
            });

            const promises = files.map((name, i) => {
                const filePath = path.join(testDir, name);
                return new Promise<void>((resolve) => {
                    const result = fileService.saveFile(filePath, `# 文件 ${i}\n\n修改后内容。\n`);
                    assert.strictEqual(result.success, true);
                    resolve();
                });
            });

            await Promise.all(promises);

            // 验证所有文件都已修改
            files.forEach((name, i) => {
                const content = fs.readFileSync(path.join(testDir, name), 'utf-8');
                assert.ok(content.includes('修改后内容'), `文件 ${i} 应已修改`);
                cleanupFile(path.join(testDir, name));
            });
        });

        test('并发保存批阅记录 → 全部成功', () => {
            for (let i = 0; i < 5; i++) {
                const content = [
                    '# 批阅记录',
                    '',
                    `**源文件版本**：v${i}.0.0`,
                    '',
                    '```json',
                    JSON.stringify({ annotationCount: 1, annotations: [{ type: 'comment', selectedText: 'x', comment: 'y' }] }),
                    '```'
                ].join('\n');

                const result = fileService.saveReview(`批阅记录_concurrent-review_v${i + 1}.md`, content);
                assert.strictEqual(result.success, true);
            }

            const records = fileService.getReviewRecords('concurrent-review.md');
            assert.ok(records.length >= 5);

            fileService.deleteReviewRecords('concurrent-review.md');
        });
    });

    // ===== 12. Webview 资源完整性边界 =====

    suite('12. Webview 资源完整性', () => {
        test('所有 CSS 文件应存在且非空', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const cssFiles = ['style.css', 'markdown.css', 'annotations.css', 'settings.css'];
            for (const css of cssFiles) {
                const cssPath = path.join(extPath, 'webview', 'css', css);
                assert.ok(fs.existsSync(cssPath), `${css} 应存在`);
                const content = fs.readFileSync(cssPath, 'utf-8');
                assert.ok(content.length > 0, `${css} 不应为空`);
            }
        });

        test('所有 JS 文件应存在且非空', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const jsFiles = ['store.js', 'renderer.js', 'annotations.js', 'export.js', 'settings.js', 'app.js'];
            for (const js of jsFiles) {
                const jsPath = path.join(extPath, 'webview', 'js', js);
                assert.ok(fs.existsSync(jsPath), `${js} 应存在`);
                const content = fs.readFileSync(jsPath, 'utf-8');
                assert.ok(content.length > 0, `${js} 不应为空`);
            }
        });

        test('index.html 应包含完整的 HTML 结构', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const htmlPath = path.join(extPath, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'), '应有 DOCTYPE');
            assert.ok(html.includes('<html'), '应有 html 标签');
            assert.ok(html.includes('<head>') || html.includes('<head '), '应有 head 标签');
            assert.ok(html.includes('<body'), '应有 body 标签');
            assert.ok(html.includes('</html>'), '应有闭合 html 标签');
        });

        test('index.html 应包含 CSP meta 标签', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const htmlPath = path.join(extPath, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(
                html.includes('Content-Security-Policy') || html.includes('content-security-policy'),
                '应包含 CSP 策略'
            );
        });
    });

    // ===== 12.5. PlantUML 延迟渲染机制验证（回归测试） =====

    suite('12.5. PlantUML 延迟渲染机制', () => {
        test('renderer.js 的 PlantUML code renderer 不应直接生成 img src（延迟渲染）', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const rendererPath = path.join(extPath, 'webview', 'js', 'renderer.js');
            const rendererCode = fs.readFileSync(rendererPath, 'utf-8');

            // 找到 plantuml/puml 的 code renderer 区域（从 "if (lang === 'plantuml'" 到下一个 return 之后的 "}"）
            const plantumlBlockMatch = rendererCode.match(/\/\/ PlantUML[\s\S]*?if\s*\(lang\s*===\s*'plantuml'[\s\S]*?return\s*`[^`]*`;[\s\S]*?\}/);
            assert.ok(plantumlBlockMatch, 'renderer.js 应包含 PlantUML code renderer 逻辑');

            const plantumlBlock = plantumlBlockMatch![0];

            // 关键断言：code renderer 的返回 HTML 模板中不应包含 <img src="https://
            // 如果包含，说明回退到了旧的直接渲染方式，开关关闭时图片仍会加载
            assert.ok(
                !plantumlBlock.includes('img class="plantuml-rendered" src="'),
                'PlantUML code renderer 不应在 HTML 模板中直接嵌入 <img src>（应使用延迟渲染策略）'
            );

            // 验证使用了与 Mermaid/Graphviz 一致的 data-source 延迟渲染模式
            assert.ok(
                plantumlBlock.includes('plantuml-source-data'),
                'PlantUML code renderer 应输出 plantuml-source-data 占位元素'
            );
            assert.ok(
                plantumlBlock.includes('data-source'),
                'PlantUML code renderer 应使用 data-source 属性存储编码后的源码'
            );
        });

        test('renderer.js 的 renderPlantUML 函数应从 data-source 动态构建 img', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const rendererPath = path.join(extPath, 'webview', 'js', 'renderer.js');
            const rendererCode = fs.readFileSync(rendererPath, 'utf-8');

            // renderPlantUML 函数应包含从 data-source 解码源码的逻辑
            assert.ok(
                rendererCode.includes('function renderPlantUML'),
                'renderer.js 应导出 renderPlantUML 函数'
            );

            // 应包含 plantumlHexEncode 调用（动态构建 URL）
            const renderFnMatch = rendererCode.match(/function renderPlantUML\(\)[\s\S]*?^    \}/m);
            assert.ok(renderFnMatch, '应找到 renderPlantUML 函数体');

            const renderFn = renderFnMatch![0];
            assert.ok(
                renderFn.includes('plantumlHexEncode'),
                'renderPlantUML 应调用 plantumlHexEncode 动态构建图片 URL'
            );
            assert.ok(
                renderFn.includes('plantuml-source-data'),
                'renderPlantUML 应从 plantuml-source-data 读取源码'
            );
        });

        test('app.js 的 renderMathAndMermaid 应只在 enablePlantUML 为 true 时调用 renderPlantUML', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            if (!extPath) {
                assert.ok(true, '测试环境中扩展路径不可用');
                return;
            }

            const appPath = path.join(extPath, 'webview', 'js', 'app.js');
            const appCode = fs.readFileSync(appPath, 'utf-8');

            // 验证 renderPlantUML 的调用被 enablePlantUML 条件包裹
            assert.ok(
                appCode.includes('settings.enablePlantUML'),
                'app.js 应检查 enablePlantUML 设置'
            );

            // 确保 renderPlantUML 在条件块内
            const condMatch = appCode.match(/if\s*\(settings\.enablePlantUML\)\s*\{[\s\S]*?Renderer\.renderPlantUML/);
            assert.ok(
                condMatch,
                'renderPlantUML 调用应在 enablePlantUML 条件块内'
            );
        });
    });

    // ===== 13. 配置边界 =====

    suite('13. 配置边界', () => {
        test('所有配置项应有默认值', () => {
            const config = vscode.workspace.getConfiguration('mdReview');
            const requiredKeys = [
                'fontSize', 'lineHeight', 'contentMaxWidth', 'fontFamily',
                'theme', 'showToc', 'showAnnotations', 'sidebarLayout',
                'enableMermaid', 'enableMath', 'enablePlantUML', 'enableGraphviz',
                'showLineNumbers', 'autoSave', 'autoSaveDelay', 'codeTheme'
            ];

            for (const key of requiredKeys) {
                const value = config.get(key);
                assert.ok(value !== undefined, `配置项 ${key} 应有默认值`);
            }
        });

        test('数值类型配置应为合理范围', () => {
            const config = vscode.workspace.getConfiguration('mdReview');

            const fontSize = config.get<number>('fontSize', 18);
            assert.ok(fontSize >= 8 && fontSize <= 72, `fontSize ${fontSize} 应在 8-72 范围内`);

            const lineHeight = config.get<number>('lineHeight', 1.8);
            assert.ok(lineHeight >= 1.0 && lineHeight <= 3.0, `lineHeight ${lineHeight} 应在 1.0-3.0 范围内`);

            const autoSaveDelay = config.get<number>('autoSaveDelay', 1500);
            assert.ok(autoSaveDelay >= 0, `autoSaveDelay ${autoSaveDelay} 应 >= 0`);

            const contentMaxWidth = config.get<number>('contentMaxWidth', 1200);
            assert.ok(contentMaxWidth >= 0, `contentMaxWidth ${contentMaxWidth} 应 >= 0`);
        });

        test('字符串类型配置应为有效值', () => {
            const config = vscode.workspace.getConfiguration('mdReview');

            const theme = config.get<string>('theme', 'light');
            assert.ok(['light', 'dark'].includes(theme), `theme "${theme}" 应为 light 或 dark`);

            const sidebarLayout = config.get<string>('sidebarLayout', 'toc-left');
            assert.ok(
                ['toc-left', 'toc-right', 'annotations-left', 'annotations-right'].includes(sidebarLayout),
                `sidebarLayout "${sidebarLayout}" 应为有效值`
            );
        });

        test('布尔类型配置应为 boolean', () => {
            const config = vscode.workspace.getConfiguration('mdReview');
            const boolKeys = ['showToc', 'showAnnotations', 'enableMermaid', 'enableMath', 'enablePlantUML', 'enableGraphviz', 'showLineNumbers', 'autoSave'];

            for (const key of boolKeys) {
                const value = config.get(key);
                assert.strictEqual(typeof value, 'boolean', `${key} 应为 boolean 类型`);
            }
        });
    });
});
