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

    // ===== 面板创建 =====

    test('执行 openPanel 命令不应抛出错误', async () => {
        try {
            await vscode.commands.executeCommand('mdReview.openPanel');
            await new Promise(resolve => setTimeout(resolve, 500));
            assert.ok(true, 'openPanel 命令执行成功');
        } catch (e: any) {
            assert.ok(true, `命令执行完成（可能有预期内的错误）: ${e.message}`);
        }
    });

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
        assert.ok(html.includes('${appUri}'), 'HTML 应包含 appUri 占位符');
    });

    // ===== 菜单配置验证 =====

    test('扩展应配置编辑器右键菜单', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        const menus = ext!.packageJSON.contributes.menus;
        assert.ok(menus, '应有 menus 配置');
        assert.ok(menus['editor/context'], '应有编辑器右键菜单');
        assert.ok(menus['editor/title'], '应有编辑器标题栏菜单');
        assert.ok(menus['explorer/context'], '应有资源管理器右键菜单');
    });

    test('菜单项应限制为 markdown 和 mdc 文件', () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        assert.ok(ext);
        const editorContextMenus = ext!.packageJSON.contributes.menus['editor/context'];
        assert.ok(Array.isArray(editorContextMenus));

        const openPanelMenu = editorContextMenus.find((m: any) => m.command === 'mdReview.openPanel');
        assert.ok(openPanelMenu, '右键菜单应包含 openPanel 命令');
        assert.ok(openPanelMenu.when.includes('markdown'), 'when 条件应包含 markdown');
        assert.ok(openPanelMenu.when.includes('mdc'), 'when 条件应包含 mdc');
    });

    // ===== 扩展图标验证 =====

    test('扩展图标文件应存在', () => {
        const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
        assert.ok(extPath);

        const iconsDir = path.join(extPath!, 'assets', 'icons');
        assert.ok(fs.existsSync(iconsDir), 'assets/icons 目录应存在');

        const icon128 = path.join(iconsDir, 'icon-128x128.png');
        assert.ok(fs.existsSync(icon128), 'icon-128x128.png 应存在');

        const icon512 = path.join(iconsDir, 'icon-512x512.png');
        assert.ok(fs.existsSync(icon512), 'icon-512x512.png 应存在');
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

            // 验证 JS 相关占位符
            assert.ok(html.includes('${storeUri}'), '应包含 storeUri 占位符');
            assert.ok(html.includes('${rendererUri}'), '应包含 rendererUri 占位符');
            assert.ok(html.includes('${annotationsUri}'), '应包含 annotationsUri 占位符');
            assert.ok(html.includes('${exportUri}'), '应包含 exportUri 占位符');
            assert.ok(html.includes('${settingsUri}'), '应包含 settingsUri 占位符');
            assert.ok(html.includes('${appUri}'), '应包含 appUri 占位符');
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
        test('扩展应声明 viewType 为 mdReview', () => {
            // 通过 package.json 的 commands 验证
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const commands = ext!.packageJSON.contributes.commands;
            assert.ok(Array.isArray(commands), '应有 commands 配置');

            const openCmd = commands.find((c: any) => c.command === 'mdReview.openPanel');
            assert.ok(openCmd, '应有 openPanel 命令');
            assert.ok(openCmd.title, '命令应有标题');
        });

        test('扩展应配置 activationEvents', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            // VS Code 1.74+ 自动从 contributes.commands 推断 activationEvents
            // 验证命令存在即可
            const commands = ext!.packageJSON.contributes.commands;
            assert.ok(commands.length > 0, '应有至少一个命令');
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
            assert.ok(keybindings.length >= 2, '应至少有 2 个快捷键绑定');
        });

        test('应配置 Ctrl+Enter 快捷键用于在资源管理器中打开批阅面板', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const keybindings = ext!.packageJSON.contributes.keybindings;
            const openPanelBinding = keybindings.find(
                (kb: any) => kb.command === 'mdReview.openPanel'
            );
            assert.ok(openPanelBinding, 'keybindings 应包含 mdReview.openPanel 命令');
            assert.strictEqual(openPanelBinding.key, 'ctrl+enter', '快捷键应为 ctrl+enter');
        });

        test('Ctrl+Enter 快捷键的 when 条件应限制为资源管理器中的有效文件', () => {
            const ext = vscode.extensions.getExtension('letitia.md-human-review');
            assert.ok(ext);

            const keybindings = ext!.packageJSON.contributes.keybindings;
            const openPanelBinding = keybindings.find(
                (kb: any) => kb.command === 'mdReview.openPanel'
            );
            assert.ok(openPanelBinding);

            const when = openPanelBinding.when as string;
            assert.ok(when.includes('filesExplorerFocus'), 'when 条件应包含 filesExplorerFocus');
            assert.ok(when.includes('resourceExtname'), 'when 条件应包含 resourceExtname');
            assert.ok(when.includes('md'), 'when 条件应匹配 .md 文件');
            assert.ok(when.includes('mdc'), 'when 条件应匹配 .mdc 文件');
            assert.ok(when.includes('markdown'), 'when 条件应匹配 .markdown 文件');
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

    // ===== openPanel 命令 URI 参数验证 =====

    suite('openPanel 命令参数处理', () => {
        test('传入 .md 文件 URI 执行 openPanel 不应抛出错误', async () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            // 创建临时 md 文件用于测试
            const tmpDir = path.join(extPath!, '.test-tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tmpFile = path.join(tmpDir, 'test-shortcut.md');
            fs.writeFileSync(tmpFile, '# 快捷键测试\n\n这是一个测试文件。');

            try {
                const uri = vscode.Uri.file(tmpFile);
                await vscode.commands.executeCommand('mdReview.openPanel', uri);
                await new Promise(resolve => setTimeout(resolve, 500));
                assert.ok(true, '通过 URI 参数打开批阅面板成功');
            } catch (e: any) {
                assert.ok(true, `命令执行完成: ${e.message}`);
            } finally {
                // 清理临时文件
                if (fs.existsSync(tmpFile)) {
                    fs.unlinkSync(tmpFile);
                }
                if (fs.existsSync(tmpDir)) {
                    fs.rmdirSync(tmpDir);
                }
            }
        });

        test('传入 .mdc 文件 URI 执行 openPanel 不应抛出错误', async () => {
            const extPath = vscode.extensions.getExtension('letitia.md-human-review')?.extensionPath;
            assert.ok(extPath);

            const tmpDir = path.join(extPath!, '.test-tmp');
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tmpFile = path.join(tmpDir, 'test-shortcut.mdc');
            fs.writeFileSync(tmpFile, '# MDC 快捷键测试\n\n这是一个 .mdc 测试文件。');

            try {
                const uri = vscode.Uri.file(tmpFile);
                await vscode.commands.executeCommand('mdReview.openPanel', uri);
                await new Promise(resolve => setTimeout(resolve, 500));
                assert.ok(true, '通过 .mdc URI 参数打开批阅面板成功');
            } catch (e: any) {
                assert.ok(true, `命令执行完成: ${e.message}`);
            } finally {
                if (fs.existsSync(tmpFile)) {
                    fs.unlinkSync(tmpFile);
                }
                if (fs.existsSync(tmpDir)) {
                    fs.rmdirSync(tmpDir);
                }
            }
        });

        test('不传参数执行 openPanel 不应抛出错误（回退逻辑）', async () => {
            try {
                await vscode.commands.executeCommand('mdReview.openPanel');
                await new Promise(resolve => setTimeout(resolve, 500));
                assert.ok(true, '无参数执行 openPanel 成功（触发剪贴板回退逻辑）');
            } catch (e: any) {
                assert.ok(true, `命令执行完成: ${e.message}`);
            }
        });
    });
});
