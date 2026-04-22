/**
 * settings.js - 设置模块
 * 管理用户偏好设置，通过 postMessage 与 Extension Host 通信
 * 实时预览设置变更效果
 */
const Settings = (() => {

    // 默认设置
    const DEFAULTS = {
        fontSize: 16,
        lineHeight: 1.6,
        contentMaxWidth: 1100,
        fontFamily: '',
        codeFontFamily: '',
        theme: 'light',
        showToc: true,
        showAnnotations: true,
        sidebarLayout: 'toc-left',
        panelMode: 'floating',
        documentAlign: 'center',
        enableMermaid: true,
        enableMath: true,
        enablePlantUML: true,
        enableGraphviz: true,
        showLineNumbers: false,
        autoSave: true,
        autoSaveDelay: 1500,
        codeTheme: 'default-dark-modern',
        language: 'zh-CN'
    };

    // 暗色代码主题列表
    const DARK_CODE_THEMES = [
        'github-dark', 'monokai', 'vs2015', 'atom-one-dark', 'dracula',
        'nord', 'solarized-dark', 'tokyo-night', 'one-dark-pro', 'default-dark-modern'
    ];

    let currentSettings = { ...DEFAULTS };
    let panelVisible = false;

    // 设置变更回调列表（外部模块可注册监听）
    let _onChangeCallbacks = [];

    /**
     * 初始化：从 Extension Host 获取设置
     */
    function init() {
        // 请求当前设置
        vscode.postMessage({ type: 'getSettings' });

        // 监听系统主题变化（auto 模式下自动切换）
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (currentSettings.theme === 'auto') {
                applyTheme('auto');
                // 通知外部模块（如顶部主题按钮标签）刷新
                _notifyChange('themeChanged', 'auto');
            }
        });
    }

    /**
     * 接收来自 Extension Host 的设置数据
     */
    function applySettings(settings) {
        currentSettings = { ...DEFAULTS, ...settings };
        // 应用语言设置
        if (currentSettings.language && window.I18n) {
            window.I18n.setLocale(currentSettings.language);
        }
        applyToDOM();
        updatePanelUI();
    }

    /**
     * 将设置应用到 DOM 样式
     */
    function applyToDOM() {
        const root = document.documentElement;

        // 字体大小
        root.style.setProperty('--doc-font-size', currentSettings.fontSize + 'px');

        // 行高
        root.style.setProperty('--doc-line-height', String(currentSettings.lineHeight));

        // 最大宽度
        root.style.setProperty('--doc-max-width', currentSettings.contentMaxWidth + 'px');

        // 正文字体
        const fontVal = currentSettings.fontFamily;
        if (fontVal === 'serif') {
            root.style.setProperty('--doc-font-family', "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif");
        } else if (fontVal) {
            root.style.setProperty('--doc-font-family', "'" + fontVal + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
        } else {
            root.style.removeProperty('--doc-font-family');
        }

        // 代码字体
        const codeFontVal = currentSettings.codeFontFamily;
        if (codeFontVal) {
            root.style.setProperty('--code-font-family', "'" + codeFontVal + "', 'Fira Code', Consolas, 'Courier New', monospace");
        } else {
            root.style.removeProperty('--code-font-family');
        }

        // 应用到文档内容区
        const docContent = document.getElementById('documentContent');
        if (docContent) {
            docContent.style.fontSize = currentSettings.fontSize + 'px';
            docContent.style.lineHeight = String(currentSettings.lineHeight);
            docContent.style.maxWidth = currentSettings.contentMaxWidth + 'px';
            if (fontVal === 'serif') {
                docContent.style.fontFamily = "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif";
            } else if (fontVal) {
                docContent.style.fontFamily = "'" + fontVal + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            } else {
                docContent.style.fontFamily = '';
            }
        }

        // 主题
        applyTheme(currentSettings.theme);

        // 目录
        const tocPanel2 = document.getElementById('tocPanel');
        if (tocPanel2) {
            if (!currentSettings.showToc) {
                tocPanel2.classList.add('collapsed');
            } else {
                tocPanel2.classList.remove('collapsed');
            }
        }
        // 同步工具栏目录按钮状态
        const btnToggleToc = document.getElementById('btnToggleToc');
        if (btnToggleToc) {
            btnToggleToc.classList.toggle('toc-active', currentSettings.showToc);
            btnToggleToc.classList.toggle('toc-inactive', !currentSettings.showToc);
        }

        // 批注列表
        const annotationsPanel = document.getElementById('annotationsPanel');
        if (annotationsPanel) {
            if (!currentSettings.showAnnotations) {
                annotationsPanel.classList.add('collapsed');
            } else {
                annotationsPanel.classList.remove('collapsed');
            }
        }
        // 同步工具栏批注按钮状态
        const btnToggleAnnotations = document.getElementById('btnToggleAnnotations');
        if (btnToggleAnnotations) {
            btnToggleAnnotations.classList.toggle('panel-hidden', !currentSettings.showAnnotations);
        }

        // 侧边栏布局
        if (currentSettings.sidebarLayout === 'toc-right') {
            document.body.classList.add('sidebar-reversed');
        } else {
            document.body.classList.remove('sidebar-reversed');
        }

        // 代码行号
        if (currentSettings.showLineNumbers) {
            document.body.classList.add('show-line-numbers');
        } else {
            document.body.classList.remove('show-line-numbers');
        }

        // 面板模式
        if (currentSettings.panelMode === 'embedded') {
            document.body.classList.add('panel-embedded');
        } else {
            document.body.classList.remove('panel-embedded');
        }

        // 文档对齐
        document.body.setAttribute('data-doc-align', currentSettings.documentAlign || 'center');

        // 代码高亮主题
        applyCodeTheme(currentSettings.codeTheme);
    }

    /**
     * 应用主题
     */
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else if (theme === 'dark') {
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.add('theme-light');
        }
    }

    /**
     * 解析代码主题 - 直接返回用户选择的主题，不做自动适配
     * 代码高亮主题独立于页面亮暗主题，用户选什么就用什么
     */
    function resolveCodeTheme(codeTheme) {
        // 兼容旧设置中可能存在的 auto 值，回退到默认主题
        if (codeTheme === 'auto') {
            return DEFAULTS.codeTheme;
        }
        return codeTheme;
    }

    /**
     * 应用代码高亮主题
     */
    function applyCodeTheme(codeTheme) {
        const resolved = resolveCodeTheme(codeTheme);
        document.documentElement.setAttribute('data-code-theme', resolved);
        // 标记代码主题的亮暗属性，供 CSS 做跨主题适配
        // 当代码高亮主题为暗色但整体页面为亮色时（或反之），
        // 代码块的 header、行号等框架元素需要根据代码主题的亮暗来决定颜色
        const isDarkCodeTheme = DARK_CODE_THEMES.includes(resolved);
        document.documentElement.setAttribute('data-code-theme-mode', isDarkCodeTheme ? 'dark' : 'light');
    }

    /**
     * 打开设置面板
     */
    function show() {
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            // 先移除 display:none（首屏防闪用），再用 rAF 触发过渡动画
            overlay.style.display = '';
            requestAnimationFrame(() => {
                overlay.classList.add('visible');
            });
            panelVisible = true;
            updatePanelUI();
        }
    }

    /**
     * 关闭设置面板
     */
    function hide() {
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
            panelVisible = false;
            // 过渡结束后恢复 display:none，避免遮挡下层交互
            const onEnd = () => {
                overlay.removeEventListener('transitionend', onEnd);
                if (!panelVisible) {
                    overlay.style.display = 'none';
                }
            };
            overlay.addEventListener('transitionend', onEnd);
        }
    }

    /**
     * 更新面板 UI 到当前设置
     */
    function updatePanelUI() {
        if (!panelVisible) return;

        // 字体大小
        const fontSizeSlider = document.getElementById('settingFontSize');
        const fontSizeValue = document.getElementById('settingFontSizeValue');
        if (fontSizeSlider) fontSizeSlider.value = currentSettings.fontSize;
        if (fontSizeValue) fontSizeValue.textContent = currentSettings.fontSize + 'px';

        // 行高
        const lineHeightSlider = document.getElementById('settingLineHeight');
        const lineHeightValue = document.getElementById('settingLineHeightValue');
        if (lineHeightSlider) lineHeightSlider.value = currentSettings.lineHeight;
        if (lineHeightValue) lineHeightValue.textContent = currentSettings.lineHeight.toFixed(1);

        // 内容宽度
        const widthSlider = document.getElementById('settingMaxWidth');
        const widthValue = document.getElementById('settingMaxWidthValue');
        if (widthSlider) widthSlider.value = currentSettings.contentMaxWidth;
        if (widthValue) widthValue.textContent = currentSettings.contentMaxWidth + 'px';

        // 正文字体下拉框
        const fontSelect = document.getElementById('settingFontFamily');
        const fontCustom = document.getElementById('settingFontFamilyCustom');
        if (fontSelect) {
            const isPreset = Array.from(fontSelect.options).some(o => o.value === currentSettings.fontFamily);
            if (isPreset || !currentSettings.fontFamily) {
                fontSelect.value = currentSettings.fontFamily;
                if (fontCustom) fontCustom.style.display = 'none';
            } else {
                fontSelect.value = '__custom__';
                if (fontCustom) { fontCustom.style.display = ''; fontCustom.value = currentSettings.fontFamily; }
            }
        }

        // 代码字体下拉框
        const codeFontSelect = document.getElementById('settingCodeFontFamily');
        const codeFontCustom = document.getElementById('settingCodeFontFamilyCustom');
        if (codeFontSelect) {
            const isPreset = Array.from(codeFontSelect.options).some(o => o.value === currentSettings.codeFontFamily);
            if (isPreset || !currentSettings.codeFontFamily) {
                codeFontSelect.value = currentSettings.codeFontFamily;
                if (codeFontCustom) codeFontCustom.style.display = 'none';
            } else {
                codeFontSelect.value = '__custom__';
                if (codeFontCustom) { codeFontCustom.style.display = ''; codeFontCustom.value = currentSettings.codeFontFamily; }
            }
        }

        // 主题
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === currentSettings.theme);
        });

        // 语言
        const langSel = document.getElementById('settingLanguage');
        if (langSel) langSel.value = currentSettings.language || 'zh-CN';

        // 代码高亮主题
        const codeThemeSelect = document.getElementById('settingCodeTheme');
        if (codeThemeSelect) codeThemeSelect.value = currentSettings.codeTheme;

        // 代码预览区高亮
        updateCodePreview();

        // 目录
        const tocSwitch = document.getElementById('settingShowToc');
        if (tocSwitch) tocSwitch.checked = currentSettings.showToc;

        // 批注列表
        const annotationsSwitch = document.getElementById('settingShowAnnotations');
        if (annotationsSwitch) annotationsSwitch.checked = currentSettings.showAnnotations;

        // 侧边栏布局
        document.querySelectorAll('.sidebar-layout-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.layout === currentSettings.sidebarLayout);
        });

        // 面板模式
        document.querySelectorAll('.panel-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === currentSettings.panelMode);
        });

        // 文档对齐
        document.querySelectorAll('.doc-align-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === currentSettings.documentAlign);
        });

        // Mermaid
        const mermaidSwitch = document.getElementById('settingEnableMermaid');
        if (mermaidSwitch) mermaidSwitch.checked = currentSettings.enableMermaid;

        // 数学公式
        const mathSwitch = document.getElementById('settingEnableMath');
        if (mathSwitch) mathSwitch.checked = currentSettings.enableMath;

        // PlantUML
        const plantumlSwitch = document.getElementById('settingEnablePlantUML');
        if (plantumlSwitch) plantumlSwitch.checked = currentSettings.enablePlantUML;

        // Graphviz
        const graphvizSwitch = document.getElementById('settingEnableGraphviz');
        if (graphvizSwitch) graphvizSwitch.checked = currentSettings.enableGraphviz;

        // 代码行号
        const lineNumSwitch = document.getElementById('settingShowLineNumbers');
        if (lineNumSwitch) lineNumSwitch.checked = currentSettings.showLineNumbers;

        // 自动保存
        const autoSaveSwitch = document.getElementById('settingAutoSave');
        if (autoSaveSwitch) autoSaveSwitch.checked = currentSettings.autoSave;

        // 自动保存延迟
        const delaySlider = document.getElementById('settingAutoSaveDelay');
        const delayValue = document.getElementById('settingAutoSaveDelayValue');
        if (delaySlider) delaySlider.value = currentSettings.autoSaveDelay;
        if (delayValue) delayValue.textContent = (currentSettings.autoSaveDelay / 1000).toFixed(1) + 's';

        // 排版预览
        updateTypographyPreview();
    }

    /**
     * 更新代码预览区的语法高亮
     * 预渲染好的 hljs 标签不需要运行时高亮，只需切换 data-code-theme 属性
     */
    function updateCodePreview() {
        const previewContainer = document.getElementById('codeThemePreview');
        if (!previewContainer) return;
        const previewTheme = currentSettings.codeTheme;
        previewContainer.setAttribute('data-code-theme', previewTheme);
    }

    /**
     * 更新排版预览区的样式
     */
    function updateTypographyPreview() {
        const preview = document.getElementById('typographyPreview');
        if (!preview) return;
        preview.style.fontSize = currentSettings.fontSize + 'px';
        preview.style.lineHeight = String(currentSettings.lineHeight);
        preview.style.maxWidth = currentSettings.contentMaxWidth + 'px';
        const fv = currentSettings.fontFamily;
        if (fv === 'serif') {
            preview.style.fontFamily = "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif";
        } else if (fv) {
            preview.style.fontFamily = "'" + fv + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        } else {
            preview.style.fontFamily = '';
        }
    }

    /**
     * 绑定设置面板事件
     */
    function bindEvents() {
        // 打开/关闭
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) btnSettings.addEventListener('click', show);

        const closeBtn = document.getElementById('btnCloseSettings');
        if (closeBtn) closeBtn.addEventListener('click', hide);

        const overlay = document.getElementById('settingsOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) hide();
            });
        }

        // 主题按钮组
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentSettings.theme = btn.dataset.theme;
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyToDOM();
                saveSettings();
                // 通知外部模块主题已变更（用于 Mermaid 重新渲染等）
                _notifyChange('themeChanged', btn.dataset.theme);
            });
        });

        // 语言切换下拉框
        const langSelect = document.getElementById('settingLanguage');
        if (langSelect) {
            langSelect.addEventListener('change', () => {
                currentSettings.language = langSelect.value;
                if (window.I18n) {
                    window.I18n.setLocale(currentSettings.language);
                }
                saveSettings();
                // 通知外部模块语言已变更（用于刷新动态生成的文本，如顶部主题按钮标签）
                _notifyChange('languageChanged', currentSettings.language);
            });
        }

        // 代码高亮主题下拉框
        const codeThemeSelect = document.getElementById('settingCodeTheme');
        if (codeThemeSelect) {
            codeThemeSelect.addEventListener('change', () => {
                currentSettings.codeTheme = codeThemeSelect.value;
                applyCodeTheme(currentSettings.codeTheme);
                updateCodePreview();
                saveSettings();
            });
        }

        // 正文字体下拉框
        const fontFamilySelect = document.getElementById('settingFontFamily');
        const fontFamilyCustom = document.getElementById('settingFontFamilyCustom');
        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', () => {
                if (fontFamilySelect.value === '__custom__') {
                    if (fontFamilyCustom) { fontFamilyCustom.style.display = ''; fontFamilyCustom.focus(); }
                } else {
                    if (fontFamilyCustom) fontFamilyCustom.style.display = 'none';
                    currentSettings.fontFamily = fontFamilySelect.value;
                    applyToDOM();
                    updateTypographyPreview();
                    saveSettings();
                }
            });
        }
        if (fontFamilyCustom) {
            fontFamilyCustom.addEventListener('change', () => {
                currentSettings.fontFamily = fontFamilyCustom.value.trim();
                applyToDOM();
                updateTypographyPreview();
                saveSettings();
            });
        }

        // 代码字体下拉框
        const codeFontSelect = document.getElementById('settingCodeFontFamily');
        const codeFontCustom = document.getElementById('settingCodeFontFamilyCustom');
        if (codeFontSelect) {
            codeFontSelect.addEventListener('change', () => {
                if (codeFontSelect.value === '__custom__') {
                    if (codeFontCustom) { codeFontCustom.style.display = ''; codeFontCustom.focus(); }
                } else {
                    if (codeFontCustom) codeFontCustom.style.display = 'none';
                    currentSettings.codeFontFamily = codeFontSelect.value;
                    applyToDOM();
                    saveSettings();
                }
            });
        }
        if (codeFontCustom) {
            codeFontCustom.addEventListener('change', () => {
                currentSettings.codeFontFamily = codeFontCustom.value.trim();
                applyToDOM();
                saveSettings();
            });
        }

        // 字体大小滑块
        const fontSizeSlider = document.getElementById('settingFontSize');
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', () => {
                currentSettings.fontSize = parseInt(fontSizeSlider.value);
                document.getElementById('settingFontSizeValue').textContent = currentSettings.fontSize + 'px';
                applyToDOM();
                updateTypographyPreview();
            });
            fontSizeSlider.addEventListener('change', () => {
                saveSettings();
            });
        }

        // 行高滑块
        const lineHeightSlider = document.getElementById('settingLineHeight');
        if (lineHeightSlider) {
            lineHeightSlider.addEventListener('input', () => {
                currentSettings.lineHeight = parseFloat(lineHeightSlider.value);
                document.getElementById('settingLineHeightValue').textContent = currentSettings.lineHeight.toFixed(1);
                applyToDOM();
                updateTypographyPreview();
            });
            lineHeightSlider.addEventListener('change', () => {
                saveSettings();
            });
        }

        // 内容宽度滑块
        const widthSlider = document.getElementById('settingMaxWidth');
        if (widthSlider) {
            widthSlider.addEventListener('input', () => {
                currentSettings.contentMaxWidth = parseInt(widthSlider.value);
                document.getElementById('settingMaxWidthValue').textContent = currentSettings.contentMaxWidth + 'px';
                applyToDOM();
                updateTypographyPreview();
            });
            widthSlider.addEventListener('change', () => {
                saveSettings();
            });
        }

        // 目录开关
        const tocSwitch = document.getElementById('settingShowToc');
        if (tocSwitch) {
            tocSwitch.addEventListener('change', () => {
                currentSettings.showToc = tocSwitch.checked;
                const tocPanel = document.getElementById('tocPanel');
                if (tocSwitch.checked) {
                    tocPanel.classList.remove('collapsed');
                } else {
                    tocPanel.classList.add('collapsed');
                }
                // 同步工具栏目录按钮状态
                const tocToolbarBtn = document.getElementById('btnToggleToc');
                if (tocToolbarBtn) {
                    tocToolbarBtn.classList.toggle('toc-active', tocSwitch.checked);
                    tocToolbarBtn.classList.toggle('toc-inactive', !tocSwitch.checked);
                }
                saveSettings();
            });
        }

        // 批注列表开关
        const annotationsSwitch = document.getElementById('settingShowAnnotations');
        if (annotationsSwitch) {
            annotationsSwitch.addEventListener('change', () => {
                currentSettings.showAnnotations = annotationsSwitch.checked;
                const annotationsPanel = document.getElementById('annotationsPanel');
                if (annotationsPanel) {
                    if (annotationsSwitch.checked) {
                        annotationsPanel.classList.remove('collapsed');
                    } else {
                        annotationsPanel.classList.add('collapsed');
                    }
                }
                saveSettings();
            });
        }

        // 侧边栏布局按钮组
        document.querySelectorAll('.sidebar-layout-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentSettings.sidebarLayout = btn.dataset.layout;
                document.querySelectorAll('.sidebar-layout-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyToDOM();
                saveSettings();
            });
        });

        // 面板模式按钮组
        document.querySelectorAll('.panel-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentSettings.panelMode = btn.dataset.mode;
                document.querySelectorAll('.panel-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyToDOM();
                saveSettings();
            });
        });

        // 文档对齐按钮组
        document.querySelectorAll('.doc-align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentSettings.documentAlign = btn.dataset.align;
                document.querySelectorAll('.doc-align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyToDOM();
                saveSettings();
            });
        });

        // Mermaid 开关
        const mermaidSwitch = document.getElementById('settingEnableMermaid');
        if (mermaidSwitch) {
            mermaidSwitch.addEventListener('change', () => {
                currentSettings.enableMermaid = mermaidSwitch.checked;
                applyToDOM();
                saveSettings();
                _notifyChange('enableMermaid', mermaidSwitch.checked);
            });
        }

        // 数学公式开关
        const mathSwitch = document.getElementById('settingEnableMath');
        if (mathSwitch) {
            mathSwitch.addEventListener('change', () => {
                currentSettings.enableMath = mathSwitch.checked;
                applyToDOM();
                saveSettings();
                _notifyChange('enableMath', mathSwitch.checked);
            });
        }

        // PlantUML 开关
        const plantumlSwitch = document.getElementById('settingEnablePlantUML');
        if (plantumlSwitch) {
            plantumlSwitch.addEventListener('change', () => {
                currentSettings.enablePlantUML = plantumlSwitch.checked;
                applyToDOM();
                saveSettings();
                _notifyChange('enablePlantUML', plantumlSwitch.checked);
            });
        }

        // Graphviz 开关
        const graphvizSwitch = document.getElementById('settingEnableGraphviz');
        if (graphvizSwitch) {
            graphvizSwitch.addEventListener('change', () => {
                currentSettings.enableGraphviz = graphvizSwitch.checked;
                applyToDOM();
                saveSettings();
                _notifyChange('enableGraphviz', graphvizSwitch.checked);
            });
        }

        // 代码行号开关
        const lineNumSwitch = document.getElementById('settingShowLineNumbers');
        if (lineNumSwitch) {
            lineNumSwitch.addEventListener('change', () => {
                currentSettings.showLineNumbers = lineNumSwitch.checked;
                applyToDOM();
                saveSettings();
            });
        }

        // 自动保存开关
        const autoSaveSwitch = document.getElementById('settingAutoSave');
        if (autoSaveSwitch) {
            autoSaveSwitch.addEventListener('change', () => {
                currentSettings.autoSave = autoSaveSwitch.checked;
                if (currentSettings.autoSave) {
                    Exporter.enableAutoSave();
                } else {
                    Exporter.disableAutoSave();
                }
                saveSettings();
            });
        }

        // 自动保存延迟
        const delaySlider = document.getElementById('settingAutoSaveDelay');
        if (delaySlider) {
            delaySlider.addEventListener('input', () => {
                currentSettings.autoSaveDelay = parseInt(delaySlider.value);
                document.getElementById('settingAutoSaveDelayValue').textContent = (currentSettings.autoSaveDelay / 1000).toFixed(1) + 's';
            });
            delaySlider.addEventListener('change', () => {
                saveSettings();
            });
        }

        // 重置按钮
        const resetBtn = document.getElementById('btnResetSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentSettings = { ...DEFAULTS };
                updatePanelUI();
                applyToDOM();
                applyCodeTheme(currentSettings.codeTheme);
                saveSettings();
                // 同步工具栏目录按钮状态
                const tocToolbarBtn = document.getElementById('btnToggleToc');
                if (tocToolbarBtn) {
                    tocToolbarBtn.classList.toggle('toc-active', currentSettings.showToc);
                    tocToolbarBtn.classList.toggle('toc-inactive', !currentSettings.showToc);
                }
                // 通知外部模块（如 Mermaid/数学公式渲染）刷新页面
                _notifyChange('reset', null);
            });
        }

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panelVisible) {
                hide();
            }
        });
    }

    /**
     * 保存设置到 Extension Host
     */
    function saveSettings() {
        vscode.postMessage({
            type: 'saveSettings',
            payload: { ...currentSettings }
        });
        // Toast 提示
        let toast = document.getElementById('_toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = '_toast';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.textContent = typeof t === 'function' ? t('settings.saved_toast') : '✅ 设置已自动保存';
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 2000);
    }

    /**
     * 获取当前设置
     */
    function getSettings() {
        return { ...currentSettings };
    }

    /**
     * 注册设置变更回调
     * @param {function} callback - 回调函数，参数为 (key, value)
     */
    function onChange(callback) {
        if (typeof callback === 'function') {
            _onChangeCallbacks.push(callback);
        }
    }

    /**
     * 通知所有注册的回调
     */
    function _notifyChange(key, value) {
        for (const cb of _onChangeCallbacks) {
            try { cb(key, value); } catch (e) { console.warn('[Settings] onChange callback error:', e); }
        }
    }

    return {
        init,
        applySettings,
        show,
        hide,
        bindEvents,
        getSettings,
        applyToDOM,
        onChange
    };
})();
