/**
 * i18n.js - 国际化模块
 * 维护 zh-CN 和 en 两套翻译字典，提供 t(key, params?) 翻译函数
 * 支持 data-i18n / data-i18n-title / data-i18n-placeholder / data-i18n-html 属性自动翻译
 */
window.I18n = (() => {
    let _locale = 'zh-CN';

    const _dict = {
        'zh-CN': {
            // ===== 工具栏 =====
            'toolbar.help_title': '使用帮助',
            'toolbar.file_select_title': '选择MD文件',
            'toolbar.file_select_default': '-- 选择文件 --',
            'toolbar.no_file': '未打开文件',
            'toolbar.file_changed': '文件已更新',
            'toolbar.save_title': '保存修改到源文件 (Ctrl+S)',
            'toolbar.save': '保存',
            'toolbar.toc_title': '展开/收起目录导航',
            'toolbar.toc': '目录',
            'toolbar.zen_title': '禅模式：隐藏侧栏，专注阅读 (Alt+Z)',
            'toolbar.zen': '禅模式',
            'toolbar.exit_zen': '退出禅模式',
            'toolbar.theme_title': '切换亮色/暗色主题',
            'toolbar.theme': '主题',
            'toolbar.mode_title': '切换预览/编辑模式',
            'toolbar.mode_preview': '预览',
            'toolbar.mode_edit': '编辑',
            'toolbar.annotations_title': '展开/收起批注列表',
            'toolbar.annotations_count': '{count} 条批注',
            'toolbar.annotations_zero': '0 条批注',
            'toolbar.ai_fix_title': '根据批阅记录一键AI修复源文件',
            'toolbar.ai_fix': '一键AI修复',
            'toolbar.settings_title': '设置',
            'toolbar.refresh_title': '刷新当前文件',
            'toolbar.scroll_top_title': '回到顶部',

            // ===== 欢迎页 =====
            'welcome.title': '欢迎使用 MD Human Review',
            'welcome.subtitle': '打开一个 Markdown 文件，像导师批改论文一样进行批阅',
            'welcome.feature_comment': '选中文字添加评论',
            'welcome.feature_delete': '标记删除内容',
            'welcome.feature_image': '评论中插入图片',
            'welcome.feature_ai': '一键 AI 修复',
            'welcome.hint_open': '💡 打开 <code>.md</code> 文件后，通过命令面板或右键菜单<code>打开批阅面板</code>',
            'welcome.hint_save': '批阅记录会自动保存到工作区 <code>.review/</code> 目录',

            // ===== 目录面板 =====
            'toc.title': '目录',
            'toc.hide_title': '隐藏目录面板',
            'toc.menu_title': '更多操作',
            'toc.collapse_all': '折叠全部',
            'toc.expand_all': '展开全部',
            'toc.empty': '打开文档后自动生成目录',

            // ===== 编辑器工具栏 =====
            'editor.bold_title': '加粗 (Ctrl+B)',
            'editor.italic_title': '斜体 (Ctrl+I)',
            'editor.strikethrough_title': '删除线',
            'editor.h1_title': '一级标题',
            'editor.h2_title': '二级标题',
            'editor.h3_title': '三级标题',
            'editor.ul_title': '无序列表',
            'editor.ol_title': '有序列表',
            'editor.quote_title': '引用块',
            'editor.hr_title': '分隔线',
            'editor.undo_title': '撤销 (Ctrl+Z)',
            'editor.redo_title': '重做 (Ctrl+Y)',
            'editor.tips_title': '编辑模式风险提示',
            'editor.tips_close': '关闭',
            'editor.tips_warning1': '修改内容后，部分 Markdown 扩展语法可能丢失（如数学公式、Mermaid 图表、GitHub 告警块等）',
            'editor.tips_warning2': '仅建议用于<b>轻量文本修改</b>（如修正错别字、勾选任务列表等）',

            // ===== 批注面板 =====
            'annotations.title': '批注列表',
            'annotations.save_title': '保存批阅记录',
            'annotations.save': '保存',
            'annotations.clear_title': '清除所有批注',
            'annotations.clear': '清除',
            'annotations.sort_title': '排序方式',
            'annotations.sort_time': '按批阅时间 ↓',
            'annotations.sort_position': '按文本位置',
            'annotations.hide_title': '隐藏批注面板',
            'annotations.empty': '暂无批注',
            'annotations.empty_hint': '选中文本后右键或点击工具栏添加批注',

            // ===== 右键菜单 =====
            'context_menu.add_comment': '添加评论',
            'context_menu.mark_delete': '标记删除',
            'context_menu.insert_after': '插入内容（在此处之后）',
            'context_menu.insert_before': '插入内容（在此处之前）',
            'context_menu.table_ops': '📊 表格操作',
            'context_menu.insert_row_above': '在上方插入行',
            'context_menu.insert_row_below': '在下方插入行',
            'context_menu.insert_col_left': '在左侧插入列',
            'context_menu.insert_col_right': '在右侧插入列',
            'context_menu.delete_row': '删除当前行',
            'context_menu.delete_col': '删除当前列',

            // ===== 评论弹窗 =====
            'modal.comment.title': '添加评论',
            'modal.comment.edit_title': '编辑评论',
            'modal.comment.selected_text': '选中的文本：',
            'modal.comment.content': '评论内容：',
            'modal.comment.placeholder': '输入你的评论...',
            'modal.comment.image_label': '插入图片（可选）：',
            'modal.comment.image_hint': '点击、拖拽或 Ctrl+V 粘贴图片',
            'modal.comment.cancel': '取消',
            'modal.comment.submit': '提交评论',

            // ===== 插入弹窗 =====
            'modal.insert.title_after': '插入内容',
            'modal.insert.title_before': '插入内容（在此处之前）',
            'modal.insert.position_after': '插入位置（在此内容之后）：',
            'modal.insert.position_before': '插入位置（在此内容之前）：',
            'modal.insert.content': '要插入的内容：',
            'modal.insert.content_placeholder': '输入要插入的内容（支持Markdown格式）...',
            'modal.insert.reason': '插入说明（可选）：',
            'modal.insert.reason_placeholder': '说明插入原因...',
            'modal.insert.cancel': '取消',
            'modal.insert.submit': '确认插入',

            // ===== 清除弹窗 =====
            'modal.clear.title': '⚠️ 清除所有批注',
            'modal.clear.message': '确定要清除所有批注吗？',
            'modal.clear.warning': '此操作不可恢复！',
            'modal.clear.cancel': '取消',
            'modal.clear.confirm': '确认清除',

            // ===== AI修复弹窗 =====
            'modal.ai.title': '🤖 一键AI修复确认',
            'modal.ai.warning': '此操作将生成 AI 修改指令文件，保存到工作区 <code>.review/</code> 目录。',
            'modal.ai.cancel': '取消',
            'modal.ai.confirm': '生成AI指令',

            // ===== AI结果弹窗 =====
            'modal.ai_result.title': '📋 AI 指令生成',
            'modal.ai_result.close': '关闭',
            'modal.ai_result.vscode_hint': '⚠️ 指令已在剪贴板，请Ctrl+V粘贴到CodeBuddy对话发送',
            'modal.ai_result.execute': '🚀 确定执行',

            // ===== 帮助弹窗 =====
            'help.title': '📖 使用帮助',
            'help.ok': '知道了',
            'help.quick_start_title': '🚀 快速开始',
            'help.quick_start_intro': '在 VSCode 中打开 <code>.md</code> 或 <code>.mdc</code> 文件，通过以下方式打开批阅面板：',
            'help.quick_start_command': '<strong>命令面板</strong>：<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> → 搜索「MD Human Review: 打开批阅面板」',
            'help.quick_start_context': '<strong>右键菜单</strong>：在编辑器或资源管理器中右键选择',
            'help.quick_start_titlebar': '<strong>编辑器标题栏</strong>：点击标题栏图标按钮',
            'help.comment_title': '💬 添加评论',
            'help.comment_1': '在文档中<strong>选中一段文字</strong>',
            'help.comment_2': '松开鼠标后出现浮层工具条，点击 <strong>「💬 评论」</strong>（也可右键选择）',
            'help.comment_3': '在弹窗中输入评论内容，可选上传图片（点击、拖拽或 <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴）',
            'help.comment_4': '点击 <strong>「提交评论」</strong>',
            'help.comment_hint': '选中的文字会被标记为 <span style="color:var(--primary);font-weight:600;">紫色高亮</span>，右侧批注栏同步显示评论卡片。',
            'help.delete_title': '🗑️ 标记删除',
            'help.delete_1': '<strong>选中</strong>需要删除的文字',
            'help.delete_2': '点击浮层中的 <strong>「🗑️ 删除」</strong>（或右键选择）',
            'help.delete_hint': '被标记的文字会以 <span style="text-decoration:line-through;color:var(--danger);">删除线</span> 样式展示。',
            'help.insert_title': '➕ 插入内容',
            'help.insert_1': '<strong>选中</strong>一段文字作为插入位置的锚点',
            'help.insert_2': '右键选择 <strong>「➕ 插入内容（在此处之后）」</strong> 或 <strong>「⬆️ 插入内容（在此处之前）」</strong>',
            'help.insert_3': '输入要插入的内容（支持 Markdown 格式），可选填插入说明',
            'help.edit_title': '✏️ 直接编辑（所见即所得）',
            'help.edit_1': '点击工具栏的 <strong>「预览/编辑」</strong> 切换按钮（或按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>）',
            'help.edit_2': '直接在渲染后的文档上修改内容，支持 WYSIWYG 工具栏（加粗、斜体、删除线、标题、列表、引用、分隔线、撤销/重做）',
            'help.edit_3': '编辑模式下右键表格可 <strong>插入/删除行列</strong>',
            'help.edit_4': '按 <kbd>Ctrl</kbd>+<kbd>S</kbd> 手动保存，或等待自动保存',
            'help.ai_title': '🤖 一键 AI 修复',
            'help.ai_1': '完成批阅后，点击工具栏 <strong>「一键AI修复」</strong> 按钮',
            'help.ai_2': '确认后生成结构化 AI 修改指令文件，保存到 <code>.review/</code> 目录',
            'help.ai_3': '点击 <strong>「🚀 确定执行」</strong> 自动发送指令到 CodeBuddy / 工蜂 Copilot 对话窗口',
            'help.ai_4': '也可点击 <strong>「📋 一键复制指令」</strong> 手动粘贴到任意 AI 工具',
            'help.export_title': '📤 导出与存储',
            'help.export_1': '按 <kbd>Ctrl</kbd>+<kbd>E</kbd> 导出批阅记录为 AI 可读的结构化 Markdown 指令文件',
            'help.export_2': '批注记录 <strong>自动保存</strong> 到工作区 <code>.review/</code> 目录，批注清空时自动删除记录文件',
            'help.export_3': '源文件内容变更时自动归档旧版本，创建新批阅版本',
            'help.ui_title': '🖥️ 界面功能',
            'help.ui_toc': '<strong>目录导航</strong> — 自动生成文档目录，支持折叠/展开、快速跳转、滚动高亮当前章节',
            'help.ui_annotations': '<strong>批注面板</strong> — 侧边批注列表，支持按时间或文本位置排序、定位、编辑、删除',
            'help.ui_lightbox': '<strong>图片灯箱</strong> — 点击图片放大预览，支持滚轮缩放、拖拽平移、双击还原（<kbd>+</kbd>/<kbd>-</kbd> 缩放，<kbd>0</kbd> 适应窗口，<kbd>R</kbd> 重置）',
            'help.ui_mermaid': '<strong>Mermaid 图表</strong> — 点击 Mermaid 图表放大查看，支持缩放控制条',
            'help.ui_zen': '<strong>禅模式</strong> — 按 <kbd>Alt</kbd>+<kbd>Z</kbd> 隐藏侧栏专注阅读，同时隐藏 IDE 侧边栏',
            'help.ui_theme': '<strong>亮色/暗色主题</strong> — 工具栏一键切换或跟随系统',
            'help.ui_file_select': '<strong>文件选择器</strong> — 工作区内 Markdown 文件下拉框快速切换',
            'help.ui_file_change': '<strong>文件变更检测</strong> — 源文件修改后显示「文件已更新」徽章，点击刷新按钮重载',
            'help.ui_resize': '<strong>面板拖拽</strong> — 目录和批注面板宽度可拖拽调整',
            'help.shortcut_title': '⌨️ 快捷键',
            'help.shortcut_zen': '切换禅模式',
            'help.shortcut_export': '导出批阅记录',
            'help.shortcut_save': '保存编辑内容到源文件',
            'help.shortcut_mode': '切换预览/编辑模式',
            'help.shortcut_esc': '关闭弹窗 / 退出禅模式',
            'help.feedback': 'Bug 反馈 & 优化建议',

            // ===== 设置面板 =====
            'settings.title': '设置',
            'settings.subtitle': '自定义 MD Human Review 的外观与行为',
            'settings.appearance_title': '外观主题',
            'settings.appearance_desc': '选择界面的整体风格',
            'settings.theme_label': '主题模式',
            'settings.theme_desc': '切换亮色或暗色风格',
            'settings.theme_light': '☀️ 亮色',
            'settings.theme_dark': '🌙 暗色',
            'settings.theme_auto': '🖥️ 跟随系统',
            'settings.language_title': '🌐 界面语言',
            'settings.language_desc': '选择界面显示语言',
            'settings.language_label': '语言',
            'settings.language_desc2': '切换界面语言',
            'settings.lang_zh': '🇨🇳 中文',
            'settings.lang_en': '🇺🇸 English',
            'settings.typography_title': '排版设置',
            'settings.typography_desc': '调整文档阅读体验',
            'settings.font_label': '🔤 正文字体',
            'settings.font_desc': '选择或输入 Markdown 正文的显示字体',
            'settings.code_font_label': '💻 代码字体',
            'settings.code_font_desc': '选择或输入代码块的显示字体',
            'settings.font_size_label': '🔠 字体大小',
            'settings.font_size_desc': '调整正文字体大小（12px - 24px）',
            'settings.line_height_label': '↕️ 行高',
            'settings.line_height_desc': '调整段落行高（1.2 - 2.4）',
            'settings.max_width_label': '↔️ 内容最大宽度',
            'settings.max_width_desc': '调整正文区域最大宽度（600px - 1800px）',
            'settings.font_system': '系统默认',
            'settings.font_sans': '无衬线',
            'settings.font_msyh': '微软雅黑',
            'settings.font_pingfang': '苹方',
            'settings.font_noto_sans': '思源黑体',
            'settings.font_serif': '衬线',
            'settings.font_serif_generic': '衬线体（通用）',
            'settings.font_simsun': '宋体',
            'settings.font_noto_serif': '思源宋体',
            'settings.font_other': '其他',
            'settings.font_custom': '自定义...',
            'settings.font_custom_placeholder': "输入字体名称，如 'LXGW WenKai'",
            'settings.code_font_default': '默认等宽',
            'settings.code_font_mono': '等宽字体',
            'settings.code_font_custom_placeholder': "输入字体名称，如 'Hack'",
            'settings.slider_compact': '紧凑',
            'settings.slider_loose': '宽松',
            'settings.slider_narrow': '窄',
            'settings.slider_wide': '宽',
            'settings.preview_label': '👁 排版预览',
            'settings.preview_desc': '实时预览排版效果',
            'settings.preview_text': '这是一段预览文本，用于展示当前排版设置的效果。The quick brown fox jumps over the lazy dog.',
            'settings.preview_text2': '支持渲染 <code>Mermaid</code> 图表和代码高亮，让 Markdown 阅读体验更加出色。',
            'settings.code_theme_title': '代码高亮主题',
            'settings.code_theme_desc': '选择代码块的高亮配色方案',
            'settings.code_theme_label': '代码高亮主题',
            'settings.code_theme_label_desc': '选择代码块的高亮配色方案',
            'settings.code_theme_light': '🔆 亮色主题',
            'settings.code_theme_dark': '🌙 暗色主题',
            'settings.function_title': '功能设置',
            'settings.function_desc': '开启或关闭工具功能',
            'settings.show_toc': '显示目录导航',
            'settings.show_toc_desc': '默认展开目录面板',
            'settings.show_annotations': '显示批注列表',
            'settings.show_annotations_desc': '默认展开批注面板',
            'settings.sidebar_label': '侧边栏位置',
            'settings.sidebar_desc': '调整目录和批注面板的左右布局',
            'settings.sidebar_toc_left': '目录左 批注右',
            'settings.sidebar_toc_right': '批注左 目录右',
            'settings.panel_mode_label': '面板模式',
            'settings.panel_mode_desc': '选择侧边面板的显示模式',
            'settings.panel_floating': '悬浮',
            'settings.panel_embedded': '嵌入',
            'settings.doc_align_label': '文档对齐',
            'settings.doc_align_desc': '设置主文档的对齐方式',
            'settings.doc_align_left': '靠左',
            'settings.doc_align_center': '居中',
            'settings.doc_align_right': '靠右',
            'settings.math_label': '数学公式渲染',
            'settings.math_desc': '启用 LaTeX 数学公式渲染',
            'settings.mermaid_label': 'Mermaid 图表渲染',
            'settings.mermaid_desc': '启用 Mermaid 图表语法渲染',
            'settings.plantuml_label': 'PlantUML 图表渲染',
            'settings.plantuml_desc': '启用 PlantUML 图表渲染（需要网络连接）',
            'settings.graphviz_label': 'Graphviz 图表渲染',
            'settings.graphviz_desc': '启用 Graphviz DOT 图表渲染',
            'settings.line_numbers_label': '显示代码行号',
            'settings.line_numbers_desc': '在代码块中显示行号',
            'settings.auto_save_label': '自动保存批注',
            'settings.auto_save_desc': '批注变更后自动保存到文件',
            'settings.auto_save_delay_label': '自动保存延迟',
            'settings.auto_save_delay_desc': '修改后延迟多久自动保存',
            'settings.footer_hint': '💡 设置修改后自动保存',
            'settings.reset': '恢复默认',
            'settings.saved_toast': '✅ 设置已自动保存',

            // ===== 通知消息 =====
            'notification.load_error': '❌ 加载文件失败: {error}',
            'notification.unsaved': '● 未保存',
            'notification.restored': '📂 已从 .review 恢复 {count} 条批注',
            'notification.load_failed': '加载文件失败',
            'notification.file_updated_new_version': '文件已更新，已创建新的批阅版本',
            'notification.file_reloaded': '文件已重新加载',
            'notification.refresh_failed': '刷新失败: {error}',
            'notification.copied': '✅ 已复制',
            'notification.copy': '📋 复制',
            'notification.click_to_enlarge': '点击查看大图',
            'notification.no_annotations': '暂无批注',
            'notification.updating': '更新中...',
            'notification.update_failed': '❌ 更新失败: {error}',
            'notification.request_failed': '❌ 请求失败: {error}',
            'notification.no_file': '请先打开一个 MD 文件',
            'notification.no_open_file': '没有打开的文件',
            'notification.edit_mode': '编辑模式',
            'notification.saved': '✓ 已保存',
            'notification.saving': '⏳ 保存中...',
            'notification.save_failed': '保存失败',
            'notification.export_empty': '暂无批注可导出',
            'notification.export_saved': '已保存到 .review 目录：{name}',
            'notification.export_failed': '导出失败，请检查工作区设置',
            'notification.auto_saved': '✓ 已自动保存',
            'notification.auto_save_failed': '✗ 保存失败',
            'notification.request_timeout': '请求超时: {type}',

            // ===== 浮层按钮 =====
            'float.comment': '💬 评论',
            'float.delete': '🗑️ 删除',
            'float.insert_after': '➕ 后插',
            'float.insert_before': '⬆️ 前插',

            // ===== 批注卡片 =====
            'annotation.type_comment': '评论',
            'annotation.type_delete': '删除',
            'annotation.type_insert_before': '前插',
            'annotation.type_insert_after': '后插',
            'annotation.insert_before_label': '📍 在此之前插入：',
            'annotation.insert_after_label': '📍 在此之后插入：',
            'annotation.edit': '编辑',
            'annotation.preview_alt': '预览{index}',

            // ===== AI 修复 =====
            'ai.summary_total': '📝 共 <span class="stat-count">{count}</span> 条批注',
            'ai.summary_delete': '🗑️ 删除操作：<span class="stat-count">{count}</span> 条',
            'ai.summary_insert': '➕ 插入操作：<span class="stat-count">{count}</span> 条',
            'ai.summary_comment': '💬 评论操作：<span class="stat-count">{count}</span> 条',
            'ai.result_success': '✅ AI 指令已生成',
            'ai.result_count': '共 {count} 条指令已生成',
            'ai.result_source': '📄 源文件：',
            'ai.result_instruction': '📝 指令文件：',
            'ai.result_empty': '⚠️ 无有效指令',
            'ai.copy_instruction': '请根据评审指令文件修改源文件。\n\n源文件路径：{source}\n评审指令文件：{instruction}\n\n请先读取评审指令文件了解需要修改的内容，然后按指令逐条修改源文件。',
            'ai.btn_copied': '✅ 已复制',
            'ai.btn_copy': '📋 一键复制指令',
            'ai.chat_success_codebuddy': '✅ AI 新对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。',
            'ai.chat_success_vscode': '✅ AI 对话已打开，指令已复制到剪贴板，请按 Ctrl+V 粘贴后回车发送。',
            'ai.chat_fallback': '✅ 已复制 AI 指令到剪贴板，请手动打开AI对话窗口并粘贴执行。',
            'ai.chat_error': '❌ 操作失败: {error}',

            // ===== 灯箱 =====
            'lightbox.zoom_out': '缩小 (-)',
            'lightbox.zoom_in': '放大 (+)',
            'lightbox.zoom_fit': '适应窗口 (0)',
            'lightbox.zoom_reset': '重置 (R)',
            'lightbox.hint': '滚轮缩放 · 拖拽移动 · +/-/0 快捷键 · ESC 关闭',

            // ===== 渲染器 =====
            'renderer.copy_code': '📋 复制',
            'renderer.image_load_failed': '🖼️ 图片加载失败: {alt}',
            'renderer.image_loading': '🖼️ 图片加载中: {name}',
            'renderer.alert_note': '注意',
            'renderer.alert_tip': '提示',
            'renderer.alert_important': '重要',
            'renderer.alert_warning': '警告',
            'renderer.alert_caution': '注意',
            'renderer.insert_before_text': '前插内容',
            'renderer.insert_after_text': '插入内容',
            'renderer.mermaid_error': 'Mermaid 图表渲染失败',
            'renderer.math_error': '公式渲染失败: {error}',
            'renderer.plantuml_too_long': '图表源码过长（{length} 字符），无法在线渲染',
            'renderer.plantuml_error': 'PlantUML 图表渲染失败（请检查网络连接）',
            'renderer.graphviz_error': 'Graphviz 图表渲染失败: {error}',

            // ===== 导出 =====
            'export.title': '批阅记录',
            'export.source_file': '源文件',
            'export.source_path': '源文件路径',
            'export.source_version': '源文件版本',
            'export.review_time': '批阅时间',
            'export.review_version': '批阅版本',
            'export.annotation_count': '批注数量',
            'export.type_comment': '评论',
            'export.type_delete': '删除',
            'export.type_insert_after': '后插',
            'export.type_insert_before': '前插',
            'export.section_instructions': '操作指令',
            'export.instruction_order_hint': '指令已按**从后往前**排列（倒序），请严格按照顺序从上到下逐条执行。',
            'export.instruction_anchor_hint': '每条指令提供了「文本锚点」用于精确定位，请优先通过锚点文本匹配来确认目标位置，blockIndex 仅作辅助参考。',
            'export.instruction_num': '指令 {num}',
            'export.label_modify': '（修改）',
            'export.label_delete': '（删除）',
            'export.label_insert_before': '（前插）',
            'export.label_insert_after': '（后插）',
            'export.op_modify': '根据评论修改内容',
            'export.op_delete': '删除以下文本',
            'export.op_insert_before': '在指定位置前插入新内容',
            'export.op_insert_after': '在指定位置后插入新内容',
            'export.field_operation': '操作',
            'export.field_block': '定位块',
            'export.field_block_value': '第 {n} 块',
            'export.field_anchor': '文本锚点',
            'export.field_offset': '块内偏移',
            'export.field_offset_value': '第 {n} 个字符处（startOffset={n}）',
            'export.field_target_text': '目标文本',
            'export.field_comment': '评论内容',
            'export.field_images': '附图',
            'export.field_images_count': '共 {count} 张',
            'export.field_image_n': '图片{n}：',
            'export.field_delete_text': '要删除的文本',
            'export.field_insert_position_before': '插入位置（在此文本之前）',
            'export.field_insert_position_after': '插入位置（在此文本之后）',
            'export.field_insert_content': '要插入的内容',
            'export.field_insert_reason': '插入说明',
            'export.section_json': '原始数据（JSON）',
            'export.json_hint': '如需精确操作，可使用以下 JSON 数据。其中 `blockIndex` 是基于空行分割的块索引（从0开始），`startOffset` 是目标文本在块内的字符偏移量（从0开始），可用于区分同一块内的重复文本。',
            'export.unknown': '未知',
            'export.unit_count': '{n} 条',
            'export.image_note': '**注意**：批注中包含图片附件，图片文件存储在 .review 目录的 images 子目录中。',
            'export.base64_note': '**注意**：部分批注包含 Base64 图片数据，完整图片数据已同时导出为 JSON 文件，请一并发送给 AI。',
            'export.ai_generated': '共 {count} 条指令已生成 AI 修改文件',
            'export.no_valid': '无有效指令',

            // ===== CSS =====
            'css.placeholder_edit': '点击此处输入内容...',

            // ===== Extension Host =====
            'ext.file_not_found': '文件不存在: {path}',
            'ext.invalid_image': '无效的图片数据格式',

            // ===== 主题按钮 =====
            'theme.light': '亮色',
            'theme.dark': '暗色',
        },
        'en': {
            // ===== Toolbar =====
            'toolbar.help_title': 'Help',
            'toolbar.file_select_title': 'Select MD file',
            'toolbar.file_select_default': '-- Select file --',
            'toolbar.no_file': 'No file open',
            'toolbar.file_changed': 'File updated',
            'toolbar.save_title': 'Save changes to source file (Ctrl+S)',
            'toolbar.save': 'Save',
            'toolbar.toc_title': 'Toggle table of contents',
            'toolbar.toc': 'TOC',
            'toolbar.zen_title': 'Zen mode: hide sidebars, focus on reading (Alt+Z)',
            'toolbar.zen': 'Zen',
            'toolbar.exit_zen': 'Exit Zen',
            'toolbar.theme_title': 'Toggle light/dark theme',
            'toolbar.theme': 'Theme',
            'toolbar.mode_title': 'Toggle preview/edit mode',
            'toolbar.mode_preview': 'Preview',
            'toolbar.mode_edit': 'Edit',
            'toolbar.annotations_title': 'Toggle annotations panel',
            'toolbar.annotations_count': '{count} annotations',
            'toolbar.annotations_zero': '0 annotations',
            'toolbar.ai_fix_title': 'Generate AI fix instructions from review annotations',
            'toolbar.ai_fix': 'AI Fix',
            'toolbar.settings_title': 'Settings',
            'toolbar.refresh_title': 'Refresh current file',
            'toolbar.scroll_top_title': 'Back to top',

            // ===== Welcome =====
            'welcome.title': 'Welcome to MD Human Review',
            'welcome.subtitle': 'Open a Markdown file to start reviewing like a mentor grading a paper',
            'welcome.feature_comment': 'Select text to add comments',
            'welcome.feature_delete': 'Mark content for deletion',
            'welcome.feature_image': 'Insert images in comments',
            'welcome.feature_ai': 'One-click AI fix',
            'welcome.hint_open': '💡 After opening a <code>.md</code> file, use the command palette or context menu to <code>open the review panel</code>',
            'welcome.hint_save': 'Review records are automatically saved to the workspace <code>.review/</code> directory',

            // ===== TOC Panel =====
            'toc.title': 'Contents',
            'toc.hide_title': 'Hide TOC panel',
            'toc.menu_title': 'More actions',
            'toc.collapse_all': 'Collapse all',
            'toc.expand_all': 'Expand all',
            'toc.empty': 'TOC will be generated after opening a document',

            // ===== Editor Toolbar =====
            'editor.bold_title': 'Bold (Ctrl+B)',
            'editor.italic_title': 'Italic (Ctrl+I)',
            'editor.strikethrough_title': 'Strikethrough',
            'editor.h1_title': 'Heading 1',
            'editor.h2_title': 'Heading 2',
            'editor.h3_title': 'Heading 3',
            'editor.ul_title': 'Unordered list',
            'editor.ol_title': 'Ordered list',
            'editor.quote_title': 'Block quote',
            'editor.hr_title': 'Horizontal rule',
            'editor.undo_title': 'Undo (Ctrl+Z)',
            'editor.redo_title': 'Redo (Ctrl+Y)',
            'editor.tips_title': 'Edit Mode Warning',
            'editor.tips_close': 'Close',
            'editor.tips_warning1': 'After editing, some Markdown extended syntax may be lost (e.g., math formulas, Mermaid diagrams, GitHub alert blocks, etc.)',
            'editor.tips_warning2': 'Recommended for <b>lightweight text edits</b> only (e.g., fixing typos, checking task lists, etc.)',

            // ===== Annotations Panel =====
            'annotations.title': 'Annotations',
            'annotations.save_title': 'Save review record',
            'annotations.save': 'Save',
            'annotations.clear_title': 'Clear all annotations',
            'annotations.clear': 'Clear',
            'annotations.sort_title': 'Sort by',
            'annotations.sort_time': 'By review time ↓',
            'annotations.sort_position': 'By text position',
            'annotations.hide_title': 'Hide annotations panel',
            'annotations.empty': 'No annotations yet',
            'annotations.empty_hint': 'Select text and right-click or use the toolbar to add annotations',

            // ===== Context Menu =====
            'context_menu.add_comment': 'Add Comment',
            'context_menu.mark_delete': 'Mark Delete',
            'context_menu.insert_after': 'Insert Content (After)',
            'context_menu.insert_before': 'Insert Content (Before)',
            'context_menu.table_ops': '📊 Table Operations',
            'context_menu.insert_row_above': 'Insert row above',
            'context_menu.insert_row_below': 'Insert row below',
            'context_menu.insert_col_left': 'Insert column left',
            'context_menu.insert_col_right': 'Insert column right',
            'context_menu.delete_row': 'Delete current row',
            'context_menu.delete_col': 'Delete current column',

            // ===== Comment Modal =====
            'modal.comment.title': 'Add Comment',
            'modal.comment.edit_title': 'Edit Comment',
            'modal.comment.selected_text': 'Selected text:',
            'modal.comment.content': 'Comment:',
            'modal.comment.placeholder': 'Enter your comment...',
            'modal.comment.image_label': 'Insert image (optional):',
            'modal.comment.image_hint': 'Click, drag, or Ctrl+V to paste image',
            'modal.comment.cancel': 'Cancel',
            'modal.comment.submit': 'Submit Comment',

            // ===== Insert Modal =====
            'modal.insert.title_after': 'Insert Content',
            'modal.insert.title_before': 'Insert Content (Before)',
            'modal.insert.position_after': 'Insert position (after this content):',
            'modal.insert.position_before': 'Insert position (before this content):',
            'modal.insert.content': 'Content to insert:',
            'modal.insert.content_placeholder': 'Enter content to insert (Markdown supported)...',
            'modal.insert.reason': 'Reason (optional):',
            'modal.insert.reason_placeholder': 'Explain the reason for insertion...',
            'modal.insert.cancel': 'Cancel',
            'modal.insert.submit': 'Confirm Insert',

            // ===== Clear Modal =====
            'modal.clear.title': '⚠️ Clear All Annotations',
            'modal.clear.message': 'Are you sure you want to clear all annotations?',
            'modal.clear.warning': 'This action cannot be undone!',
            'modal.clear.cancel': 'Cancel',
            'modal.clear.confirm': 'Confirm Clear',

            // ===== AI Modal =====
            'modal.ai.title': '🤖 AI Fix Confirmation',
            'modal.ai.warning': 'This will generate AI instruction files and save them to the workspace <code>.review/</code> directory.',
            'modal.ai.cancel': 'Cancel',
            'modal.ai.confirm': 'Generate AI Instructions',

            // ===== AI Result Modal =====
            'modal.ai_result.title': '📋 AI Instructions Generated',
            'modal.ai_result.close': 'Close',
            'modal.ai_result.vscode_hint': '⚠️ Instructions copied to clipboard. Paste with Ctrl+V into CodeBuddy chat.',
            'modal.ai_result.execute': '🚀 Execute',

            // ===== Help Modal =====
            'help.title': '📖 User Guide',
            'help.ok': 'Got it',
            'help.quick_start_title': '🚀 Quick Start',
            'help.quick_start_intro': 'Open a <code>.md</code> or <code>.mdc</code> file in VSCode, then open the review panel via:',
            'help.quick_start_command': '<strong>Command Palette</strong>: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> → Search "MD Human Review: Open Review Panel"',
            'help.quick_start_context': '<strong>Context Menu</strong>: Right-click in the editor or file explorer',
            'help.quick_start_titlebar': '<strong>Editor Title Bar</strong>: Click the icon button in the title bar',
            'help.comment_title': '💬 Add Comments',
            'help.comment_1': '<strong>Select text</strong> in the document',
            'help.comment_2': 'After releasing the mouse, a floating toolbar appears. Click <strong>"💬 Comment"</strong> (or right-click)',
            'help.comment_3': 'Enter your comment in the popup. Optionally upload images (click, drag, or <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste)',
            'help.comment_4': 'Click <strong>"Submit Comment"</strong>',
            'help.comment_hint': 'Selected text will be highlighted in <span style="color:var(--primary);font-weight:600;">purple</span>, with a comment card displayed in the sidebar.',
            'help.delete_title': '🗑️ Mark Delete',
            'help.delete_1': '<strong>Select</strong> the text to delete',
            'help.delete_2': 'Click <strong>"🗑️ Delete"</strong> in the floating toolbar (or right-click)',
            'help.delete_hint': 'Marked text will display with a <span style="text-decoration:line-through;color:var(--danger);">strikethrough</span> style.',
            'help.insert_title': '➕ Insert Content',
            'help.insert_1': '<strong>Select</strong> text as an anchor point for insertion',
            'help.insert_2': 'Right-click and choose <strong>"➕ Insert Content (After)"</strong> or <strong>"⬆️ Insert Content (Before)"</strong>',
            'help.insert_3': 'Enter content to insert (Markdown supported), optionally add a reason',
            'help.edit_title': '✏️ WYSIWYG Editing',
            'help.edit_1': 'Click the <strong>"Preview/Edit"</strong> toggle button in the toolbar (or press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>)',
            'help.edit_2': 'Edit directly on the rendered document with WYSIWYG toolbar (bold, italic, strikethrough, headings, lists, quotes, horizontal rule, undo/redo)',
            'help.edit_3': 'Right-click tables in edit mode to <strong>insert/delete rows and columns</strong>',
            'help.edit_4': 'Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save manually, or wait for auto-save',
            'help.ai_title': '🤖 One-Click AI Fix',
            'help.ai_1': 'After reviewing, click the <strong>"AI Fix"</strong> button in the toolbar',
            'help.ai_2': 'Confirm to generate structured AI instruction file, saved to <code>.review/</code> directory',
            'help.ai_3': 'Click <strong>"🚀 Execute"</strong> to auto-send instructions to CodeBuddy / Copilot chat',
            'help.ai_4': 'Or click <strong>"📋 Copy Instructions"</strong> to paste into any AI tool manually',
            'help.export_title': '📤 Export & Storage',
            'help.export_1': 'Press <kbd>Ctrl</kbd>+<kbd>E</kbd> to export review records as AI-readable structured Markdown instruction files',
            'help.export_2': 'Annotation records are <strong>auto-saved</strong> to the workspace <code>.review/</code> directory; deleted when annotations are cleared',
            'help.export_3': 'Old versions are auto-archived when source file content changes, creating a new review version',
            'help.ui_title': '🖥️ Interface Features',
            'help.ui_toc': '<strong>Table of Contents</strong> — Auto-generated document TOC with collapse/expand, quick navigation, and scroll-tracking',
            'help.ui_annotations': '<strong>Annotations Panel</strong> — Sidebar annotation list with sorting by time or position, navigation, editing, and deletion',
            'help.ui_lightbox': '<strong>Image Lightbox</strong> — Click images to enlarge, with scroll zoom, drag pan, double-click reset (<kbd>+</kbd>/<kbd>-</kbd> zoom, <kbd>0</kbd> fit, <kbd>R</kbd> reset)',
            'help.ui_mermaid': '<strong>Mermaid Charts</strong> — Click Mermaid diagrams to enlarge with zoom controls',
            'help.ui_zen': '<strong>Zen Mode</strong> — Press <kbd>Alt</kbd>+<kbd>Z</kbd> to hide sidebars for focused reading',
            'help.ui_theme': '<strong>Light/Dark Theme</strong> — One-click toggle or follow system',
            'help.ui_file_select': '<strong>File Selector</strong> — Dropdown to quickly switch between workspace Markdown files',
            'help.ui_file_change': '<strong>File Change Detection</strong> — Shows "File updated" badge when source file is modified; click refresh to reload',
            'help.ui_resize': '<strong>Panel Resize</strong> — Drag to adjust TOC and annotation panel widths',
            'help.shortcut_title': '⌨️ Keyboard Shortcuts',
            'help.shortcut_zen': 'Toggle Zen mode',
            'help.shortcut_export': 'Export review record',
            'help.shortcut_save': 'Save edits to source file',
            'help.shortcut_mode': 'Toggle preview/edit mode',
            'help.shortcut_esc': 'Close popup / Exit Zen mode',
            'help.feedback': 'Bug Reports & Suggestions',

            // ===== Settings Panel =====
            'settings.title': 'Settings',
            'settings.subtitle': 'Customize the appearance and behavior of MD Human Review',
            'settings.appearance_title': 'Appearance',
            'settings.appearance_desc': 'Choose the overall visual style',
            'settings.theme_label': 'Theme Mode',
            'settings.theme_desc': 'Switch between light and dark styles',
            'settings.theme_light': '☀️ Light',
            'settings.theme_dark': '🌙 Dark',
            'settings.theme_auto': '🖥️ Auto',
            'settings.language_title': '🌐 Language',
            'settings.language_desc': 'Choose display language',
            'settings.language_label': 'Language',
            'settings.language_desc2': 'Switch interface language',
            'settings.lang_zh': '🇨🇳 中文',
            'settings.lang_en': '🇺🇸 English',
            'settings.typography_title': 'Typography',
            'settings.typography_desc': 'Adjust document reading experience',
            'settings.font_label': '🔤 Body Font',
            'settings.font_desc': 'Select or enter the display font for Markdown body text',
            'settings.code_font_label': '💻 Code Font',
            'settings.code_font_desc': 'Select or enter the display font for code blocks',
            'settings.font_size_label': '🔠 Font Size',
            'settings.font_size_desc': 'Adjust body font size (12px - 24px)',
            'settings.line_height_label': '↕️ Line Height',
            'settings.line_height_desc': 'Adjust paragraph line height (1.2 - 2.4)',
            'settings.max_width_label': '↔️ Max Content Width',
            'settings.max_width_desc': 'Adjust maximum content area width (600px - 1800px)',
            'settings.font_system': 'System Default',
            'settings.font_sans': 'Sans-serif',
            'settings.font_msyh': 'Microsoft YaHei',
            'settings.font_pingfang': 'PingFang SC',
            'settings.font_noto_sans': 'Noto Sans SC',
            'settings.font_serif': 'Serif',
            'settings.font_serif_generic': 'Serif (Generic)',
            'settings.font_simsun': 'SimSun',
            'settings.font_noto_serif': 'Noto Serif SC',
            'settings.font_other': 'Other',
            'settings.font_custom': 'Custom...',
            'settings.font_custom_placeholder': "Enter font name, e.g. 'LXGW WenKai'",
            'settings.code_font_default': 'Default Monospace',
            'settings.code_font_mono': 'Monospace Fonts',
            'settings.code_font_custom_placeholder': "Enter font name, e.g. 'Hack'",
            'settings.slider_compact': 'Compact',
            'settings.slider_loose': 'Loose',
            'settings.slider_narrow': 'Narrow',
            'settings.slider_wide': 'Wide',
            'settings.preview_label': '👁 Typography Preview',
            'settings.preview_desc': 'Live preview of typography settings',
            'settings.preview_text': 'This is preview text to demonstrate the current typography settings. The quick brown fox jumps over the lazy dog.',
            'settings.preview_text2': 'Supports rendering <code>Mermaid</code> charts and code highlighting for an enhanced Markdown reading experience.',
            'settings.code_theme_title': 'Code Highlight Theme',
            'settings.code_theme_desc': 'Choose the color scheme for code blocks',
            'settings.code_theme_label': 'Code Highlight Theme',
            'settings.code_theme_label_desc': 'Choose the color scheme for code blocks',
            'settings.code_theme_light': '🔆 Light Themes',
            'settings.code_theme_dark': '🌙 Dark Themes',
            'settings.function_title': 'Features',
            'settings.function_desc': 'Enable or disable tool features',
            'settings.show_toc': 'Show Table of Contents',
            'settings.show_toc_desc': 'Show TOC panel by default',
            'settings.show_annotations': 'Show Annotations',
            'settings.show_annotations_desc': 'Show annotations panel by default',
            'settings.sidebar_label': 'Sidebar Position',
            'settings.sidebar_desc': 'Adjust the layout of TOC and annotation panels',
            'settings.sidebar_toc_left': 'TOC Left, Annotations Right',
            'settings.sidebar_toc_right': 'Annotations Left, TOC Right',
            'settings.panel_mode_label': 'Panel Mode',
            'settings.panel_mode_desc': 'Choose the sidebar panel display mode',
            'settings.panel_floating': 'Floating',
            'settings.panel_embedded': 'Embedded',
            'settings.doc_align_label': 'Document Alignment',
            'settings.doc_align_desc': 'Set the alignment of the main document',
            'settings.doc_align_left': 'Left',
            'settings.doc_align_center': 'Center',
            'settings.doc_align_right': 'Right',
            'settings.math_label': 'Math Rendering',
            'settings.math_desc': 'Enable LaTeX math formula rendering',
            'settings.mermaid_label': 'Mermaid Charts',
            'settings.mermaid_desc': 'Enable Mermaid diagram rendering',
            'settings.plantuml_label': 'PlantUML Charts',
            'settings.plantuml_desc': 'Enable PlantUML rendering (requires network)',
            'settings.graphviz_label': 'Graphviz Charts',
            'settings.graphviz_desc': 'Enable Graphviz DOT diagram rendering',
            'settings.line_numbers_label': 'Show Line Numbers',
            'settings.line_numbers_desc': 'Display line numbers in code blocks',
            'settings.auto_save_label': 'Auto-save Annotations',
            'settings.auto_save_desc': 'Automatically save annotations after changes',
            'settings.auto_save_delay_label': 'Auto-save Delay',
            'settings.auto_save_delay_desc': 'Delay before auto-saving after changes',
            'settings.footer_hint': '💡 Settings are saved automatically',
            'settings.reset': 'Reset Defaults',
            'settings.saved_toast': '✅ Settings saved',

            // ===== Notifications =====
            'notification.load_error': '❌ Failed to load file: {error}',
            'notification.unsaved': '● Unsaved',
            'notification.restored': '📂 Restored {count} annotations from .review',
            'notification.load_failed': 'Failed to load file',
            'notification.file_updated_new_version': 'File updated, new review version created',
            'notification.file_reloaded': 'File reloaded',
            'notification.refresh_failed': 'Refresh failed: {error}',
            'notification.copied': '✅ Copied',
            'notification.copy': '📋 Copy',
            'notification.click_to_enlarge': 'Click to enlarge',
            'notification.no_annotations': 'No annotations',
            'notification.updating': 'Updating...',
            'notification.update_failed': '❌ Update failed: {error}',
            'notification.request_failed': '❌ Request failed: {error}',
            'notification.no_file': 'Please open a MD file first',
            'notification.no_open_file': 'No file is open',
            'notification.edit_mode': 'Edit mode',
            'notification.saved': '✓ Saved',
            'notification.saving': '⏳ Saving...',
            'notification.save_failed': 'Save failed',
            'notification.export_empty': 'No annotations to export',
            'notification.export_saved': 'Saved to .review directory: {name}',
            'notification.export_failed': 'Export failed, please check workspace settings',
            'notification.auto_saved': '✓ Auto-saved',
            'notification.auto_save_failed': '✗ Save failed',
            'notification.request_timeout': 'Request timeout: {type}',

            // ===== Float Buttons =====
            'float.comment': '💬 Comment',
            'float.delete': '🗑️ Delete',
            'float.insert_after': '➕ After',
            'float.insert_before': '⬆️ Before',

            // ===== Annotation Cards =====
            'annotation.type_comment': 'Comment',
            'annotation.type_delete': 'Delete',
            'annotation.type_insert_before': 'Before',
            'annotation.type_insert_after': 'After',
            'annotation.insert_before_label': '📍 Insert before:',
            'annotation.insert_after_label': '📍 Insert after:',
            'annotation.edit': 'Edit',
            'annotation.preview_alt': 'Preview {index}',

            // ===== AI Fix =====
            'ai.summary_total': '📝 Total <span class="stat-count">{count}</span> annotations',
            'ai.summary_delete': '🗑️ Delete operations: <span class="stat-count">{count}</span>',
            'ai.summary_insert': '➕ Insert operations: <span class="stat-count">{count}</span>',
            'ai.summary_comment': '💬 Comment operations: <span class="stat-count">{count}</span>',
            'ai.result_success': '✅ AI instructions generated',
            'ai.result_count': '{count} instructions generated',
            'ai.result_source': '📄 Source file:',
            'ai.result_instruction': '📝 Instruction file:',
            'ai.result_empty': '⚠️ No valid instructions',
            'ai.copy_instruction': 'Please modify the source file according to the review instruction file.\n\nSource file path: {source}\nReview instruction file: {instruction}\n\nPlease read the review instruction file first to understand the required changes, then apply each instruction sequentially.',
            'ai.btn_copied': '✅ Copied',
            'ai.btn_copy': '📋 Copy Instructions',
            'ai.chat_success_codebuddy': '✅ New AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.',
            'ai.chat_success_vscode': '✅ AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.',
            'ai.chat_fallback': '✅ AI instructions copied to clipboard. Please open AI chat manually and paste.',
            'ai.chat_error': '❌ Operation failed: {error}',

            // ===== Lightbox =====
            'lightbox.zoom_out': 'Zoom out (-)',
            'lightbox.zoom_in': 'Zoom in (+)',
            'lightbox.zoom_fit': 'Fit window (0)',
            'lightbox.zoom_reset': 'Reset (R)',
            'lightbox.hint': 'Scroll to zoom · Drag to move · +/-/0 shortcuts · ESC to close',

            // ===== Renderer =====
            'renderer.copy_code': '📋 Copy',
            'renderer.image_load_failed': '🖼️ Image failed to load: {alt}',
            'renderer.image_loading': '🖼️ Loading image: {name}',
            'renderer.alert_note': 'Note',
            'renderer.alert_tip': 'Tip',
            'renderer.alert_important': 'Important',
            'renderer.alert_warning': 'Warning',
            'renderer.alert_caution': 'Caution',
            'renderer.insert_before_text': 'Insert before',
            'renderer.insert_after_text': 'Insert content',
            'renderer.mermaid_error': 'Mermaid chart rendering failed',
            'renderer.math_error': 'Formula rendering failed: {error}',
            'renderer.plantuml_too_long': 'Chart source code too long ({length} chars), cannot render online',
            'renderer.plantuml_error': 'PlantUML rendering failed (please check network connection)',
            'renderer.graphviz_error': 'Graphviz rendering failed: {error}',

            // ===== Export =====
            'export.title': 'Review Record',
            'export.source_file': 'Source File',
            'export.source_path': 'Source File Path',
            'export.source_version': 'Source File Version',
            'export.review_time': 'Review Time',
            'export.review_version': 'Review Version',
            'export.annotation_count': 'Annotation Count',
            'export.type_comment': 'Comments',
            'export.type_delete': 'Deletions',
            'export.type_insert_after': 'Insert After',
            'export.type_insert_before': 'Insert Before',
            'export.section_instructions': 'Instructions',
            'export.instruction_order_hint': 'Instructions are listed in **reverse order** (bottom-up). Please execute them strictly from top to bottom.',
            'export.instruction_anchor_hint': 'Each instruction provides a "Text Anchor" for precise positioning. Please match the anchor text first; blockIndex is for reference only.',
            'export.instruction_num': 'Instruction {num}',
            'export.label_modify': ' (Modify)',
            'export.label_delete': ' (Delete)',
            'export.label_insert_before': ' (Insert Before)',
            'export.label_insert_after': ' (Insert After)',
            'export.op_modify': 'Modify content according to comment',
            'export.op_delete': 'Delete the following text',
            'export.op_insert_before': 'Insert new content before the specified position',
            'export.op_insert_after': 'Insert new content after the specified position',
            'export.field_operation': 'Operation',
            'export.field_block': 'Block',
            'export.field_block_value': 'Block {n}',
            'export.field_anchor': 'Text Anchor',
            'export.field_offset': 'Block Offset',
            'export.field_offset_value': 'At character {n} (startOffset={n})',
            'export.field_target_text': 'Target Text',
            'export.field_comment': 'Comment',
            'export.field_images': 'Images',
            'export.field_images_count': '{count} image(s)',
            'export.field_image_n': 'Image {n}:',
            'export.field_delete_text': 'Text to Delete',
            'export.field_insert_position_before': 'Insert Position (before this text)',
            'export.field_insert_position_after': 'Insert Position (after this text)',
            'export.field_insert_content': 'Content to Insert',
            'export.field_insert_reason': 'Insert Reason',
            'export.section_json': 'Raw Data (JSON)',
            'export.json_hint': 'For precise operations, use the JSON data below. `blockIndex` is the blank-line-delimited block index (0-based), and `startOffset` is the character offset within the block (0-based), useful for distinguishing duplicate text in the same block.',
            'export.unknown': 'Unknown',
            'export.unit_count': '{n}',
            'export.image_note': '**Note**: Annotations contain image attachments. Image files are stored in the images subdirectory of the .review directory.',
            'export.base64_note': '**Note**: Some annotations contain Base64 image data. Complete image data has been exported as a JSON file as well.',
            'export.ai_generated': '{count} instructions generated for AI modification',
            'export.no_valid': 'No valid instructions',

            // ===== CSS =====
            'css.placeholder_edit': 'Click here to enter content...',

            // ===== Extension Host =====
            'ext.file_not_found': 'File not found: {path}',
            'ext.invalid_image': 'Invalid image data format',

            // ===== Theme Button =====
            'theme.light': 'Light',
            'theme.dark': 'Dark',
        }
    };

    /**
     * 获取翻译文本
     * @param {string} key - 翻译 key，如 'toolbar.save'
     * @param {Object} [params] - 参数替换，如 { count: 5 }
     * @returns {string} 翻译后的文本，找不到时返回 key 本身
     */
    function t(key, params) {
        const dict = _dict[_locale] || _dict['zh-CN'];
        let text = dict[key];
        if (text === undefined) {
            // fallback to zh-CN
            text = _dict['zh-CN'][key];
        }
        if (text === undefined) {
            return key;
        }
        if (params) {
            Object.keys(params).forEach(k => {
                text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
            });
        }
        return text;
    }

    /**
     * 设置当前语言
     * @param {string} locale - 'zh-CN' 或 'en'
     */
    function setLocale(locale) {
        if (_dict[locale]) {
            _locale = locale;
            applyToDOM();
        }
    }

    /**
     * 获取当前语言
     * @returns {string}
     */
    function getLocale() {
        return _locale;
    }

    /**
     * 扫描 DOM 中带有 data-i18n 属性的元素并填充翻译文本
     */
    function applyToDOM() {
        // data-i18n: textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) { el.textContent = t(key); }
        });
        // data-i18n-html: innerHTML
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) { el.innerHTML = t(key); }
        });
        // data-i18n-title: title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) { el.title = t(key); }
        });
        // data-i18n-placeholder: placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) { el.placeholder = t(key); }
        });
        // Inject CSS custom properties for i18n
        document.documentElement.style.setProperty('--i18n-placeholder-edit', JSON.stringify(t('css.placeholder_edit')));

        // Dynamic help content
        const helpEl = document.getElementById('helpContent');
        if (helpEl) {
            helpEl.innerHTML = _buildHelpHTML();
        }
    }

    function _buildHelpHTML() {
        const _t = t;
        return `
<section class="help-section">
    <h4>${_t('help.quick_start_title')}</h4>
    <p>${_t('help.quick_start_intro')}</p>
    <ul>
        <li>${_t('help.quick_start_command')}</li>
        <li>${_t('help.quick_start_context')}</li>
        <li>${_t('help.quick_start_titlebar')}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t('help.comment_title')}</h4>
    <ol>
        <li>${_t('help.comment_1')}</li>
        <li>${_t('help.comment_2')}</li>
        <li>${_t('help.comment_3')}</li>
        <li>${_t('help.comment_4')}</li>
    </ol>
    <p class="help-hint">${_t('help.comment_hint')}</p>
</section>
<section class="help-section">
    <h4>${_t('help.delete_title')}</h4>
    <ol>
        <li>${_t('help.delete_1')}</li>
        <li>${_t('help.delete_2')}</li>
    </ol>
    <p class="help-hint">${_t('help.delete_hint')}</p>
</section>
<section class="help-section">
    <h4>${_t('help.insert_title')}</h4>
    <ol>
        <li>${_t('help.insert_1')}</li>
        <li>${_t('help.insert_2')}</li>
        <li>${_t('help.insert_3')}</li>
    </ol>
</section>
<section class="help-section">
    <h4>${_t('help.edit_title')}</h4>
    <ol>
        <li>${_t('help.edit_1')}</li>
        <li>${_t('help.edit_2')}</li>
        <li>${_t('help.edit_3')}</li>
        <li>${_t('help.edit_4')}</li>
    </ol>
</section>
<section class="help-section">
    <h4>${_t('help.ai_title')}</h4>
    <ol>
        <li>${_t('help.ai_1')}</li>
        <li>${_t('help.ai_2')}</li>
        <li>${_t('help.ai_3')}</li>
        <li>${_t('help.ai_4')}</li>
    </ol>
</section>
<section class="help-section">
    <h4>${_t('help.export_title')}</h4>
    <ul>
        <li>${_t('help.export_1')}</li>
        <li>${_t('help.export_2')}</li>
        <li>${_t('help.export_3')}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t('help.ui_title')}</h4>
    <ul>
        <li>${_t('help.ui_toc')}</li>
        <li>${_t('help.ui_annotations')}</li>
        <li>${_t('help.ui_lightbox')}</li>
        <li>${_t('help.ui_mermaid')}</li>
        <li>${_t('help.ui_zen')}</li>
        <li>${_t('help.ui_theme')}</li>
        <li>${_t('help.ui_file_select')}</li>
        <li>${_t('help.ui_file_change')}</li>
        <li>${_t('help.ui_resize')}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t('help.shortcut_title')}</h4>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 8px;"><kbd>Alt</kbd>+<kbd>Z</kbd></td><td style="padding:4px 8px;">${_t('help.shortcut_zen')}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>E</kbd></td><td style="padding:4px 8px;">${_t('help.shortcut_export')}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td style="padding:4px 8px;">${_t('help.shortcut_save')}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd></td><td style="padding:4px 8px;">${_t('help.shortcut_mode')}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>ESC</kbd></td><td style="padding:4px 8px;">${_t('help.shortcut_esc')}</td></tr>
    </table>
</section>
<section class="help-section help-links">
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:4px 0;">
        <a href="https://github.com/LetitiaChan/md-review-tool" target="_blank" class="help-link-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 .5A7.5 7.5 0 0 0 5.63 15.13c.37.07.51-.16.51-.36v-1.24c-2.1.46-2.54-1.01-2.54-1.01a2 2 0 0 0-.84-1.1c-.69-.47.05-.46.05-.46a1.58 1.58 0 0 1 1.15.78 1.6 1.6 0 0 0 2.19.62 1.6 1.6 0 0 1 .48-1c-1.68-.19-3.44-.84-3.44-3.74a2.93 2.93 0 0 1 .78-2.03 2.72 2.72 0 0 1 .07-2s.64-.2 2.08.78a7.17 7.17 0 0 1 3.78 0c1.44-.99 2.08-.78 2.08-.78a2.72 2.72 0 0 1 .07 2 2.93 2.93 0 0 1 .78 2.03c0 2.91-1.77 3.55-3.45 3.74a1.8 1.8 0 0 1 .51 1.39v2.06c0 .2.14.44.52.36A7.5 7.5 0 0 0 8 .5z" fill="currentColor"/></svg>
            <span>GitHub</span>
        </a>
        <span style="color:var(--text-light);">·</span>
        <a href="https://github.com/LetitiaChan/md-review-tool/issues" target="_blank" class="help-link-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11" r="0.75" fill="currentColor"/></svg>
            <span>${_t('help.feedback')}</span>
        </a>
    </div>
</section>`;
    }

    return {
        t,
        setLocale,
        getLocale,
        applyToDOM,
        // expose for Extension Host i18n dict access
        getDict: (locale) => _dict[locale] || _dict['zh-CN']
    };
})();

// Global shortcut
const t = window.I18n.t;
