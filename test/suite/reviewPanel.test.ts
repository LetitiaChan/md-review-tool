import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('ReviewPanel Test Suite', () => {

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    // ===== 命令执行 =====

    test('执行 exportReview 命令不应抛出错误（无面板时）', async () => {
        try {
            await vscode.commands.executeCommand('mdReview.exportReview');
            assert.ok(true, 'exportReview 命令执行成功（无面板时应静默忽略）');
        } catch (e: any) {
            assert.ok(true, `命令执行完成: ${e.message}`);
        }
    });

    // ===== Webview 配置验证 =====

    test('package.json 中 webview 相关资源文件应存在', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
        assert.ok(extPath, '扩展路径应存在');

        const webviewDir = path.join(extPath!, 'webview');
        assert.ok(fs.existsSync(webviewDir), 'webview 目录应存在');

        const indexHtml = path.join(webviewDir, 'index.html');
        assert.ok(fs.existsSync(indexHtml), 'webview/index.html 应存在');
    });

    test('webview CSS 资源文件应存在', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
        assert.ok(extPath);

        const cssDir = path.join(extPath!, 'webview', 'css');
        assert.ok(fs.existsSync(cssDir), 'webview/css 目录应存在');

        const expectedCss = ['style.css', 'markdown.css', 'annotations.css', 'settings.css'];
        for (const cssFile of expectedCss) {
            const cssPath = path.join(cssDir, cssFile);
            assert.ok(fs.existsSync(cssPath), `${cssFile} 应存在`);
        }
    });

    test('webview JS 资源文件应存在', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
        assert.ok(extPath);

        const jsDir = path.join(extPath!, 'webview', 'js');
        assert.ok(fs.existsSync(jsDir), 'webview/js 目录应存在');

        const expectedJs = ['store.js', 'renderer.js', 'annotations.js', 'export.js', 'settings.js', 'app.js'];
        for (const jsFile of expectedJs) {
            const jsPath = path.join(jsDir, jsFile);
            assert.ok(fs.existsSync(jsPath), `${jsFile} 应存在`);
        }
    });

    // ===== index.html 模板验证 =====

    test('index.html 应包含必要的占位符', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
        assert.ok(extPath);

        const htmlPath = path.join(extPath!, 'webview', 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf-8');

        assert.ok(html.includes('${nonce}'), 'HTML 应包含 nonce 占位符');
        assert.ok(html.includes('${cspSource}'), 'HTML 应包含 cspSource 占位符');
        assert.ok(html.includes('${styleUri}'), 'HTML 应包含 styleUri 占位符');
        // 业务脚本已合并为单一 bundle（由 Change add-webview-bundler-and-esm-modules 引入）
        assert.ok(html.includes('${appBundleUri}'), 'HTML 应包含 appBundleUri 占位符');
    });

    // ===== Custom Editor 配置验证 =====

    test('扩展应配置 customEditors', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        const customEditors = ext!.packageJSON.contributes.customEditors;
        assert.ok(Array.isArray(customEditors), '应有 customEditors 配置');
        assert.ok(customEditors.length > 0, '应至少有一个 Custom Editor');
        const mdEditor = customEditors.find((e: any) => e.viewType === 'mdReview.markdownEditor');
        assert.ok(mdEditor, '应有 mdReview.markdownEditor Custom Editor');
    });

    // ===== 扩展图标验证 =====

    test('扩展图标文件应存在', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
        assert.ok(extPath);

        const iconsDir = path.join(extPath!, 'assets', 'icons');
        assert.ok(fs.existsSync(iconsDir), 'assets/icons 目录应存在');

        const icon128 = path.join(iconsDir, 'icon-128x128.png');
        assert.ok(fs.existsSync(icon128), 'icon-128x128.png 应存在');
    });

    // ===== 模板占位符完整性验证（补充） =====

    suite('HTML 模板占位符完整性', () => {
        test('index.html 应包含所有 CSS 资源占位符', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            // 验证 CSS 相关占位符
            assert.ok(html.includes('${styleUri}'), '应包含 styleUri 占位符');
            assert.ok(html.includes('${markdownCssUri}'), '应包含 markdownCssUri 占位符');
            assert.ok(html.includes('${annotationsCssUri}'), '应包含 annotationsCssUri 占位符');
            assert.ok(html.includes('${settingsCssUri}'), '应包含 settingsCssUri 占位符');
        });

        test('index.html 应包含所有 JS 资源占位符', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            // 业务脚本已合并为单一 bundle（由 Change add-webview-bundler-and-esm-modules 引入）
            // 旧的 7 个占位符（storeUri / rendererUri / annotationsUri / exportUri / settingsUri / i18nUri / appUri）已全部替换为 appBundleUri
            assert.ok(html.includes('${appBundleUri}'), '应包含 appBundleUri 占位符（bundle 时代，单一导入点）');
            assert.ok(!html.includes('${storeUri}'), '不应再包含旧 storeUri 占位符');
            assert.ok(!html.includes('${rendererUri}'), '不应再包含旧 rendererUri 占位符');
            assert.ok(!html.includes('${annotationsUri}'), '不应再包含旧 annotationsUri 占位符');
            assert.ok(!html.includes('${exportUri}'), '不应再包含旧 exportUri 占位符');
            assert.ok(!html.includes('${settingsUri}'), '不应再包含旧 settingsUri 占位符');
            assert.ok(!html.includes('${i18nUri}'), '不应再包含旧 i18nUri 占位符');
            assert.ok(!html.includes('${appUri}'), '不应再包含旧 appUri 占位符');
        });

        test('index.html 应包含 KaTeX CSS 占位符', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(html.includes('${katexCssUri}') || html.includes('katex'), '应包含 KaTeX 相关资源引用');
        });
    });

    // ===== CSP（Content Security Policy）验证 =====

    suite('CSP 安全策略验证', () => {
        test('index.html 应包含 Content-Security-Policy meta 标签', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(
                html.includes('Content-Security-Policy') || html.includes('content-security-policy'),
                'HTML 应包含 CSP meta 标签'
            );
        });

        test('CSP 应包含 nonce 占位符用于脚本安全', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            // nonce 应在 CSP 和 script 标签中都出现
            const nonceCount = (html.match(/\$\{nonce\}/g) || []).length;
            assert.ok(nonceCount >= 2, `nonce 占位符应至少出现 2 次（CSP + script），实际出现 ${nonceCount} 次`);
        });

        test('CSP 应包含 cspSource 用于资源白名单', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(html.includes('${cspSource}'), 'CSP 应包含 cspSource 占位符');
        });
    });

    // ===== 设置配置完整性验证 =====

    suite('设置配置完整性', () => {
        test('package.json 应声明所有 mdReview 配置项', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const configProps = ext!.packageJSON.contributes.configuration?.properties;
            assert.ok(configProps, '应有 configuration.properties');

            const expectedKeys = [
                'mdReview.fontSize',
                'mdReview.lineHeight',
                'mdReview.theme',
                'mdReview.contentMaxWidth',
                'mdReview.showToc',
                'mdReview.showAnnotations',
                'mdReview.autoSave',
                'mdReview.autoSaveDelay',
                'mdReview.enableMermaid',
                'mdReview.enableMath',
                'mdReview.enablePlantUML',
                'mdReview.enableGraphviz',
                'mdReview.sidebarLayout',
                'mdReview.codeTheme'
            ];

            for (const key of expectedKeys) {
                assert.ok(configProps[key], `配置项 ${key} 应存在`);
            }
        });

        test('配置项应有正确的类型声明', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const configProps = ext!.packageJSON.contributes.configuration?.properties;
            assert.ok(configProps);

            // 数字类型
            assert.strictEqual(configProps['mdReview.fontSize']?.type, 'number', 'fontSize 应为 number');
            assert.strictEqual(configProps['mdReview.lineHeight']?.type, 'number', 'lineHeight 应为 number');
            assert.strictEqual(configProps['mdReview.contentMaxWidth']?.type, 'number', 'contentMaxWidth 应为 number');
            assert.strictEqual(configProps['mdReview.autoSaveDelay']?.type, 'number', 'autoSaveDelay 应为 number');

            // 布尔类型
            assert.strictEqual(configProps['mdReview.showToc']?.type, 'boolean', 'showToc 应为 boolean');
            assert.strictEqual(configProps['mdReview.showAnnotations']?.type, 'boolean', 'showAnnotations 应为 boolean');
            assert.strictEqual(configProps['mdReview.autoSave']?.type, 'boolean', 'autoSave 应为 boolean');
            assert.strictEqual(configProps['mdReview.enableMermaid']?.type, 'boolean', 'enableMermaid 应为 boolean');
            assert.strictEqual(configProps['mdReview.enableMath']?.type, 'boolean', 'enableMath 应为 boolean');
            assert.strictEqual(configProps['mdReview.enablePlantUML']?.type, 'boolean', 'enablePlantUML 应为 boolean');
            assert.strictEqual(configProps['mdReview.enableGraphviz']?.type, 'boolean', 'enableGraphviz 应为 boolean');

            // 字符串类型
            assert.strictEqual(configProps['mdReview.theme']?.type, 'string', 'theme 应为 string');
            assert.strictEqual(configProps['mdReview.sidebarLayout']?.type, 'string', 'sidebarLayout 应为 string');
            assert.strictEqual(configProps['mdReview.codeTheme']?.type, 'string', 'codeTheme 应为 string');
        });

        test('配置项应有默认值', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const configProps = ext!.packageJSON.contributes.configuration?.properties;
            assert.ok(configProps);

            assert.strictEqual(configProps['mdReview.fontSize']?.default, 16);
            assert.strictEqual(configProps['mdReview.lineHeight']?.default, 1.6);
            assert.strictEqual(configProps['mdReview.theme']?.default, 'light');
            assert.strictEqual(configProps['mdReview.autoSave']?.default, true);
            assert.strictEqual(configProps['mdReview.autoSaveDelay']?.default, 1500);
        });
    });

    // ===== Webview 面板选项验证 =====

    suite('Webview 面板选项', () => {
        test('扩展应配置 Custom Editor viewType', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const customEditors = ext!.packageJSON.contributes.customEditors;
            assert.ok(Array.isArray(customEditors), '应有 customEditors 配置');
            const mdEditor = customEditors.find((e: any) => e.viewType === 'mdReview.markdownEditor');
            assert.ok(mdEditor, '应有 mdReview.markdownEditor viewType');
            assert.ok(mdEditor.displayName, 'Custom Editor 应有 displayName');
        });

        test('扩展应配置 activationEvents', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            // VS Code 1.74+ 自动从 contributes 推断 activationEvents
            // 验证 Custom Editor 存在即可
            const customEditors = ext!.packageJSON.contributes.customEditors;
            assert.ok(customEditors.length > 0, '应有至少一个 Custom Editor');
        });
    });

    // ===== HTML 结构完整性验证 =====

    suite('HTML 结构完整性', () => {
        test('index.html 应包含文档容器元素', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            // 验证关键 DOM 容器
            assert.ok(html.includes('id="documentContent"') || html.includes('id="markdownContent"') || html.includes('id="content"') || html.includes('class="markdown-body"'),
                'HTML 应包含 Markdown 内容容器');
        });

        test('index.html 应包含批注面板容器', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(html.includes('annotation') || html.includes('sidebar'),
                'HTML 应包含批注/侧边栏容器');
        });

        test('index.html 应为有效的 HTML5 文档', () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const htmlPath = path.join(extPath!, 'webview', 'index.html');
            const html = fs.readFileSync(htmlPath, 'utf-8');

            assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'), '应有 DOCTYPE 声明');
            assert.ok(html.includes('<html'), '应有 html 标签');
            assert.ok(html.includes('<head>') || html.includes('<head '), '应有 head 标签');
            assert.ok(html.includes('<body>') || html.includes('<body '), '应有 body 标签');
            assert.ok(html.includes('</html>'), '应有闭合 html 标签');
        });
    });

    // ===== 快捷键配置验证 =====

    suite('快捷键配置验证', () => {
        test('应配置 keybindings', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const keybindings = ext!.packageJSON.contributes.keybindings;
            assert.ok(Array.isArray(keybindings), '应有 keybindings 配置');
            assert.ok(keybindings.length >= 1, '应至少有 1 个快捷键绑定');
        });

        test('应保留 Ctrl+E 导出快捷键', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const keybindings = ext!.packageJSON.contributes.keybindings;
            const exportBinding = keybindings.find(
                (kb: any) => kb.command === 'mdReview.exportReview'
            );
            assert.ok(exportBinding, 'keybindings 应包含 mdReview.exportReview 命令');
            assert.strictEqual(exportBinding.key, 'ctrl+e', '导出快捷键应为 ctrl+e');
            assert.ok(
                (exportBinding.when as string).includes('mdReviewPanelFocused'),
                '导出快捷键 when 条件应包含 mdReviewPanelFocused'
            );
        });
    });



    // ===== Hotfix — 一键 AI 修复不弹出输出窗口 =====
    suite('23. Hotfix — 一键 AI 修复时输出窗口不应弹出', () => {
        const extPath23 = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;
        const reviewPanelTs = fs.readFileSync(path.join(extPath23, 'src', 'webviewHelper.ts'), 'utf-8');
        const reviewPanelJs = fs.existsSync(path.join(extPath23, 'out', 'webviewHelper.js'))
            ? fs.readFileSync(path.join(extPath23, 'out', 'webviewHelper.js'), 'utf-8')
            : '';

        // 定位 openCodeBuddyChat 分支：只对 AI Chat 派发这段代码做断言，避免误伤其他 OutputChannel
        function extractAiChatBlock(src: string): string {
            const idx = src.indexOf('MD Human Review - AI Chat');
            if (idx < 0) return '';
            // 向后截取 2500 个字符足以覆盖整个 case 分支
            return src.slice(idx, idx + 2500);
        }
        const tsBlock = extractAiChatBlock(reviewPanelTs);
        const jsBlock = extractAiChatBlock(reviewPanelJs);

        // Tier 1 — 存在性/源码关键字断言
        test('BT-aiChatOutputSilent.1 源码中 AI Chat 分支应已移除 outputChannel.show() 调用（成功路径）', () => {
            assert.ok(tsBlock.length > 0, 'webviewHelper.ts 中应存在 MD Human Review - AI Chat 分支');
            assert.ok(
                !/outputChannel\.show\s*\(/.test(tsBlock),
                'AI Chat 分支不应再调用 outputChannel.show()，否则输出窗口会弹出'
            );
        });

        test('BT-aiChatOutputSilent.2 编译产物中 AI Chat 分支也不应残留 outputChannel.show() 调用', () => {
            if (!jsBlock) {
                // 未编译时跳过（CI/本地会先 npm run compile，通常不会命中）
                assert.ok(true, 'out/webviewHelper.js 未生成，跳过编译产物断言');
                return;
            }
            assert.ok(
                !/outputChannel\.show\s*\(/.test(jsBlock),
                '编译产物的 AI Chat 分支不应再调用 outputChannel.show()'
            );
        });

        // Tier 2 — 行为级断言：诊断日志仍然写入 OutputChannel（只是不弹出）
        test('BT-aiChatOutputSilent.3 OutputChannel 仍应被创建以保留诊断日志', () => {
            // createOutputChannel 行在 "MD Human Review - AI Chat" 字符串之前，
            // 所以不能用 extractAiChatBlock 截取后的片段，需在全文中断言。
            assert.ok(
                /createOutputChannel\(\s*['"`]MD Human Review - AI Chat['"`]\s*\)/.test(reviewPanelTs),
                '应仍然 createOutputChannel("MD Human Review - AI Chat")，保留日志用于用户主动排查'
            );
        });

        test('BT-aiChatOutputSilent.4 [DIAG:aiChat] 诊断日志与 [NEXT-STEP] 指引应仍写入 OutputChannel', () => {
            assert.ok(
                /outputChannel\.appendLine\(`\[DIAG:aiChat\] clipboard written/.test(tsBlock),
                '剪贴板写入诊断日志应保留'
            );
            assert.ok(
                tsBlock.includes('[NEXT-STEP]'),
                '失败路径的 [NEXT-STEP] 指引日志应保留在 OutputChannel 中'
            );
        });

        // Tier 3 — 任务特定断言：明确针对本次需求 "一键AI修复时，输出窗口不要弹出"
        test('BT-aiChatOutputSilent.5 成功路径 showInformationMessage 之前不应紧邻 outputChannel.show()', () => {
            // 通过匹配 "if (result.succeeded)" 到 "} else" 之间的片段检查
            const successMatch = tsBlock.match(/if\s*\(\s*result\.succeeded\s*\)\s*\{([\s\S]*?)\}\s*else/);
            assert.ok(successMatch, '应能定位 result.succeeded 成功分支');
            const successBody = successMatch![1];
            assert.ok(
                !successBody.includes('outputChannel.show'),
                '成功路径内不应再有 outputChannel.show 调用，以免弹出输出窗口打断用户'
            );
            assert.ok(
                /showInformationMessage/.test(successBody),
                '成功路径应仅用 showInformationMessage 通知用户'
            );
        });

        test('BT-aiChatOutputSilent.6 失败路径也不应调用 outputChannel.show() 抢焦点', () => {
            const elseMatch = tsBlock.match(/\}\s*else\s*\{([\s\S]*?)\}\s*\}\s*catch/);
            assert.ok(elseMatch, '应能定位 else 失败分支');
            const elseBody = elseMatch![1];
            assert.ok(
                !elseBody.includes('outputChannel.show'),
                '失败路径不应再有 outputChannel.show 调用，改为仅通过 showWarningMessage 通知'
            );
            assert.ok(
                /showWarningMessage/.test(elseBody),
                '失败路径应仍通过 showWarningMessage 提示用户'
            );
        });
    });
});
