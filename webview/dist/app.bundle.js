"use strict";
(() => {
  // webview/js/i18n.js
  window.I18n = /* @__PURE__ */ (() => {
    let _locale = "zh-CN";
    const _dict = {
      "zh-CN": {
        // ===== 工具栏 =====
        "toolbar.help_title": "\u4F7F\u7528\u5E2E\u52A9",
        "toolbar.file_select_title": "\u9009\u62E9MD\u6587\u4EF6",
        "toolbar.file_select_default": "-- \u9009\u62E9\u6587\u4EF6 --",
        "toolbar.no_file": "\u672A\u6253\u5F00\u6587\u4EF6",
        "toolbar.file_changed": "\u6587\u4EF6\u5DF2\u66F4\u65B0",
        "toolbar.save_title": "\u4FDD\u5B58\u4FEE\u6539\u5230\u6E90\u6587\u4EF6 (Ctrl+S)",
        "toolbar.save": "\u4FDD\u5B58",
        "toolbar.toc_title": "\u5C55\u5F00/\u6536\u8D77\u76EE\u5F55\u5BFC\u822A",
        "toolbar.toc": "\u76EE\u5F55",
        "toolbar.zen_title": "\u7985\u6A21\u5F0F\uFF1A\u9690\u85CF\u4FA7\u680F\uFF0C\u4E13\u6CE8\u9605\u8BFB (Alt+Z)",
        "toolbar.zen": "\u7985\u6A21\u5F0F",
        "toolbar.exit_zen": "\u9000\u51FA\u7985\u6A21\u5F0F",
        "toolbar.theme_title": "\u5207\u6362\u4EAE\u8272/\u6697\u8272\u4E3B\u9898",
        "toolbar.theme": "\u4E3B\u9898",
        "toolbar.mode_title": "\u5207\u6362\u9884\u89C8/\u7F16\u8F91\u6A21\u5F0F",
        "toolbar.mode_preview": "\u9884\u89C8",
        "toolbar.mode_edit": "\u7F16\u8F91",
        "edit_mode.rich_toggle_tooltip": "\u7F16\u8F91\u6A21\u5F0F\uFF08\u7ED3\u6784\u5316\u7F16\u8F91\uFF0C\u652F\u6301\u56FE\u8868\u9884\u89C8\u548C\u6279\u6CE8\u88C5\u9970\uFF09",
        "edit_mode.rich": "\u5BCC\u6587\u672C",
        "edit_mode.rich_hint": "\u5DF2\u8FDB\u5165\u5BCC\u6587\u672C\u7F16\u8F91\u6A21\u5F0F",
        "toolbar.annotations_title": "\u5C55\u5F00/\u6536\u8D77\u6279\u6CE8\u5217\u8868",
        "toolbar.annotations_count": "{count}",
        "toolbar.annotations_zero": "",
        "toolbar.ai_fix_title": "\u6839\u636E\u6279\u9605\u8BB0\u5F55\u4E00\u952EAI\u4FEE\u590D\u6E90\u6587\u4EF6",
        "toolbar.ai_fix": "AI Fix",
        "toolbar.settings_title": "\u8BBE\u7F6E",
        "toolbar.refresh_title": "\u5237\u65B0\u5F53\u524D\u6587\u4EF6",
        "toolbar.scroll_top_title": "\u56DE\u5230\u9876\u90E8",
        // ===== 欢迎页 =====
        "welcome.title": "\u6B22\u8FCE\u4F7F\u7528 MD Human Review",
        "welcome.subtitle": "\u6253\u5F00\u4E00\u4E2A Markdown \u6587\u4EF6\uFF0C\u50CF\u5BFC\u5E08\u6279\u6539\u8BBA\u6587\u4E00\u6837\u8FDB\u884C\u6279\u9605",
        "welcome.feature_comment": "\u9009\u4E2D\u6587\u5B57\u6DFB\u52A0\u8BC4\u8BBA",
        "welcome.feature_delete": "\u6807\u8BB0\u5220\u9664\u5185\u5BB9",
        "welcome.feature_image": "\u8BC4\u8BBA\u4E2D\u63D2\u5165\u56FE\u7247",
        "welcome.feature_ai": "\u4E00\u952E AI \u4FEE\u590D",
        "welcome.hint_open": "\u{1F4A1} \u6253\u5F00 <code>.md</code> \u6587\u4EF6\u540E\uFF0C\u901A\u8FC7\u547D\u4EE4\u9762\u677F\u6216\u53F3\u952E\u83DC\u5355<code>\u6253\u5F00\u6279\u9605\u9762\u677F</code>",
        "welcome.hint_save": "\u6279\u9605\u8BB0\u5F55\u4F1A\u81EA\u52A8\u4FDD\u5B58\u5230\u5DE5\u4F5C\u533A <code>.review/</code> \u76EE\u5F55",
        // ===== 目录面板 =====
        "toc.title": "\u76EE\u5F55",
        "toc.hide_title": "\u9690\u85CF\u76EE\u5F55\u9762\u677F",
        "toc.menu_title": "\u66F4\u591A\u64CD\u4F5C",
        "toc.collapse_all": "\u6298\u53E0\u5168\u90E8",
        "toc.expand_all": "\u5C55\u5F00\u5168\u90E8",
        "toc.empty": "\u6253\u5F00\u6587\u6863\u540E\u81EA\u52A8\u751F\u6210\u76EE\u5F55",
        "toc.search_placeholder": "\u641C\u7D22\u76EE\u5F55...",
        "toc.search_clear": "\u6E05\u9664",
        "toc.no_results": "\u65E0\u5339\u914D\u7ED3\u679C",
        // ===== 正文搜索 =====
        "search.placeholder": "\u641C\u7D22...",
        "search.prev_title": "\u4E0A\u4E00\u4E2A (Shift+Enter)",
        "search.next_title": "\u4E0B\u4E00\u4E2A (Enter)",
        "search.close_title": "\u5173\u95ED (Esc)",
        // ===== 编辑器工具栏 =====
        "editor.bold_title": "\u52A0\u7C97 (Ctrl+B)",
        "editor.italic_title": "\u659C\u4F53 (Ctrl+I)",
        "editor.strikethrough_title": "\u5220\u9664\u7EBF",
        "editor.h1_title": "\u4E00\u7EA7\u6807\u9898",
        "editor.h2_title": "\u4E8C\u7EA7\u6807\u9898",
        "editor.h3_title": "\u4E09\u7EA7\u6807\u9898",
        "editor.ul_title": "\u65E0\u5E8F\u5217\u8868",
        "editor.ol_title": "\u6709\u5E8F\u5217\u8868",
        "editor.quote_title": "\u5F15\u7528\u5757",
        "editor.hr_title": "\u5206\u9694\u7EBF",
        "editor.undo_title": "\u64A4\u9500 (Ctrl+Z)",
        "editor.redo_title": "\u91CD\u505A (Ctrl+Y)",
        "editor.tips_title": "\u7F16\u8F91\u6A21\u5F0F\u98CE\u9669\u63D0\u793A",
        "editor.tips_close": "\u5173\u95ED",
        "editor.tips_warning1": "\u4FEE\u6539\u5185\u5BB9\u540E\uFF0C\u90E8\u5206 Markdown \u6269\u5C55\u8BED\u6CD5\u53EF\u80FD\u4E22\u5931\uFF08\u5982\u56FE\u8868\u3001GitHub \u544A\u8B66\u5757\u7B49\uFF09",
        "editor.tips_warning2": "\u4EC5\u5EFA\u8BAE\u7528\u4E8E<b>\u8F7B\u91CF\u6587\u672C\u4FEE\u6539</b>\uFF08\u5982\u4FEE\u6B63\u9519\u522B\u5B57\u3001\u52FE\u9009\u4EFB\u52A1\u5217\u8868\u7B49\uFF09",
        "editor.diagram_edit_hint": "\u7F16\u8F91\u56FE\u8868\u6E90\u7801",
        // ===== 批注面板 =====
        "annotations.title": "\u6279\u6CE8\u5217\u8868",
        "annotations.save_title": "\u4FDD\u5B58\u6279\u9605\u8BB0\u5F55",
        "annotations.save": "\u4FDD\u5B58",
        "annotations.clear_title": "\u6E05\u9664\u6240\u6709\u6279\u6CE8",
        "annotations.clear": "\u6E05\u9664",
        "annotations.sort_title": "\u6392\u5E8F\u65B9\u5F0F",
        "annotations.sort_time": "\u6309\u6279\u9605\u65F6\u95F4 \u2193",
        "annotations.sort_position": "\u6309\u6587\u672C\u4F4D\u7F6E",
        "annotations.hide_title": "\u9690\u85CF\u6279\u6CE8\u9762\u677F",
        "annotations.empty": "\u6682\u65E0\u6279\u6CE8",
        "annotations.empty_hint": "\u9009\u4E2D\u6587\u672C\u540E\u53F3\u952E\u6216\u70B9\u51FB\u5DE5\u5177\u680F\u6DFB\u52A0\u6279\u6CE8",
        "annotations.search_placeholder": "\u641C\u7D22\u6279\u6CE8...",
        "annotations.search_clear": "\u6E05\u9664",
        "annotations.no_results": "\u65E0\u5339\u914D\u6279\u6CE8",
        // ===== 右键菜单 =====
        "context_menu.add_comment": "\u6DFB\u52A0\u8BC4\u8BBA",
        "context_menu.mark_delete": "\u6807\u8BB0\u5220\u9664",
        "context_menu.insert_after": "\u63D2\u5165\u5185\u5BB9\uFF08\u5728\u6B64\u5904\u4E4B\u540E\uFF09",
        "context_menu.insert_before": "\u63D2\u5165\u5185\u5BB9\uFF08\u5728\u6B64\u5904\u4E4B\u524D\uFF09",
        "context_menu.table_ops": "\u{1F4CA} \u8868\u683C\u64CD\u4F5C",
        "context_menu.insert_row_above": "\u5728\u4E0A\u65B9\u63D2\u5165\u884C",
        "context_menu.insert_row_below": "\u5728\u4E0B\u65B9\u63D2\u5165\u884C",
        "context_menu.insert_col_left": "\u5728\u5DE6\u4FA7\u63D2\u5165\u5217",
        "context_menu.insert_col_right": "\u5728\u53F3\u4FA7\u63D2\u5165\u5217",
        "context_menu.delete_row": "\u5220\u9664\u5F53\u524D\u884C",
        "context_menu.delete_col": "\u5220\u9664\u5F53\u524D\u5217",
        // ===== 评论弹窗 =====
        "modal.comment.title": "\u6DFB\u52A0\u8BC4\u8BBA",
        "modal.comment.edit_title": "\u7F16\u8F91\u8BC4\u8BBA",
        "modal.comment.selected_text": "\u9009\u4E2D\u7684\u6587\u672C\uFF1A",
        "modal.comment.content": "\u8BC4\u8BBA\u5185\u5BB9\uFF1A",
        "modal.comment.placeholder": "\u8F93\u5165\u4F60\u7684\u8BC4\u8BBA...",
        "modal.comment.image_label": "\u63D2\u5165\u56FE\u7247\uFF08\u53EF\u9009\uFF09\uFF1A",
        "modal.comment.image_hint": "\u70B9\u51FB\u3001\u62D6\u62FD\u6216 Ctrl+V \u7C98\u8D34\u56FE\u7247",
        "modal.comment.cancel": "\u53D6\u6D88",
        "modal.comment.submit": "\u63D0\u4EA4\u8BC4\u8BBA",
        // ===== 插入弹窗 =====
        "modal.insert.title_after": "\u63D2\u5165\u5185\u5BB9",
        "modal.insert.title_before": "\u63D2\u5165\u5185\u5BB9\uFF08\u5728\u6B64\u5904\u4E4B\u524D\uFF09",
        "modal.insert.position_after": "\u63D2\u5165\u4F4D\u7F6E\uFF08\u5728\u6B64\u5185\u5BB9\u4E4B\u540E\uFF09\uFF1A",
        "modal.insert.position_before": "\u63D2\u5165\u4F4D\u7F6E\uFF08\u5728\u6B64\u5185\u5BB9\u4E4B\u524D\uFF09\uFF1A",
        "modal.insert.content": "\u8981\u63D2\u5165\u7684\u5185\u5BB9\uFF1A",
        "modal.insert.content_placeholder": "\u8F93\u5165\u8981\u63D2\u5165\u7684\u5185\u5BB9\uFF08\u652F\u6301Markdown\u683C\u5F0F\uFF09...",
        "modal.insert.reason": "\u63D2\u5165\u8BF4\u660E\uFF08\u53EF\u9009\uFF09\uFF1A",
        "modal.insert.reason_placeholder": "\u8BF4\u660E\u63D2\u5165\u539F\u56E0...",
        "modal.insert.cancel": "\u53D6\u6D88",
        "modal.insert.submit": "\u786E\u8BA4\u63D2\u5165",
        // ===== 清除弹窗 =====
        "modal.clear.title": "\u26A0\uFE0F \u6E05\u9664\u6240\u6709\u6279\u6CE8",
        "modal.clear.message": "\u786E\u5B9A\u8981\u6E05\u9664\u6240\u6709\u6279\u6CE8\u5417\uFF1F",
        "modal.clear.warning": "\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\uFF01",
        "modal.clear.cancel": "\u53D6\u6D88",
        "modal.clear.confirm": "\u786E\u8BA4\u6E05\u9664",
        // ===== AI修复弹窗 =====
        "modal.ai.title": "\u{1F916} \u4E00\u952EAI\u4FEE\u590D\u786E\u8BA4",
        "modal.ai.warning": "\u6B64\u64CD\u4F5C\u5C06\u751F\u6210 AI \u4FEE\u6539\u6307\u4EE4\u6587\u4EF6\uFF0C\u4FDD\u5B58\u5230\u5DE5\u4F5C\u533A <code>.review/</code> \u76EE\u5F55\u3002",
        "modal.ai.cancel": "\u53D6\u6D88",
        "modal.ai.confirm": "\u751F\u6210AI\u6307\u4EE4",
        "modal.ai.no_annotations": "\u6682\u65E0\u6279\u6CE8",
        "modal.ai.source_file": "\u{1F4C4} \u6E90\u6587\u4EF6\uFF1A",
        "modal.ai.total_annotations": "\u{1F4DD} \u5171 {count} \u6761\u6279\u6CE8",
        "modal.ai.delete_count": "\u{1F5D1}\uFE0F \u5220\u9664\u64CD\u4F5C\uFF1A{count} \u6761",
        "modal.ai.insert_count": "\u2795 \u63D2\u5165\u64CD\u4F5C\uFF1A{count} \u6761",
        "modal.ai.comment_count": "\u{1F4AC} \u8BC4\u8BBA\u64CD\u4F5C\uFF1A{count} \u6761",
        "modal.ai.summary_hint": "\u{1F4A1} \u6240\u6709\u6279\u6CE8\u5C06\u7EDF\u4E00\u751F\u6210 AI \u4FEE\u6539\u6307\u4EE4\u6587\u4EF6\uFF0C\u7531 AI \u6309\u6307\u4EE4\u9010\u6761\u6267\u884C\u4FEE\u6539\u3002",
        // ===== AI结果弹窗 =====
        "modal.ai_result.title": "\u{1F4CB} AI \u6307\u4EE4\u751F\u6210",
        "modal.ai_result.close": "\u5173\u95ED",
        "modal.ai_result.vscode_hint": "\u26A0\uFE0F \u6307\u4EE4\u5DF2\u5728\u526A\u8D34\u677F\uFF0C\u8BF7Ctrl+V\u7C98\u8D34\u5230AI\u5BF9\u8BDD\u53D1\u9001",
        "modal.ai_result.cursor_hint": "\u2728 \u5DF2\u5728 Cursor \u6253\u5F00 AI Chat \u5E76\u5C1D\u8BD5\u81EA\u52A8\u7C98\u8D34\uFF1B\u82E5\u672A\u81EA\u52A8\u5B8C\u6210\u8BF7\u6309 Ctrl+V \u540E\u56DE\u8F66",
        "modal.ai_result.windsurf_hint": "\u2728 \u5DF2\u5728 Windsurf \u6253\u5F00 Cascade \u5E76\u5C1D\u8BD5\u81EA\u52A8\u7C98\u8D34\uFF1B\u82E5\u672A\u81EA\u52A8\u5B8C\u6210\u8BF7\u6309 Ctrl+V \u540E\u56DE\u8F66",
        "modal.ai_result.execute": "\u{1F680} \u786E\u5B9A\u6267\u884C",
        "modal.ai_result.header_success": "\u2705 AI \u6307\u4EE4\u5DF2\u751F\u6210",
        "modal.ai_result.count": "\u5171 {count} \u6761\u6307\u4EE4\u5DF2\u751F\u6210",
        "modal.ai_result.hint_annotations": "\u{1F916} <strong>{count} \u6761\u6279\u6CE8</strong>\u5DF2\u751F\u6210 AI \u4FEE\u6539\u6307\u4EE4\u6587\u4EF6\u3002",
        "modal.ai_result.source_label": "\u{1F4C4} \u6E90\u6587\u4EF6\uFF1A",
        "modal.ai_result.instruction_label": "\u{1F4DD} \u6307\u4EE4\u6587\u4EF6\uFF1A",
        "modal.ai_result.copy_btn": "\u{1F4CB} \u4E00\u952E\u590D\u5236\u6307\u4EE4",
        "modal.ai_result.copied": "\u2705 \u5DF2\u590D\u5236",
        "modal.ai_result.header_empty": "\u26A0\uFE0F \u65E0\u6709\u6548\u6307\u4EE4",
        "modal.ai_result.copy_text": "\u8BF7\u6839\u636E\u8BC4\u5BA1\u6307\u4EE4\u6587\u4EF6\u4FEE\u6539\u6E90\u6587\u4EF6\u3002\n\n\u6E90\u6587\u4EF6\u8DEF\u5F84\uFF1A{source}\n\u8BC4\u5BA1\u6307\u4EE4\u6587\u4EF6\uFF1A{instruction}\n\n\u8BF7\u5148\u8BFB\u53D6\u8BC4\u5BA1\u6307\u4EE4\u6587\u4EF6\u4E86\u89E3\u9700\u8981\u4FEE\u6539\u7684\u5185\u5BB9\uFF0C\u7136\u540E\u6309\u6307\u4EE4\u9010\u6761\u4FEE\u6539\u6E90\u6587\u4EF6\u3002\n\n\u2705 \u5B8C\u6210\u6240\u6709\u4FEE\u6539\u540E\uFF0C\u8BF7\u63D0\u9192\u6211\u56DE\u5230 **MD Human Review** \u9762\u677F\u70B9\u51FB\u53F3\u4E0A\u89D2\u7684\u5237\u65B0\u6309\u94AE\uFF08\u{1F504}\uFF09\uFF0C\u4EE5\u52A0\u8F7D\u6700\u65B0\u5185\u5BB9\u5E76\u521B\u5EFA\u65B0\u7684\u6279\u9605\u7248\u672C\u3002",
        // ===== 帮助弹窗 =====
        "help.title": "\u{1F4D6} \u4F7F\u7528\u5E2E\u52A9",
        "help.ok": "\u77E5\u9053\u4E86",
        "help.quick_start_title": "\u{1F680} \u5FEB\u901F\u5F00\u59CB",
        "help.quick_start_intro": "\u6253\u5F00 <code>.md</code> \u6216 <code>.mdc</code> \u6587\u4EF6\uFF0C\u901A\u8FC7\u4EE5\u4E0B\u65B9\u5F0F\u6253\u5F00\u6279\u9605\u9762\u677F\uFF1A",
        "help.quick_start_command": "<strong>\u547D\u4EE4\u9762\u677F</strong>\uFF1A<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> \u2192 \u641C\u7D22\u300CMD Human Review: \u6253\u5F00\u6279\u9605\u9762\u677F\u300D",
        "help.quick_start_context": "<strong>\u53F3\u952E\u83DC\u5355</strong>\uFF1A\u5728\u7F16\u8F91\u5668\u6216\u8D44\u6E90\u7BA1\u7406\u5668\u4E2D\u53F3\u952E\u9009\u62E9",
        "help.quick_start_titlebar": "<strong>\u7F16\u8F91\u5668\u6807\u9898\u680F</strong>\uFF1A\u70B9\u51FB\u6807\u9898\u680F\u56FE\u6807\u6309\u94AE",
        "help.comment_title": "\u{1F4AC} \u6DFB\u52A0\u8BC4\u8BBA",
        "help.comment_1": "\u5728\u6587\u6863\u4E2D<strong>\u9009\u4E2D\u4E00\u6BB5\u6587\u5B57</strong>",
        "help.comment_2": "\u677E\u5F00\u9F20\u6807\u540E\u51FA\u73B0\u6D6E\u5C42\u5DE5\u5177\u6761\uFF0C\u70B9\u51FB <strong>\u300C\u{1F4AC} \u8BC4\u8BBA\u300D</strong>\uFF08\u4E5F\u53EF\u53F3\u952E\u9009\u62E9\uFF09",
        "help.comment_3": "\u5728\u5F39\u7A97\u4E2D\u8F93\u5165\u8BC4\u8BBA\u5185\u5BB9\uFF0C\u53EF\u9009\u4E0A\u4F20\u56FE\u7247\uFF08\u70B9\u51FB\u3001\u62D6\u62FD\u6216 <kbd>Ctrl</kbd>+<kbd>V</kbd> \u7C98\u8D34\uFF09",
        "help.comment_4": "\u70B9\u51FB <strong>\u300C\u63D0\u4EA4\u8BC4\u8BBA\u300D</strong>",
        "help.comment_hint": '\u9009\u4E2D\u7684\u6587\u5B57\u4F1A\u88AB\u6807\u8BB0\u4E3A <span style="color:var(--primary);font-weight:600;">\u7EFF\u8272\u9AD8\u4EAE</span>\uFF0C\u53F3\u4FA7\u6279\u6CE8\u680F\u540C\u6B65\u663E\u793A\u8BC4\u8BBA\u5361\u7247\u3002',
        "help.delete_title": "\u{1F5D1}\uFE0F \u6807\u8BB0\u5220\u9664",
        "help.delete_1": "<strong>\u9009\u4E2D</strong>\u9700\u8981\u5220\u9664\u7684\u6587\u5B57",
        "help.delete_2": "\u70B9\u51FB\u6D6E\u5C42\u4E2D\u7684 <strong>\u300C\u{1F5D1}\uFE0F \u5220\u9664\u300D</strong>\uFF08\u6216\u53F3\u952E\u9009\u62E9\uFF09",
        "help.delete_hint": '\u88AB\u6807\u8BB0\u7684\u6587\u5B57\u4F1A\u4EE5 <span style="text-decoration:line-through;color:var(--danger);">\u5220\u9664\u7EBF</span> \u6837\u5F0F\u5C55\u793A\u3002',
        "help.insert_title": "\u2795 \u63D2\u5165\u5185\u5BB9",
        "help.insert_1": "<strong>\u9009\u4E2D</strong>\u4E00\u6BB5\u6587\u5B57\u4F5C\u4E3A\u63D2\u5165\u4F4D\u7F6E\u7684\u951A\u70B9",
        "help.insert_2": "\u53F3\u952E\u9009\u62E9 <strong>\u300C\u2795 \u63D2\u5165\u5185\u5BB9\uFF08\u5728\u6B64\u5904\u4E4B\u540E\uFF09\u300D</strong> \u6216 <strong>\u300C\u2B06\uFE0F \u63D2\u5165\u5185\u5BB9\uFF08\u5728\u6B64\u5904\u4E4B\u524D\uFF09\u300D</strong>",
        "help.insert_3": "\u8F93\u5165\u8981\u63D2\u5165\u7684\u5185\u5BB9\uFF08\u652F\u6301 Markdown \u683C\u5F0F\uFF09\uFF0C\u53EF\u9009\u586B\u63D2\u5165\u8BF4\u660E",
        "help.edit_title": "\u270F\uFE0F \u76F4\u63A5\u7F16\u8F91\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF09",
        "help.edit_1": "\u70B9\u51FB\u5DE5\u5177\u680F\u7684 <strong>\u300C\u9884\u89C8/\u7F16\u8F91\u300D</strong> \u5207\u6362\u6309\u94AE\uFF08\u6216\u6309 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>\uFF09",
        "help.edit_2": "\u76F4\u63A5\u5728\u6E32\u67D3\u540E\u7684\u6587\u6863\u4E0A\u4FEE\u6539\u5185\u5BB9\uFF0C\u652F\u6301 WYSIWYG \u5DE5\u5177\u680F\uFF08\u52A0\u7C97\u3001\u659C\u4F53\u3001\u5220\u9664\u7EBF\u3001\u6807\u9898\u3001\u5217\u8868\u3001\u5F15\u7528\u3001\u5206\u9694\u7EBF\u3001\u64A4\u9500/\u91CD\u505A\uFF09",
        "help.edit_3": "\u7F16\u8F91\u6A21\u5F0F\u4E0B\u53F3\u952E\u8868\u683C\u53EF <strong>\u63D2\u5165/\u5220\u9664\u884C\u5217</strong>",
        "help.edit_4": "\u7F16\u8F91\u6A21\u5F0F\u4E0B Mermaid / PlantUML / Graphviz \u56FE\u8868\u81EA\u52A8\u8F6C\u6362\u4E3A\u53EF\u7F16\u8F91\u7684 <strong>\u6E90\u7801\u533A\u57DF</strong>\uFF0C\u652F\u6301\u76F4\u63A5\u4FEE\u6539\u56FE\u8868\u4EE3\u7801",
        "help.edit_5": "\u6309 <kbd>Ctrl</kbd>+<kbd>S</kbd> \u624B\u52A8\u4FDD\u5B58\uFF0C\u6216\u7B49\u5F85\u81EA\u52A8\u4FDD\u5B58",
        "help.search_title": "\u{1F50D} \u641C\u7D22\u529F\u80FD",
        "help.search_1": "\u6309 <kbd>Ctrl</kbd>+<kbd>F</kbd> \u6253\u5F00\u6B63\u6587\u641C\u7D22\u680F\uFF0C\u8F93\u5165\u5173\u952E\u8BCD\u540E\u6587\u6863\u4E2D\u6240\u6709\u5339\u914D\u6587\u672C\u4F1A\u88AB\u9AD8\u4EAE\u6807\u8BB0",
        "help.search_2": "\u4F7F\u7528\u641C\u7D22\u680F\u7684 <strong>\u4E0A/\u4E0B\u5BFC\u822A\u6309\u94AE</strong>\uFF08\u6216 <kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd>\uFF09\u5728\u5339\u914D\u9879\u4E4B\u95F4\u5207\u6362",
        "help.search_3": "\u76EE\u5F55\u9762\u677F\u9876\u90E8\u6709 <strong>\u641C\u7D22\u6846</strong>\uFF0C\u8F93\u5165\u5173\u952E\u8BCD\u540E\u76EE\u5F55\u5217\u8868\u4F1A\u88AB\u8FC7\u6EE4\uFF0C\u4FDD\u6301\u5C42\u7EA7\u7ED3\u6784",
        "help.search_4": "\u6279\u6CE8\u9762\u677F\u4E5F\u652F\u6301 <strong>\u641C\u7D22\u8FC7\u6EE4</strong>\uFF0C\u53EF\u6309\u6279\u6CE8\u5185\u5BB9\u3001\u9009\u4E2D\u6587\u672C\u3001\u63D2\u5165\u5185\u5BB9\u7B49\u591A\u5B57\u6BB5\u5339\u914D",
        "help.ai_title": "\u{1F916} \u4E00\u952E AI \u4FEE\u590D",
        "help.ai_1": "\u5B8C\u6210\u6279\u9605\u540E\uFF0C\u70B9\u51FB\u5DE5\u5177\u680F <strong>\u300C\u4E00\u952EAI\u4FEE\u590D\u300D</strong> \u6309\u94AE",
        "help.ai_2": "\u786E\u8BA4\u540E\u751F\u6210\u7ED3\u6784\u5316 AI \u4FEE\u6539\u6307\u4EE4\u6587\u4EF6\uFF0C\u4FDD\u5B58\u5230 <code>.review/</code> \u76EE\u5F55",
        "help.ai_3": "\u70B9\u51FB <strong>\u300C\u{1F680} \u786E\u5B9A\u6267\u884C\u300D</strong> \u81EA\u52A8\u53D1\u9001\u6307\u4EE4\u5230 CodeBuddy / \u5DE5\u8702 Copilot \u5BF9\u8BDD\u7A97\u53E3",
        "help.ai_4": "\u4E5F\u53EF\u70B9\u51FB <strong>\u300C\u{1F4CB} \u4E00\u952E\u590D\u5236\u6307\u4EE4\u300D</strong> \u624B\u52A8\u7C98\u8D34\u5230\u4EFB\u610F AI \u5DE5\u5177",
        "help.export_title": "\u{1F4E4} \u5BFC\u51FA\u4E0E\u5B58\u50A8",
        "help.export_1": "\u6309 <kbd>Ctrl</kbd>+<kbd>E</kbd> \u5BFC\u51FA\u6279\u9605\u8BB0\u5F55\u4E3A AI \u53EF\u8BFB\u7684\u7ED3\u6784\u5316 Markdown \u6307\u4EE4\u6587\u4EF6",
        "help.export_2": "\u6279\u6CE8\u8BB0\u5F55 <strong>\u81EA\u52A8\u4FDD\u5B58</strong> \u5230\u5DE5\u4F5C\u533A <code>.review/</code> \u76EE\u5F55\uFF0C\u6279\u6CE8\u6E05\u7A7A\u65F6\u81EA\u52A8\u5220\u9664\u8BB0\u5F55\u6587\u4EF6",
        "help.export_3": "\u6E90\u6587\u4EF6\u5185\u5BB9\u53D8\u66F4\u65F6\u81EA\u52A8\u5F52\u6863\u65E7\u7248\u672C\uFF0C\u521B\u5EFA\u65B0\u6279\u9605\u7248\u672C",
        "help.ui_title": "\u{1F5A5}\uFE0F \u754C\u9762\u529F\u80FD",
        "help.ui_toc": "<strong>\u76EE\u5F55\u5BFC\u822A</strong> \u2014 \u81EA\u52A8\u751F\u6210\u6587\u6863\u76EE\u5F55\uFF0C\u652F\u6301\u6298\u53E0/\u5C55\u5F00\u3001\u5FEB\u901F\u8DF3\u8F6C\u3001\u6EDA\u52A8\u9AD8\u4EAE\u5F53\u524D\u7AE0\u8282",
        "help.ui_annotations": "<strong>\u6279\u6CE8\u9762\u677F</strong> \u2014 \u4FA7\u8FB9\u6279\u6CE8\u5217\u8868\uFF0C\u652F\u6301\u6309\u65F6\u95F4\u6216\u6587\u672C\u4F4D\u7F6E\u6392\u5E8F\u3001\u5B9A\u4F4D\u3001\u7F16\u8F91\u3001\u5220\u9664",
        "help.ui_lightbox": "<strong>\u56FE\u7247\u706F\u7BB1</strong> \u2014 \u70B9\u51FB\u56FE\u7247\u653E\u5927\u9884\u89C8\uFF0C\u652F\u6301\u6EDA\u8F6E\u7F29\u653E\u3001\u62D6\u62FD\u5E73\u79FB\u3001\u53CC\u51FB\u8FD8\u539F\uFF08<kbd>+</kbd>/<kbd>-</kbd> \u7F29\u653E\uFF0C<kbd>0</kbd> \u9002\u5E94\u7A97\u53E3\uFF0C<kbd>R</kbd> \u91CD\u7F6E\uFF09",
        "help.ui_mermaid": "<strong>Mermaid \u56FE\u8868</strong> \u2014 \u70B9\u51FB Mermaid \u56FE\u8868\u653E\u5927\u67E5\u770B\uFF0C\u652F\u6301\u7F29\u653E\u63A7\u5236\u6761",
        "help.ui_plantuml": "<strong>PlantUML \u56FE\u8868</strong> \u2014 UML \u7C7B\u56FE\u3001\u65F6\u5E8F\u56FE\u3001\u6D3B\u52A8\u56FE\u7B49\uFF0C\u901A\u8FC7\u5728\u7EBF PlantUML \u670D\u52A1\u5668\u6E32\u67D3\uFF0C\u70B9\u51FB\u53EF\u653E\u5927\u67E5\u770B",
        "help.ui_graphviz": "<strong>Graphviz \u56FE\u8868</strong> \u2014 DOT \u8BED\u8A00\u56FE\u5F62\u6E32\u67D3\uFF0C\u57FA\u4E8E\u672C\u5730 Viz.js \u5F15\u64CE\uFF0C\u70B9\u51FB\u53EF\u653E\u5927\u67E5\u770B",
        "help.ui_search": "<strong>\u641C\u7D22\u529F\u80FD</strong> \u2014 <kbd>Ctrl</kbd>+<kbd>F</kbd> \u6B63\u6587\u641C\u7D22\u9AD8\u4EAE\u3001\u76EE\u5F55\u641C\u7D22\u8FC7\u6EE4\u3001\u6279\u6CE8\u641C\u7D22\u5B9A\u4F4D",
        "help.ui_multi_window": "<strong>\u591A\u7A97\u53E3\u652F\u6301</strong> \u2014 \u53EF\u540C\u65F6\u6253\u5F00\u591A\u4E2A Markdown \u6587\u4EF6\uFF0C\u6BCF\u4E2A\u6587\u4EF6\u62E5\u6709\u72EC\u7ACB\u7684\u6279\u9605\u9762\u677F\u548C\u72B6\u6001",
        "help.ui_zen": "<strong>\u7985\u6A21\u5F0F</strong> \u2014 \u6309 <kbd>Alt</kbd>+<kbd>Z</kbd> \u9690\u85CF\u4FA7\u680F\u4E13\u6CE8\u9605\u8BFB\uFF0C\u540C\u65F6\u9690\u85CF IDE \u4FA7\u8FB9\u680F",
        "help.ui_theme": "<strong>\u4EAE\u8272/\u6697\u8272\u4E3B\u9898</strong> \u2014 \u5DE5\u5177\u680F\u4E00\u952E\u5207\u6362\u6216\u8DDF\u968F\u7CFB\u7EDF",
        "help.ui_file_select": "<strong>\u6587\u4EF6\u9009\u62E9\u5668</strong> \u2014 \u5DE5\u4F5C\u533A\u5185 Markdown \u6587\u4EF6\u4E0B\u62C9\u6846\u5FEB\u901F\u5207\u6362",
        "help.ui_file_change": "<strong>\u6587\u4EF6\u53D8\u66F4\u68C0\u6D4B</strong> \u2014 \u6E90\u6587\u4EF6\u4FEE\u6539\u540E\u663E\u793A\u300C\u6587\u4EF6\u5DF2\u66F4\u65B0\u300D\u5FBD\u7AE0\uFF0C\u70B9\u51FB\u5237\u65B0\u6309\u94AE\u91CD\u8F7D",
        "help.ui_resize": "<strong>\u9762\u677F\u62D6\u62FD</strong> \u2014 \u76EE\u5F55\u548C\u6279\u6CE8\u9762\u677F\u5BBD\u5EA6\u53EF\u62D6\u62FD\u8C03\u6574",
        "help.tips_title": "\u{1F4A1} \u5C0F\u8D34\u58EB",
        "help.tips_reader": "<strong>\u5F53\u4F5C Markdown \u9605\u8BFB\u5668\u4F7F\u7528</strong> \u2014 \u5173\u95ED\u53F3\u4FA7\u6279\u9605\u9762\u677F\uFF08\u76EE\u5F55 + \u6279\u6CE8\uFF09\uFF0C\u5373\u53EF\u4F5C\u4E3A\u7EAF Markdown \u9605\u8BFB\u5668\u4F7F\u7528\uFF0C\u4EAB\u53D7\u5B8C\u6574\u7684\u6E32\u67D3\u6548\u679C",
        "help.tips_styles": "<strong>\u4E30\u5BCC\u7684\u6837\u5F0F\u9009\u62E9</strong> \u2014 \u5728\u8BBE\u7F6E\u4E2D\u53EF\u81EA\u5B9A\u4E49\u5B57\u4F53\u5927\u5C0F\u3001\u884C\u9AD8\u3001\u5185\u5BB9\u5BBD\u5EA6\u3001\u5B57\u4F53\u98CE\u683C\u3001\u4EE3\u7801\u4E3B\u9898\uFF0815 \u79CD\uFF09\u3001\u4EAE\u8272/\u6697\u8272\u4E3B\u9898\u7B49\uFF0C\u6253\u9020\u4E2A\u6027\u5316\u9605\u8BFB\u4F53\u9A8C",
        "help.shortcut_title": "\u2328\uFE0F \u5FEB\u6377\u952E",
        "help.shortcut_zen": "\u5207\u6362\u7985\u6A21\u5F0F",
        "help.shortcut_search": "\u6253\u5F00\u6B63\u6587\u641C\u7D22",
        "help.shortcut_export": "\u5BFC\u51FA\u6279\u9605\u8BB0\u5F55",
        "help.shortcut_save": "\u4FDD\u5B58\u7F16\u8F91\u5185\u5BB9\u5230\u6E90\u6587\u4EF6",
        "help.shortcut_mode": "\u5207\u6362\u9884\u89C8/\u7F16\u8F91\u6A21\u5F0F",
        "help.shortcut_esc": "\u5173\u95ED\u5F39\u7A97 / \u9000\u51FA\u7985\u6A21\u5F0F / \u5173\u95ED\u641C\u7D22\u680F",
        "help.feedback": "Bug \u53CD\u9988 & \u4F18\u5316\u5EFA\u8BAE",
        // ===== 设置面板 =====
        "settings.title": "\u8BBE\u7F6E",
        "settings.subtitle": "\u81EA\u5B9A\u4E49 MD Human Review \u7684\u5916\u89C2\u4E0E\u884C\u4E3A",
        "settings.appearance_title": "\u5916\u89C2\u4E3B\u9898",
        "settings.appearance_desc": "\u9009\u62E9\u754C\u9762\u7684\u6574\u4F53\u98CE\u683C",
        "settings.theme_label": "\u4E3B\u9898\u6A21\u5F0F",
        "settings.theme_desc": "\u5207\u6362\u4EAE\u8272\u6216\u6697\u8272\u98CE\u683C",
        "settings.theme_light": "\u2600\uFE0F \u4EAE\u8272",
        "settings.theme_dark": "\u{1F319} \u6697\u8272",
        "settings.theme_auto": "\u{1F5A5}\uFE0F \u8DDF\u968F\u7CFB\u7EDF",
        "settings.language_title": "\u{1F310} \u754C\u9762\u8BED\u8A00",
        "settings.language_desc": "\u9009\u62E9\u754C\u9762\u663E\u793A\u8BED\u8A00",
        "settings.language_label": "\u8BED\u8A00",
        "settings.language_desc2": "\u5207\u6362\u754C\u9762\u8BED\u8A00",
        "settings.lang_zh": "\u{1F1E8}\u{1F1F3} \u4E2D\u6587",
        "settings.lang_en": "\u{1F1FA}\u{1F1F8} English",
        "settings.typography_title": "\u6392\u7248\u8BBE\u7F6E",
        "settings.typography_desc": "\u8C03\u6574\u6587\u6863\u9605\u8BFB\u4F53\u9A8C",
        "settings.font_label": "\u{1F524} \u6B63\u6587\u5B57\u4F53",
        "settings.font_desc": "\u9009\u62E9\u6216\u8F93\u5165 Markdown \u6B63\u6587\u7684\u663E\u793A\u5B57\u4F53",
        "settings.code_font_label": "\u{1F4BB} \u4EE3\u7801\u5B57\u4F53",
        "settings.code_font_desc": "\u9009\u62E9\u6216\u8F93\u5165\u4EE3\u7801\u5757\u7684\u663E\u793A\u5B57\u4F53",
        "settings.font_size_label": "\u{1F520} \u5B57\u4F53\u5927\u5C0F",
        "settings.font_size_desc": "\u8C03\u6574\u6B63\u6587\u5B57\u4F53\u5927\u5C0F\uFF0812px - 24px\uFF09",
        "settings.line_height_label": "\u2195\uFE0F \u884C\u9AD8",
        "settings.line_height_desc": "\u8C03\u6574\u6BB5\u843D\u884C\u9AD8\uFF081.2 - 2.4\uFF09",
        "settings.max_width_label": "\u2194\uFE0F \u5185\u5BB9\u6700\u5927\u5BBD\u5EA6",
        "settings.max_width_desc": "\u8C03\u6574\u6B63\u6587\u533A\u57DF\u6700\u5927\u5BBD\u5EA6\uFF08600px - 1800px\uFF09",
        "settings.font_system": "\u7CFB\u7EDF\u9ED8\u8BA4",
        "settings.font_sans": "\u65E0\u886C\u7EBF",
        "settings.font_msyh": "\u5FAE\u8F6F\u96C5\u9ED1",
        "settings.font_pingfang": "\u82F9\u65B9",
        "settings.font_noto_sans": "\u601D\u6E90\u9ED1\u4F53",
        "settings.font_serif": "\u886C\u7EBF",
        "settings.font_serif_generic": "\u886C\u7EBF\u4F53\uFF08\u901A\u7528\uFF09",
        "settings.font_simsun": "\u5B8B\u4F53",
        "settings.font_noto_serif": "\u601D\u6E90\u5B8B\u4F53",
        "settings.font_other": "\u5176\u4ED6",
        "settings.font_custom": "\u81EA\u5B9A\u4E49...",
        "settings.font_custom_placeholder": "\u8F93\u5165\u5B57\u4F53\u540D\u79F0\uFF0C\u5982 'LXGW WenKai'",
        "settings.code_font_default": "\u9ED8\u8BA4\u7B49\u5BBD",
        "settings.code_font_mono": "\u7B49\u5BBD\u5B57\u4F53",
        "settings.code_font_custom_placeholder": "\u8F93\u5165\u5B57\u4F53\u540D\u79F0\uFF0C\u5982 'Hack'",
        "settings.slider_compact": "\u7D27\u51D1",
        "settings.slider_loose": "\u5BBD\u677E",
        "settings.slider_narrow": "\u7A84",
        "settings.slider_wide": "\u5BBD",
        "settings.preview_label": "\u{1F441} \u6392\u7248\u9884\u89C8",
        "settings.preview_desc": "\u5B9E\u65F6\u9884\u89C8\u6392\u7248\u6548\u679C",
        "settings.preview_text": "\u8FD9\u662F\u4E00\u6BB5\u9884\u89C8\u6587\u672C\uFF0C\u7528\u4E8E\u5C55\u793A\u5F53\u524D\u6392\u7248\u8BBE\u7F6E\u7684\u6548\u679C\u3002The quick brown fox jumps over the lazy dog.",
        "settings.preview_text2": "\u652F\u6301\u6E32\u67D3 <code>Mermaid</code> \u56FE\u8868\u548C\u4EE3\u7801\u9AD8\u4EAE\uFF0C\u8BA9 Markdown \u9605\u8BFB\u4F53\u9A8C\u66F4\u52A0\u51FA\u8272\u3002",
        "settings.code_theme_title": "\u4EE3\u7801\u9AD8\u4EAE\u4E3B\u9898",
        "settings.code_theme_desc": "\u9009\u62E9\u4EE3\u7801\u5757\u7684\u9AD8\u4EAE\u914D\u8272\u65B9\u6848",
        "settings.code_theme_label": "\u4EE3\u7801\u9AD8\u4EAE\u4E3B\u9898",
        "settings.code_theme_label_desc": "\u9009\u62E9\u4EE3\u7801\u5757\u7684\u9AD8\u4EAE\u914D\u8272\u65B9\u6848",
        "settings.code_theme_light": "\u{1F506} \u4EAE\u8272\u4E3B\u9898",
        "settings.code_theme_dark": "\u{1F319} \u6697\u8272\u4E3B\u9898",
        "settings.function_title": "\u529F\u80FD\u8BBE\u7F6E",
        "settings.function_desc": "\u5F00\u542F\u6216\u5173\u95ED\u5DE5\u5177\u529F\u80FD",
        "settings.show_toc": "\u663E\u793A\u76EE\u5F55\u5BFC\u822A",
        "settings.show_toc_desc": "\u9ED8\u8BA4\u5C55\u5F00\u76EE\u5F55\u9762\u677F",
        "settings.show_annotations": "\u663E\u793A\u6279\u6CE8\u5217\u8868",
        "settings.show_annotations_desc": "\u9ED8\u8BA4\u5C55\u5F00\u6279\u6CE8\u9762\u677F",
        "settings.sidebar_label": "\u4FA7\u8FB9\u680F\u4F4D\u7F6E",
        "settings.sidebar_desc": "\u8C03\u6574\u76EE\u5F55\u548C\u6279\u6CE8\u9762\u677F\u7684\u5DE6\u53F3\u5E03\u5C40",
        "settings.sidebar_toc_left": "\u76EE\u5F55\u5DE6 \u6279\u6CE8\u53F3",
        "settings.sidebar_toc_right": "\u6279\u6CE8\u5DE6 \u76EE\u5F55\u53F3",
        "settings.panel_mode_label": "\u9762\u677F\u6A21\u5F0F",
        "settings.panel_mode_desc": "\u9009\u62E9\u4FA7\u8FB9\u9762\u677F\u7684\u663E\u793A\u6A21\u5F0F",
        "settings.panel_floating": "\u60AC\u6D6E",
        "settings.panel_embedded": "\u5D4C\u5165",
        "settings.doc_align_label": "\u6587\u6863\u5BF9\u9F50",
        "settings.doc_align_desc": "\u8BBE\u7F6E\u4E3B\u6587\u6863\u7684\u5BF9\u9F50\u65B9\u5F0F",
        "settings.doc_align_left": "\u9760\u5DE6",
        "settings.doc_align_center": "\u5C45\u4E2D",
        "settings.doc_align_right": "\u9760\u53F3",
        "settings.math_label": "\u6570\u5B66\u516C\u5F0F\u6E32\u67D3",
        "settings.math_desc": "\u542F\u7528 LaTeX \u6570\u5B66\u516C\u5F0F\u6E32\u67D3",
        "settings.mermaid_label": "Mermaid \u56FE\u8868\u6E32\u67D3",
        "settings.mermaid_desc": "\u542F\u7528 Mermaid \u56FE\u8868\u8BED\u6CD5\u6E32\u67D3",
        "settings.plantuml_label": "PlantUML \u56FE\u8868\u6E32\u67D3",
        "settings.plantuml_desc": "\u542F\u7528 PlantUML \u56FE\u8868\u6E32\u67D3\uFF08\u9700\u8981\u7F51\u7EDC\u8FDE\u63A5\uFF09",
        "settings.graphviz_label": "Graphviz \u56FE\u8868\u6E32\u67D3",
        "settings.graphviz_desc": "\u542F\u7528 Graphviz DOT \u56FE\u8868\u6E32\u67D3",
        "settings.line_numbers_label": "\u663E\u793A\u4EE3\u7801\u884C\u53F7",
        "settings.line_numbers_desc": "\u5728\u4EE3\u7801\u5757\u4E2D\u663E\u793A\u884C\u53F7",
        "settings.auto_save_label": "\u81EA\u52A8\u4FDD\u5B58\u6279\u6CE8",
        "settings.auto_save_desc": "\u6279\u6CE8\u53D8\u66F4\u540E\u81EA\u52A8\u4FDD\u5B58\u5230\u6587\u4EF6",
        "settings.auto_save_delay_label": "\u81EA\u52A8\u4FDD\u5B58\u5EF6\u8FDF",
        "settings.auto_save_delay_desc": "\u4FEE\u6539\u540E\u5EF6\u8FDF\u591A\u4E45\u81EA\u52A8\u4FDD\u5B58",
        "settings.footer_hint": "\u{1F4A1} \u8BBE\u7F6E\u4FEE\u6539\u540E\u81EA\u52A8\u4FDD\u5B58",
        "settings.reset": "\u6062\u590D\u9ED8\u8BA4",
        "settings.saved_toast": "\u2705 \u8BBE\u7F6E\u5DF2\u81EA\u52A8\u4FDD\u5B58",
        // ===== 通知消息 =====
        "notification.load_error": "\u274C \u52A0\u8F7D\u6587\u4EF6\u5931\u8D25: {error}",
        "notification.unsaved": "\u25CF \u672A\u4FDD\u5B58",
        "notification.restored": "\u{1F4C2} \u5DF2\u4ECE .review \u6062\u590D {count} \u6761\u6279\u6CE8",
        "notification.stale_content_bumped": "\u26A0\uFE0F \u68C0\u6D4B\u5230\u6E90\u6587\u4EF6\u5728\u5173\u95ED\u671F\u95F4\u88AB\u4FEE\u6539\uFF0C\u65E7\u6279\u6CE8\u5DF2\u5F52\u6863\uFF0C\u5F00\u542F\u65B0\u7248\u672C v{version}",
        "notification.load_failed": "\u52A0\u8F7D\u6587\u4EF6\u5931\u8D25",
        "notification.file_updated_new_version": "\u6587\u4EF6\u5DF2\u66F4\u65B0\uFF0C\u5DF2\u521B\u5EFA\u65B0\u7684\u6279\u9605\u7248\u672C",
        "notification.file_reloaded": "\u6587\u4EF6\u5DF2\u91CD\u65B0\u52A0\u8F7D",
        "notification.refresh_failed": "\u5237\u65B0\u5931\u8D25: {error}",
        "notification.copied": "\u2705 \u5DF2\u590D\u5236",
        "notification.copy": "\u{1F4CB} \u590D\u5236",
        "notification.click_to_enlarge": "\u70B9\u51FB\u67E5\u770B\u5927\u56FE",
        "notification.no_annotations": "\u6682\u65E0\u6279\u6CE8",
        "notification.updating": "\u66F4\u65B0\u4E2D...",
        "notification.update_failed": "\u274C \u66F4\u65B0\u5931\u8D25: {error}",
        "notification.request_failed": "\u274C \u8BF7\u6C42\u5931\u8D25: {error}",
        "notification.no_file": "\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A MD \u6587\u4EF6",
        "notification.no_open_file": "\u6CA1\u6709\u6253\u5F00\u7684\u6587\u4EF6",
        "notification.edit_mode": "\u7F16\u8F91\u6A21\u5F0F",
        "notification.saved": "\u2713 \u5DF2\u4FDD\u5B58",
        "notification.saving": "\u23F3 \u4FDD\u5B58\u4E2D...",
        "notification.save_failed": "\u4FDD\u5B58\u5931\u8D25",
        "notification.export_empty": "\u6682\u65E0\u6279\u6CE8\u53EF\u5BFC\u51FA",
        "notification.export_saved": "\u5DF2\u4FDD\u5B58\u5230 .review \u76EE\u5F55\uFF1A{name}",
        "notification.export_failed": "\u5BFC\u51FA\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u5DE5\u4F5C\u533A\u8BBE\u7F6E",
        "notification.auto_saved": "\u2713 \u5DF2\u81EA\u52A8\u4FDD\u5B58",
        "notification.auto_save_failed": "\u2717 \u4FDD\u5B58\u5931\u8D25",
        "notification.request_timeout": "\u8BF7\u6C42\u8D85\u65F6: {type}",
        // ===== 浮层按钮 =====
        "float.comment": "\u{1F4AC} \u8BC4\u8BBA",
        "float.delete": "\u{1F5D1}\uFE0F \u5220\u9664",
        "float.insert_after": "\u2795 \u540E\u63D2",
        "float.insert_before": "\u2B06\uFE0F \u524D\u63D2",
        // ===== 批注卡片 =====
        "annotation.type_comment": "\u8BC4\u8BBA",
        "annotation.type_delete": "\u5220\u9664",
        "annotation.type_insert_before": "\u524D\u63D2",
        "annotation.type_insert_after": "\u540E\u63D2",
        "annotation.insert_before_label": "\u{1F4CD} \u5728\u6B64\u4E4B\u524D\u63D2\u5165\uFF1A",
        "annotation.insert_after_label": "\u{1F4CD} \u5728\u6B64\u4E4B\u540E\u63D2\u5165\uFF1A",
        "annotation.edit": "\u7F16\u8F91",
        "annotation.block_index": "\u5757 {index}",
        "annotation.image_alt": "\u9644\u56FE",
        "annotation.preview_alt": "\u9884\u89C8{index}",
        // ===== AI 修复 =====
        "ai.summary_total": '\u{1F4DD} \u5171 <span class="stat-count">{count}</span> \u6761\u6279\u6CE8',
        "ai.summary_delete": '\u{1F5D1}\uFE0F \u5220\u9664\u64CD\u4F5C\uFF1A<span class="stat-count">{count}</span> \u6761',
        "ai.summary_insert": '\u2795 \u63D2\u5165\u64CD\u4F5C\uFF1A<span class="stat-count">{count}</span> \u6761',
        "ai.summary_comment": '\u{1F4AC} \u8BC4\u8BBA\u64CD\u4F5C\uFF1A<span class="stat-count">{count}</span> \u6761',
        "ai.result_success": "\u2705 AI \u6307\u4EE4\u5DF2\u751F\u6210",
        "ai.result_count": "\u5171 {count} \u6761\u6307\u4EE4\u5DF2\u751F\u6210",
        "ai.result_source": "\u{1F4C4} \u6E90\u6587\u4EF6\uFF1A",
        "ai.result_instruction": "\u{1F4DD} \u6307\u4EE4\u6587\u4EF6\uFF1A",
        "ai.result_empty": "\u26A0\uFE0F \u65E0\u6709\u6548\u6307\u4EE4",
        "ai.copy_instruction": "\u8BF7\u6839\u636E\u8BC4\u5BA1\u6307\u4EE4\u6587\u4EF6\u4FEE\u6539\u6E90\u6587\u4EF6\u3002\n\n\u6E90\u6587\u4EF6\u8DEF\u5F84\uFF1A{source}\n\u8BC4\u5BA1\u6307\u4EE4\u6587\u4EF6\uFF1A{instruction}\n\n\u8BF7\u5148\u8BFB\u53D6\u8BC4\u5BA1\u6307\u4EE4\u6587\u4EF6\u4E86\u89E3\u9700\u8981\u4FEE\u6539\u7684\u5185\u5BB9\uFF0C\u7136\u540E\u6309\u6307\u4EE4\u9010\u6761\u4FEE\u6539\u6E90\u6587\u4EF6\u3002",
        "ai.btn_copied": "\u2705 \u5DF2\u590D\u5236",
        "ai.btn_copy": "\u{1F4CB} \u4E00\u952E\u590D\u5236\u6307\u4EE4",
        "ai.chat_success_codebuddy": "\u2705 AI \u65B0\u5BF9\u8BDD\u5DF2\u6253\u5F00\uFF0C\u6307\u4EE4\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C\u8BF7\u6309 Ctrl+V \u7C98\u8D34\u540E\u56DE\u8F66\u53D1\u9001\u3002",
        "ai.chat_success_vscode": "\u2705 AI \u5BF9\u8BDD\u5DF2\u6253\u5F00\uFF0C\u6307\u4EE4\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF0C\u8BF7\u6309 Ctrl+V \u7C98\u8D34\u540E\u56DE\u8F66\u53D1\u9001\u3002",
        "ai.chat_fallback": "\u2705 \u5DF2\u590D\u5236 AI \u6307\u4EE4\u5230\u526A\u8D34\u677F\uFF0C\u8BF7\u624B\u52A8\u6253\u5F00AI\u5BF9\u8BDD\u7A97\u53E3\u5E76\u7C98\u8D34\u6267\u884C\u3002",
        "ai.chat_error": "\u274C \u64CD\u4F5C\u5931\u8D25: {error}",
        // ===== 灯箱 =====
        "lightbox.zoom_out": "\u7F29\u5C0F (-)",
        "lightbox.zoom_in": "\u653E\u5927 (+)",
        "lightbox.zoom_fit": "\u9002\u5E94\u7A97\u53E3 (0)",
        "lightbox.zoom_reset": "\u91CD\u7F6E (R)",
        "lightbox.hint": "\u6EDA\u8F6E\u7F29\u653E \xB7 \u62D6\u62FD\u79FB\u52A8 \xB7 +/-/0 \u5FEB\u6377\u952E \xB7 ESC \u5173\u95ED",
        // ===== 渲染器 =====
        "renderer.copy_code": "\u{1F4CB} \u590D\u5236",
        "renderer.image_load_failed": "\u{1F5BC}\uFE0F \u56FE\u7247\u52A0\u8F7D\u5931\u8D25: {alt}",
        "renderer.image_loading": "\u{1F5BC}\uFE0F \u56FE\u7247\u52A0\u8F7D\u4E2D: {name}",
        "renderer.alert_note": "\u6CE8\u610F",
        "renderer.alert_tip": "\u63D0\u793A",
        "renderer.alert_important": "\u91CD\u8981",
        "renderer.alert_warning": "\u8B66\u544A",
        "renderer.alert_caution": "\u6CE8\u610F",
        "renderer.insert_before_text": "\u524D\u63D2\u5185\u5BB9",
        "renderer.insert_after_text": "\u63D2\u5165\u5185\u5BB9",
        "renderer.mermaid_error": "Mermaid \u56FE\u8868\u6E32\u67D3\u5931\u8D25",
        "renderer.math_error": "\u516C\u5F0F\u6E32\u67D3\u5931\u8D25: {error}",
        "renderer.plantuml_too_long": "\u56FE\u8868\u6E90\u7801\u8FC7\u957F\uFF08{length} \u5B57\u7B26\uFF09\uFF0C\u65E0\u6CD5\u5728\u7EBF\u6E32\u67D3",
        "renderer.plantuml_error": "PlantUML \u56FE\u8868\u6E32\u67D3\u5931\u8D25\uFF08\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\uFF09",
        "renderer.graphviz_error": "Graphviz \u56FE\u8868\u6E32\u67D3\u5931\u8D25: {error}",
        // ===== 导出 =====
        "export.title": "\u6279\u9605\u8BB0\u5F55",
        "export.source_file": "\u6E90\u6587\u4EF6",
        "export.source_path": "\u6E90\u6587\u4EF6\u8DEF\u5F84",
        "export.source_version": "\u6E90\u6587\u4EF6\u7248\u672C",
        "export.review_time": "\u6279\u9605\u65F6\u95F4",
        "export.review_version": "\u6279\u9605\u7248\u672C",
        "export.annotation_count": "\u6279\u6CE8\u6570\u91CF",
        "export.type_comment": "\u8BC4\u8BBA",
        "export.type_delete": "\u5220\u9664",
        "export.type_insert_after": "\u540E\u63D2",
        "export.type_insert_before": "\u524D\u63D2",
        "export.section_instructions": "\u64CD\u4F5C\u6307\u4EE4",
        "export.instruction_order_hint": "\u6307\u4EE4\u5DF2\u6309**\u4ECE\u540E\u5F80\u524D**\u6392\u5217\uFF08\u5012\u5E8F\uFF09\uFF0C\u8BF7\u4E25\u683C\u6309\u7167\u987A\u5E8F\u4ECE\u4E0A\u5230\u4E0B\u9010\u6761\u6267\u884C\u3002",
        "export.instruction_anchor_hint": "\u6BCF\u6761\u6307\u4EE4\u63D0\u4F9B\u4E86\u300C\u6587\u672C\u951A\u70B9\u300D\u7528\u4E8E\u7CBE\u786E\u5B9A\u4F4D\uFF0C\u8BF7\u4F18\u5148\u901A\u8FC7\u951A\u70B9\u6587\u672C\u5339\u914D\u6765\u786E\u8BA4\u76EE\u6807\u4F4D\u7F6E\uFF0CblockIndex \u4EC5\u4F5C\u8F85\u52A9\u53C2\u8003\u3002",
        "export.instruction_num": "\u6307\u4EE4 {num}",
        "export.label_modify": "\uFF08\u4FEE\u6539\uFF09",
        "export.label_delete": "\uFF08\u5220\u9664\uFF09",
        "export.label_insert_before": "\uFF08\u524D\u63D2\uFF09",
        "export.label_insert_after": "\uFF08\u540E\u63D2\uFF09",
        "export.op_modify": "\u6839\u636E\u8BC4\u8BBA\u4FEE\u6539\u5185\u5BB9",
        "export.op_delete": "\u5220\u9664\u4EE5\u4E0B\u6587\u672C",
        "export.op_insert_before": "\u5728\u6307\u5B9A\u4F4D\u7F6E\u524D\u63D2\u5165\u65B0\u5185\u5BB9",
        "export.op_insert_after": "\u5728\u6307\u5B9A\u4F4D\u7F6E\u540E\u63D2\u5165\u65B0\u5185\u5BB9",
        "export.field_operation": "\u64CD\u4F5C",
        "export.field_block": "\u5B9A\u4F4D\u5757",
        "export.field_block_value": "\u7B2C {n} \u5757",
        "export.field_anchor": "\u6587\u672C\u951A\u70B9",
        "export.field_offset": "\u5757\u5185\u504F\u79FB",
        "export.field_offset_value": "\u7B2C {n} \u4E2A\u5B57\u7B26\u5904\uFF08startOffset={n}\uFF09",
        "export.field_target_text": "\u76EE\u6807\u6587\u672C",
        "export.field_comment": "\u8BC4\u8BBA\u5185\u5BB9",
        "export.field_images": "\u9644\u56FE",
        "export.field_images_count": "\u5171 {count} \u5F20",
        "export.field_image_n": "\u56FE\u7247{n}\uFF1A",
        "export.field_delete_text": "\u8981\u5220\u9664\u7684\u6587\u672C",
        "export.field_insert_position_before": "\u63D2\u5165\u4F4D\u7F6E\uFF08\u5728\u6B64\u6587\u672C\u4E4B\u524D\uFF09",
        "export.field_insert_position_after": "\u63D2\u5165\u4F4D\u7F6E\uFF08\u5728\u6B64\u6587\u672C\u4E4B\u540E\uFF09",
        "export.field_insert_content": "\u8981\u63D2\u5165\u7684\u5185\u5BB9",
        "export.field_insert_reason": "\u63D2\u5165\u8BF4\u660E",
        "export.section_json": "\u539F\u59CB\u6570\u636E\uFF08JSON\uFF09",
        "export.json_hint": "\u5982\u9700\u7CBE\u786E\u64CD\u4F5C\uFF0C\u53EF\u4F7F\u7528\u4EE5\u4E0B JSON \u6570\u636E\u3002\u5176\u4E2D `blockIndex` \u662F\u57FA\u4E8E\u7A7A\u884C\u5206\u5272\u7684\u5757\u7D22\u5F15\uFF08\u4ECE0\u5F00\u59CB\uFF09\uFF0C`startOffset` \u662F\u76EE\u6807\u6587\u672C\u5728\u5757\u5185\u7684\u5B57\u7B26\u504F\u79FB\u91CF\uFF08\u4ECE0\u5F00\u59CB\uFF09\uFF0C\u53EF\u7528\u4E8E\u533A\u5206\u540C\u4E00\u5757\u5185\u7684\u91CD\u590D\u6587\u672C\u3002",
        "export.unknown": "\u672A\u77E5",
        "export.unit_count": "{n} \u6761",
        "export.image_note": "**\u6CE8\u610F**\uFF1A\u6279\u6CE8\u4E2D\u5305\u542B\u56FE\u7247\u9644\u4EF6\uFF0C\u56FE\u7247\u6587\u4EF6\u5B58\u50A8\u5728 .review \u76EE\u5F55\u7684 images \u5B50\u76EE\u5F55\u4E2D\u3002",
        "export.base64_note": "**\u6CE8\u610F**\uFF1A\u90E8\u5206\u6279\u6CE8\u5305\u542B Base64 \u56FE\u7247\u6570\u636E\uFF0C\u5B8C\u6574\u56FE\u7247\u6570\u636E\u5DF2\u540C\u65F6\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6\uFF0C\u8BF7\u4E00\u5E76\u53D1\u9001\u7ED9 AI\u3002",
        "export.ai_generated": "\u5171 {count} \u6761\u6307\u4EE4\u5DF2\u751F\u6210 AI \u4FEE\u6539\u6587\u4EF6",
        "export.no_valid": "\u65E0\u6709\u6548\u6307\u4EE4",
        // ===== CSS =====
        "css.placeholder_edit": "\u70B9\u51FB\u6B64\u5904\u8F93\u5165\u5185\u5BB9...",
        // ===== Extension Host =====
        "ext.file_not_found": "\u6587\u4EF6\u4E0D\u5B58\u5728: {path}",
        "ext.invalid_image": "\u65E0\u6548\u7684\u56FE\u7247\u6570\u636E\u683C\u5F0F",
        // ===== 主题按钮 =====
        "theme.light": "\u4EAE\u8272",
        "theme.dark": "\u6697\u8272"
      },
      "en": {
        // ===== Toolbar =====
        "toolbar.help_title": "Help",
        "toolbar.file_select_title": "Select MD file",
        "toolbar.file_select_default": "-- Select file --",
        "toolbar.no_file": "No file open",
        "toolbar.file_changed": "File updated",
        "toolbar.save_title": "Save changes to source file (Ctrl+S)",
        "toolbar.save": "Save",
        "toolbar.toc_title": "Toggle table of contents",
        "toolbar.toc": "TOC",
        "toolbar.zen_title": "Zen mode: hide sidebars, focus on reading (Alt+Z)",
        "toolbar.zen": "Zen",
        "toolbar.exit_zen": "Exit Zen",
        "toolbar.theme_title": "Toggle light/dark theme",
        "toolbar.theme": "Theme",
        "toolbar.mode_title": "Toggle preview/edit mode",
        "toolbar.mode_preview": "Preview",
        "toolbar.mode_edit": "Edit",
        "edit_mode.rich_toggle_tooltip": "Edit Mode (structured editing with diagram preview and annotation decorations)",
        "edit_mode.rich": "Rich",
        "edit_mode.rich_hint": "Entered Rich Text editing mode",
        "toolbar.annotations_title": "Toggle annotations panel",
        "toolbar.annotations_count": "{count}",
        "toolbar.annotations_zero": "",
        "toolbar.ai_fix_title": "Generate AI fix instructions from review annotations",
        "toolbar.ai_fix": "AI Fix",
        "toolbar.settings_title": "Settings",
        "toolbar.refresh_title": "Refresh current file",
        "toolbar.scroll_top_title": "Back to top",
        // ===== Welcome =====
        "welcome.title": "Welcome to MD Human Review",
        "welcome.subtitle": "Open a Markdown file to start reviewing like a mentor grading a paper",
        "welcome.feature_comment": "Select text to add comments",
        "welcome.feature_delete": "Mark content for deletion",
        "welcome.feature_image": "Insert images in comments",
        "welcome.feature_ai": "One-click AI fix",
        "welcome.hint_open": "\u{1F4A1} After opening a <code>.md</code> file, use the command palette or context menu to <code>open the review panel</code>",
        "welcome.hint_save": "Review records are automatically saved to the workspace <code>.review/</code> directory",
        // ===== TOC Panel =====
        "toc.title": "Contents",
        "toc.hide_title": "Hide TOC panel",
        "toc.menu_title": "More actions",
        "toc.collapse_all": "Collapse all",
        "toc.expand_all": "Expand all",
        "toc.empty": "TOC will be generated after opening a document",
        "toc.search_placeholder": "Search TOC...",
        "toc.search_clear": "Clear",
        "toc.no_results": "No matching results",
        // ===== Content Search =====
        "search.placeholder": "Search...",
        "search.prev_title": "Previous (Shift+Enter)",
        "search.next_title": "Next (Enter)",
        "search.close_title": "Close (Esc)",
        // ===== Editor Toolbar =====
        "editor.bold_title": "Bold (Ctrl+B)",
        "editor.italic_title": "Italic (Ctrl+I)",
        "editor.strikethrough_title": "Strikethrough",
        "editor.h1_title": "Heading 1",
        "editor.h2_title": "Heading 2",
        "editor.h3_title": "Heading 3",
        "editor.ul_title": "Unordered list",
        "editor.ol_title": "Ordered list",
        "editor.quote_title": "Block quote",
        "editor.hr_title": "Horizontal rule",
        "editor.undo_title": "Undo (Ctrl+Z)",
        "editor.redo_title": "Redo (Ctrl+Y)",
        "editor.tips_title": "Edit Mode Warning",
        "editor.tips_close": "Close",
        "editor.tips_warning1": "After editing, some Markdown extended syntax may be lost (e.g., math formulas, Mermaid diagrams, GitHub alert blocks, etc.)",
        "editor.tips_warning2": "Recommended for <b>lightweight text edits</b> only (e.g., fixing typos, checking task lists, etc.)",
        "editor.diagram_edit_hint": "Edit diagram source",
        // ===== Annotations Panel =====
        "annotations.title": "Annotations",
        "annotations.save_title": "Save review record",
        "annotations.save": "Save",
        "annotations.clear_title": "Clear all annotations",
        "annotations.clear": "Clear",
        "annotations.sort_title": "Sort by",
        "annotations.sort_time": "By review time \u2193",
        "annotations.sort_position": "By text position",
        "annotations.hide_title": "Hide annotations panel",
        "annotations.empty": "No annotations yet",
        "annotations.empty_hint": "Select text and right-click or use the toolbar to add annotations",
        "annotations.search_placeholder": "Search annotations...",
        "annotations.search_clear": "Clear",
        "annotations.no_results": "No matching annotations",
        // ===== Context Menu =====
        "context_menu.add_comment": "Add Comment",
        "context_menu.mark_delete": "Mark Delete",
        "context_menu.insert_after": "Insert Content (After)",
        "context_menu.insert_before": "Insert Content (Before)",
        "context_menu.table_ops": "\u{1F4CA} Table Operations",
        "context_menu.insert_row_above": "Insert row above",
        "context_menu.insert_row_below": "Insert row below",
        "context_menu.insert_col_left": "Insert column left",
        "context_menu.insert_col_right": "Insert column right",
        "context_menu.delete_row": "Delete current row",
        "context_menu.delete_col": "Delete current column",
        // ===== Comment Modal =====
        "modal.comment.title": "Add Comment",
        "modal.comment.edit_title": "Edit Comment",
        "modal.comment.selected_text": "Selected text:",
        "modal.comment.content": "Comment:",
        "modal.comment.placeholder": "Enter your comment...",
        "modal.comment.image_label": "Insert image (optional):",
        "modal.comment.image_hint": "Click, drag, or Ctrl+V to paste image",
        "modal.comment.cancel": "Cancel",
        "modal.comment.submit": "Submit Comment",
        // ===== Insert Modal =====
        "modal.insert.title_after": "Insert Content",
        "modal.insert.title_before": "Insert Content (Before)",
        "modal.insert.position_after": "Insert position (after this content):",
        "modal.insert.position_before": "Insert position (before this content):",
        "modal.insert.content": "Content to insert:",
        "modal.insert.content_placeholder": "Enter content to insert (Markdown supported)...",
        "modal.insert.reason": "Reason (optional):",
        "modal.insert.reason_placeholder": "Explain the reason for insertion...",
        "modal.insert.cancel": "Cancel",
        "modal.insert.submit": "Confirm Insert",
        // ===== Clear Modal =====
        "modal.clear.title": "\u26A0\uFE0F Clear All Annotations",
        "modal.clear.message": "Are you sure you want to clear all annotations?",
        "modal.clear.warning": "This action cannot be undone!",
        "modal.clear.cancel": "Cancel",
        "modal.clear.confirm": "Confirm Clear",
        // ===== AI Modal =====
        "modal.ai.title": "\u{1F916} AI Fix Confirmation",
        "modal.ai.warning": "This will generate AI instruction files and save them to the workspace <code>.review/</code> directory.",
        "modal.ai.cancel": "Cancel",
        "modal.ai.confirm": "Generate AI Instructions",
        "modal.ai.no_annotations": "No annotations yet",
        "modal.ai.source_file": "\u{1F4C4} Source file: ",
        "modal.ai.total_annotations": "\u{1F4DD} Total {count} annotations",
        "modal.ai.delete_count": "\u{1F5D1}\uFE0F Delete: {count}",
        "modal.ai.insert_count": "\u2795 Insert: {count}",
        "modal.ai.comment_count": "\u{1F4AC} Comment: {count}",
        "modal.ai.summary_hint": "\u{1F4A1} All annotations will be compiled into an AI instruction file for AI to execute modifications one by one.",
        // ===== AI Result Modal =====
        "modal.ai_result.title": "\u{1F4CB} AI Instructions Generated",
        "modal.ai_result.close": "Close",
        "modal.ai_result.vscode_hint": "\u26A0\uFE0F Instructions copied to clipboard. Paste with Ctrl+V into AI chat.",
        "modal.ai_result.cursor_hint": "\u2728 AI Chat opened in Cursor with auto-paste attempted; press Ctrl+V then Enter if it did not work.",
        "modal.ai_result.windsurf_hint": "\u2728 Cascade opened in Windsurf with auto-paste attempted; press Ctrl+V then Enter if it did not work.",
        "modal.ai_result.execute": "\u{1F680} Execute",
        "modal.ai_result.header_success": "\u2705 AI Instructions Generated",
        "modal.ai_result.count": "{count} instructions generated",
        "modal.ai_result.hint_annotations": "\u{1F916} <strong>{count} annotations</strong> compiled into AI instruction file.",
        "modal.ai_result.source_label": "\u{1F4C4} Source file: ",
        "modal.ai_result.instruction_label": "\u{1F4DD} Instruction file: ",
        "modal.ai_result.copy_btn": "\u{1F4CB} Copy Instructions",
        "modal.ai_result.copied": "\u2705 Copied",
        "modal.ai_result.header_empty": "\u26A0\uFE0F No valid instructions",
        "modal.ai_result.copy_text": "Please modify the source file according to the review instruction file.\n\nSource file: {source}\nInstruction file: {instruction}\n\nPlease read the instruction file first, then apply modifications one by one.\n\n\u2705 After all modifications are completed, please remind me to go back to the **MD Human Review** panel and click the refresh button (\u{1F504}) at the top right corner to reload the latest content and create a new review version.",
        // ===== Help Modal =====
        "help.title": "\u{1F4D6} User Guide",
        "help.ok": "Got it",
        "help.quick_start_title": "\u{1F680} Quick Start",
        "help.quick_start_intro": "Open a <code>.md</code> or <code>.mdc</code> file, then open the review panel via:",
        "help.quick_start_command": '<strong>Command Palette</strong>: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> \u2192 Search "MD Human Review: Open Review Panel"',
        "help.quick_start_context": "<strong>Context Menu</strong>: Right-click in the editor or file explorer",
        "help.quick_start_titlebar": "<strong>Editor Title Bar</strong>: Click the icon button in the title bar",
        "help.comment_title": "\u{1F4AC} Add Comments",
        "help.comment_1": "<strong>Select text</strong> in the document",
        "help.comment_2": 'After releasing the mouse, a floating toolbar appears. Click <strong>"\u{1F4AC} Comment"</strong> (or right-click)',
        "help.comment_3": "Enter your comment in the popup. Optionally upload images (click, drag, or <kbd>Ctrl</kbd>+<kbd>V</kbd> to paste)",
        "help.comment_4": 'Click <strong>"Submit Comment"</strong>',
        "help.comment_hint": 'Selected text will be highlighted in <span style="color:var(--primary);font-weight:600;">green</span>, with a comment card displayed in the sidebar.',
        "help.delete_title": "\u{1F5D1}\uFE0F Mark Delete",
        "help.delete_1": "<strong>Select</strong> the text to delete",
        "help.delete_2": 'Click <strong>"\u{1F5D1}\uFE0F Delete"</strong> in the floating toolbar (or right-click)',
        "help.delete_hint": 'Marked text will display with a <span style="text-decoration:line-through;color:var(--danger);">strikethrough</span> style.',
        "help.insert_title": "\u2795 Insert Content",
        "help.insert_1": "<strong>Select</strong> text as an anchor point for insertion",
        "help.insert_2": 'Right-click and choose <strong>"\u2795 Insert Content (After)"</strong> or <strong>"\u2B06\uFE0F Insert Content (Before)"</strong>',
        "help.insert_3": "Enter content to insert (Markdown supported), optionally add a reason",
        "help.edit_title": "\u270F\uFE0F WYSIWYG Editing",
        "help.edit_1": 'Click the <strong>"Preview/Edit"</strong> toggle button in the toolbar (or press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>)',
        "help.edit_2": "Edit directly on the rendered document with WYSIWYG toolbar (bold, italic, strikethrough, headings, lists, quotes, horizontal rule, undo/redo)",
        "help.edit_3": "Right-click tables in edit mode to <strong>insert/delete rows and columns</strong>",
        "help.edit_4": "In edit mode, Mermaid / PlantUML / Graphviz diagrams are automatically converted to editable <strong>source code areas</strong> for direct modification",
        "help.edit_5": "Press <kbd>Ctrl</kbd>+<kbd>S</kbd> to save manually, or wait for auto-save",
        "help.search_title": "\u{1F50D} Search",
        "help.search_1": "Press <kbd>Ctrl</kbd>+<kbd>F</kbd> to open the content search bar. All matching text in the document will be highlighted",
        "help.search_2": "Use the <strong>up/down navigation buttons</strong> (or <kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd>) to switch between matches",
        "help.search_3": "The TOC panel has a <strong>search box</strong> at the top. Enter keywords to filter the TOC list while preserving hierarchy",
        "help.search_4": "The annotations panel also supports <strong>search filtering</strong> by annotation content, selected text, inserted content, and more",
        "help.ai_title": "\u{1F916} One-Click AI Fix",
        "help.ai_1": 'After reviewing, click the <strong>"AI Fix"</strong> button in the toolbar',
        "help.ai_2": "Confirm to generate structured AI instruction file, saved to <code>.review/</code> directory",
        "help.ai_3": 'Click <strong>"\u{1F680} Execute"</strong> to auto-send instructions to CodeBuddy / Copilot chat',
        "help.ai_4": 'Or click <strong>"\u{1F4CB} Copy Instructions"</strong> to paste into any AI tool manually',
        "help.export_title": "\u{1F4E4} Export & Storage",
        "help.export_1": "Press <kbd>Ctrl</kbd>+<kbd>E</kbd> to export review records as AI-readable structured Markdown instruction files",
        "help.export_2": "Annotation records are <strong>auto-saved</strong> to the workspace <code>.review/</code> directory; deleted when annotations are cleared",
        "help.export_3": "Old versions are auto-archived when source file content changes, creating a new review version",
        "help.ui_title": "\u{1F5A5}\uFE0F Interface Features",
        "help.ui_toc": "<strong>Table of Contents</strong> \u2014 Auto-generated document TOC with collapse/expand, quick navigation, and scroll-tracking",
        "help.ui_annotations": "<strong>Annotations Panel</strong> \u2014 Sidebar annotation list with sorting by time or position, navigation, editing, and deletion",
        "help.ui_lightbox": "<strong>Image Lightbox</strong> \u2014 Click images to enlarge, with scroll zoom, drag pan, double-click reset (<kbd>+</kbd>/<kbd>-</kbd> zoom, <kbd>0</kbd> fit, <kbd>R</kbd> reset)",
        "help.ui_mermaid": "<strong>Mermaid Charts</strong> \u2014 Click Mermaid diagrams to enlarge with zoom controls",
        "help.ui_plantuml": "<strong>PlantUML Diagrams</strong> \u2014 UML class diagrams, sequence diagrams, activity diagrams, etc. Rendered via online PlantUML server; click to enlarge",
        "help.ui_graphviz": "<strong>Graphviz Diagrams</strong> \u2014 DOT language graph rendering via local Viz.js engine; click to enlarge with zoom controls",
        "help.ui_search": "<strong>Search</strong> \u2014 <kbd>Ctrl</kbd>+<kbd>F</kbd> content search with highlighting, TOC search filtering, annotation search",
        "help.ui_multi_window": "<strong>Multi-Window</strong> \u2014 Open multiple Markdown files simultaneously, each with its own independent review panel and state",
        "help.ui_zen": "<strong>Zen Mode</strong> \u2014 Press <kbd>Alt</kbd>+<kbd>Z</kbd> to hide sidebars for focused reading",
        "help.ui_theme": "<strong>Light/Dark Theme</strong> \u2014 One-click toggle or follow system",
        "help.ui_file_select": "<strong>File Selector</strong> \u2014 Dropdown to quickly switch between workspace Markdown files",
        "help.ui_file_change": '<strong>File Change Detection</strong> \u2014 Shows "File updated" badge when source file is modified; click refresh to reload',
        "help.ui_resize": "<strong>Panel Resize</strong> \u2014 Drag to adjust TOC and annotation panel widths",
        "help.tips_title": "\u{1F4A1} Tips",
        "help.tips_reader": "<strong>Use as a Markdown Reader</strong> \u2014 Hide the review panels (TOC + Annotations) to use it as a pure Markdown reader with full rendering support",
        "help.tips_styles": "<strong>Rich Style Options</strong> \u2014 Customize font size, line height, content width, font style, code theme (15 options), light/dark theme, and more in Settings for a personalized reading experience",
        "help.shortcut_title": "\u2328\uFE0F Keyboard Shortcuts",
        "help.shortcut_zen": "Toggle Zen mode",
        "help.shortcut_search": "Open content search",
        "help.shortcut_export": "Export review record",
        "help.shortcut_save": "Save edits to source file",
        "help.shortcut_mode": "Toggle preview/edit mode",
        "help.shortcut_esc": "Close popup / Exit Zen mode / Close search bar",
        "help.feedback": "Bug Reports & Suggestions",
        // ===== Settings Panel =====
        "settings.title": "Settings",
        "settings.subtitle": "Customize the appearance and behavior of MD Human Review",
        "settings.appearance_title": "Appearance",
        "settings.appearance_desc": "Choose the overall visual style",
        "settings.theme_label": "Theme Mode",
        "settings.theme_desc": "Switch between light and dark styles",
        "settings.theme_light": "\u2600\uFE0F Light",
        "settings.theme_dark": "\u{1F319} Dark",
        "settings.theme_auto": "\u{1F5A5}\uFE0F Auto",
        "settings.language_title": "\u{1F310} Language",
        "settings.language_desc": "Choose display language",
        "settings.language_label": "Language",
        "settings.language_desc2": "Switch interface language",
        "settings.lang_zh": "\u{1F1E8}\u{1F1F3} \u4E2D\u6587",
        "settings.lang_en": "\u{1F1FA}\u{1F1F8} English",
        "settings.typography_title": "Typography",
        "settings.typography_desc": "Adjust document reading experience",
        "settings.font_label": "\u{1F524} Body Font",
        "settings.font_desc": "Select or enter the display font for Markdown body text",
        "settings.code_font_label": "\u{1F4BB} Code Font",
        "settings.code_font_desc": "Select or enter the display font for code blocks",
        "settings.font_size_label": "\u{1F520} Font Size",
        "settings.font_size_desc": "Adjust body font size (12px - 24px)",
        "settings.line_height_label": "\u2195\uFE0F Line Height",
        "settings.line_height_desc": "Adjust paragraph line height (1.2 - 2.4)",
        "settings.max_width_label": "\u2194\uFE0F Max Content Width",
        "settings.max_width_desc": "Adjust maximum content area width (600px - 1800px)",
        "settings.font_system": "System Default",
        "settings.font_sans": "Sans-serif",
        "settings.font_msyh": "Microsoft YaHei",
        "settings.font_pingfang": "PingFang SC",
        "settings.font_noto_sans": "Noto Sans SC",
        "settings.font_serif": "Serif",
        "settings.font_serif_generic": "Serif (Generic)",
        "settings.font_simsun": "SimSun",
        "settings.font_noto_serif": "Noto Serif SC",
        "settings.font_other": "Other",
        "settings.font_custom": "Custom...",
        "settings.font_custom_placeholder": "Enter font name, e.g. 'LXGW WenKai'",
        "settings.code_font_default": "Default Monospace",
        "settings.code_font_mono": "Monospace Fonts",
        "settings.code_font_custom_placeholder": "Enter font name, e.g. 'Hack'",
        "settings.slider_compact": "Compact",
        "settings.slider_loose": "Loose",
        "settings.slider_narrow": "Narrow",
        "settings.slider_wide": "Wide",
        "settings.preview_label": "\u{1F441} Typography Preview",
        "settings.preview_desc": "Live preview of typography settings",
        "settings.preview_text": "This is preview text to demonstrate the current typography settings. The quick brown fox jumps over the lazy dog.",
        "settings.preview_text2": "Supports rendering <code>Mermaid</code> charts and code highlighting for an enhanced Markdown reading experience.",
        "settings.code_theme_title": "Code Highlight Theme",
        "settings.code_theme_desc": "Choose the color scheme for code blocks",
        "settings.code_theme_label": "Code Highlight Theme",
        "settings.code_theme_label_desc": "Choose the color scheme for code blocks",
        "settings.code_theme_light": "\u{1F506} Light Themes",
        "settings.code_theme_dark": "\u{1F319} Dark Themes",
        "settings.function_title": "Features",
        "settings.function_desc": "Enable or disable tool features",
        "settings.show_toc": "Show Table of Contents",
        "settings.show_toc_desc": "Show TOC panel by default",
        "settings.show_annotations": "Show Annotations",
        "settings.show_annotations_desc": "Show annotations panel by default",
        "settings.sidebar_label": "Sidebar Position",
        "settings.sidebar_desc": "Adjust the layout of TOC and annotation panels",
        "settings.sidebar_toc_left": "TOC Left, Annotations Right",
        "settings.sidebar_toc_right": "Annotations Left, TOC Right",
        "settings.panel_mode_label": "Panel Mode",
        "settings.panel_mode_desc": "Choose the sidebar panel display mode",
        "settings.panel_floating": "Floating",
        "settings.panel_embedded": "Embedded",
        "settings.doc_align_label": "Document Alignment",
        "settings.doc_align_desc": "Set the alignment of the main document",
        "settings.doc_align_left": "Left",
        "settings.doc_align_center": "Center",
        "settings.doc_align_right": "Right",
        "settings.math_label": "Math Rendering",
        "settings.math_desc": "Enable LaTeX math formula rendering",
        "settings.mermaid_label": "Mermaid Charts",
        "settings.mermaid_desc": "Enable Mermaid diagram rendering",
        "settings.plantuml_label": "PlantUML Charts",
        "settings.plantuml_desc": "Enable PlantUML rendering (requires network)",
        "settings.graphviz_label": "Graphviz Charts",
        "settings.graphviz_desc": "Enable Graphviz DOT diagram rendering",
        "settings.line_numbers_label": "Show Line Numbers",
        "settings.line_numbers_desc": "Display line numbers in code blocks",
        "settings.auto_save_label": "Auto-save Annotations",
        "settings.auto_save_desc": "Automatically save annotations after changes",
        "settings.auto_save_delay_label": "Auto-save Delay",
        "settings.auto_save_delay_desc": "Delay before auto-saving after changes",
        "settings.footer_hint": "\u{1F4A1} Settings are saved automatically",
        "settings.reset": "Reset Defaults",
        "settings.saved_toast": "\u2705 Settings saved",
        // ===== Notifications =====
        "notification.load_error": "\u274C Failed to load file: {error}",
        "notification.unsaved": "\u25CF Unsaved",
        "notification.restored": "\u{1F4C2} Restored {count} annotations from .review",
        "notification.stale_content_bumped": "\u26A0\uFE0F Source file was modified while closed; legacy annotations archived, new review version v{version} created",
        "notification.load_failed": "Failed to load file",
        "notification.file_updated_new_version": "File updated, new review version created",
        "notification.file_reloaded": "File reloaded",
        "notification.refresh_failed": "Refresh failed: {error}",
        "notification.copied": "\u2705 Copied",
        "notification.copy": "\u{1F4CB} Copy",
        "notification.click_to_enlarge": "Click to enlarge",
        "notification.no_annotations": "No annotations",
        "notification.updating": "Updating...",
        "notification.update_failed": "\u274C Update failed: {error}",
        "notification.request_failed": "\u274C Request failed: {error}",
        "notification.no_file": "Please open a MD file first",
        "notification.no_open_file": "No file is open",
        "notification.edit_mode": "Edit mode",
        "notification.saved": "\u2713 Saved",
        "notification.saving": "\u23F3 Saving...",
        "notification.save_failed": "Save failed",
        "notification.export_empty": "No annotations to export",
        "notification.export_saved": "Saved to .review directory: {name}",
        "notification.export_failed": "Export failed, please check workspace settings",
        "notification.auto_saved": "\u2713 Auto-saved",
        "notification.auto_save_failed": "\u2717 Save failed",
        "notification.request_timeout": "Request timeout: {type}",
        // ===== Float Buttons =====
        "float.comment": "\u{1F4AC} Comment",
        "float.delete": "\u{1F5D1}\uFE0F Delete",
        "float.insert_after": "\u2795 After",
        "float.insert_before": "\u2B06\uFE0F Before",
        // ===== Annotation Cards =====
        "annotation.type_comment": "Comment",
        "annotation.type_delete": "Delete",
        "annotation.type_insert_before": "Before",
        "annotation.type_insert_after": "After",
        "annotation.insert_before_label": "\u{1F4CD} Insert before:",
        "annotation.insert_after_label": "\u{1F4CD} Insert after:",
        "annotation.edit": "Edit",
        "annotation.block_index": "Block {index}",
        "annotation.image_alt": "Image",
        "annotation.preview_alt": "Preview {index}",
        // ===== AI Fix =====
        "ai.summary_total": '\u{1F4DD} Total <span class="stat-count">{count}</span> annotations',
        "ai.summary_delete": '\u{1F5D1}\uFE0F Delete operations: <span class="stat-count">{count}</span>',
        "ai.summary_insert": '\u2795 Insert operations: <span class="stat-count">{count}</span>',
        "ai.summary_comment": '\u{1F4AC} Comment operations: <span class="stat-count">{count}</span>',
        "ai.result_success": "\u2705 AI instructions generated",
        "ai.result_count": "{count} instructions generated",
        "ai.result_source": "\u{1F4C4} Source file:",
        "ai.result_instruction": "\u{1F4DD} Instruction file:",
        "ai.result_empty": "\u26A0\uFE0F No valid instructions",
        "ai.copy_instruction": "Please modify the source file according to the review instruction file.\n\nSource file path: {source}\nReview instruction file: {instruction}\n\nPlease read the review instruction file first to understand the required changes, then apply each instruction sequentially.",
        "ai.btn_copied": "\u2705 Copied",
        "ai.btn_copy": "\u{1F4CB} Copy Instructions",
        "ai.chat_success_codebuddy": "\u2705 New AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.",
        "ai.chat_success_vscode": "\u2705 AI chat opened. Instructions copied to clipboard. Press Ctrl+V to paste and send.",
        "ai.chat_fallback": "\u2705 AI instructions copied to clipboard. Please open AI chat manually and paste.",
        "ai.chat_error": "\u274C Operation failed: {error}",
        // ===== Lightbox =====
        "lightbox.zoom_out": "Zoom out (-)",
        "lightbox.zoom_in": "Zoom in (+)",
        "lightbox.zoom_fit": "Fit window (0)",
        "lightbox.zoom_reset": "Reset (R)",
        "lightbox.hint": "Scroll to zoom \xB7 Drag to move \xB7 +/-/0 shortcuts \xB7 ESC to close",
        // ===== Renderer =====
        "renderer.copy_code": "\u{1F4CB} Copy",
        "renderer.image_load_failed": "\u{1F5BC}\uFE0F Image failed to load: {alt}",
        "renderer.image_loading": "\u{1F5BC}\uFE0F Loading image: {name}",
        "renderer.alert_note": "Note",
        "renderer.alert_tip": "Tip",
        "renderer.alert_important": "Important",
        "renderer.alert_warning": "Warning",
        "renderer.alert_caution": "Caution",
        "renderer.insert_before_text": "Insert before",
        "renderer.insert_after_text": "Insert content",
        "renderer.mermaid_error": "Mermaid chart rendering failed",
        "renderer.math_error": "Formula rendering failed: {error}",
        "renderer.plantuml_too_long": "Chart source code too long ({length} chars), cannot render online",
        "renderer.plantuml_error": "PlantUML rendering failed (please check network connection)",
        "renderer.graphviz_error": "Graphviz rendering failed: {error}",
        // ===== Export =====
        "export.title": "Review Record",
        "export.source_file": "Source File",
        "export.source_path": "Source File Path",
        "export.source_version": "Source File Version",
        "export.review_time": "Review Time",
        "export.review_version": "Review Version",
        "export.annotation_count": "Annotation Count",
        "export.type_comment": "Comments",
        "export.type_delete": "Deletions",
        "export.type_insert_after": "Insert After",
        "export.type_insert_before": "Insert Before",
        "export.section_instructions": "Instructions",
        "export.instruction_order_hint": "Instructions are listed in **reverse order** (bottom-up). Please execute them strictly from top to bottom.",
        "export.instruction_anchor_hint": 'Each instruction provides a "Text Anchor" for precise positioning. Please match the anchor text first; blockIndex is for reference only.',
        "export.instruction_num": "Instruction {num}",
        "export.label_modify": " (Modify)",
        "export.label_delete": " (Delete)",
        "export.label_insert_before": " (Insert Before)",
        "export.label_insert_after": " (Insert After)",
        "export.op_modify": "Modify content according to comment",
        "export.op_delete": "Delete the following text",
        "export.op_insert_before": "Insert new content before the specified position",
        "export.op_insert_after": "Insert new content after the specified position",
        "export.field_operation": "Operation",
        "export.field_block": "Block",
        "export.field_block_value": "Block {n}",
        "export.field_anchor": "Text Anchor",
        "export.field_offset": "Block Offset",
        "export.field_offset_value": "At character {n} (startOffset={n})",
        "export.field_target_text": "Target Text",
        "export.field_comment": "Comment",
        "export.field_images": "Images",
        "export.field_images_count": "{count} image(s)",
        "export.field_image_n": "Image {n}:",
        "export.field_delete_text": "Text to Delete",
        "export.field_insert_position_before": "Insert Position (before this text)",
        "export.field_insert_position_after": "Insert Position (after this text)",
        "export.field_insert_content": "Content to Insert",
        "export.field_insert_reason": "Insert Reason",
        "export.section_json": "Raw Data (JSON)",
        "export.json_hint": "For precise operations, use the JSON data below. `blockIndex` is the blank-line-delimited block index (0-based), and `startOffset` is the character offset within the block (0-based), useful for distinguishing duplicate text in the same block.",
        "export.unknown": "Unknown",
        "export.unit_count": "{n}",
        "export.image_note": "**Note**: Annotations contain image attachments. Image files are stored in the images subdirectory of the .review directory.",
        "export.base64_note": "**Note**: Some annotations contain Base64 image data. Complete image data has been exported as a JSON file as well.",
        "export.ai_generated": "{count} instructions generated for AI modification",
        "export.no_valid": "No valid instructions",
        // ===== CSS =====
        "css.placeholder_edit": "Click here to enter content...",
        // ===== Extension Host =====
        "ext.file_not_found": "File not found: {path}",
        "ext.invalid_image": "Invalid image data format",
        // ===== Theme Button =====
        "theme.light": "Light",
        "theme.dark": "Dark"
      }
    };
    function t3(key, params) {
      const dict = _dict[_locale] || _dict["zh-CN"];
      let text = dict[key];
      if (text === void 0) {
        text = _dict["zh-CN"][key];
      }
      if (text === void 0) {
        return key;
      }
      if (params) {
        Object.keys(params).forEach((k) => {
          text = text.replace(new RegExp("\\{" + k + "\\}", "g"), params[k]);
        });
      }
      return text;
    }
    function setLocale(locale) {
      if (_dict[locale]) {
        _locale = locale;
        applyToDOM();
      }
    }
    function getLocale() {
      return _locale;
    }
    function applyToDOM() {
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key) {
          if (el.tagName === "OPTGROUP") {
            el.label = t3(key);
          } else {
            el.textContent = t3(key);
          }
        }
      });
      document.querySelectorAll("[data-i18n-html]").forEach((el) => {
        const key = el.getAttribute("data-i18n-html");
        if (key) {
          el.innerHTML = t3(key);
        }
      });
      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (key) {
          el.title = t3(key);
        }
      });
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (key) {
          el.placeholder = t3(key);
        }
      });
      document.documentElement.style.setProperty("--i18n-placeholder-edit", JSON.stringify(t3("css.placeholder_edit")));
      const helpEl = document.getElementById("helpContent");
      if (helpEl) {
        helpEl.innerHTML = _buildHelpHTML();
      }
    }
    function _buildHelpHTML() {
      const _t = t3;
      return `
<section class="help-section">
    <h4>${_t("help.quick_start_title")}</h4>
    <p>${_t("help.quick_start_intro")}</p>
    <ul>
        <li>${_t("help.quick_start_command")}</li>
        <li>${_t("help.quick_start_context")}</li>
        <li>${_t("help.quick_start_titlebar")}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t("help.comment_title")}</h4>
    <ol>
        <li>${_t("help.comment_1")}</li>
        <li>${_t("help.comment_2")}</li>
        <li>${_t("help.comment_3")}</li>
        <li>${_t("help.comment_4")}</li>
    </ol>
    <p class="help-hint">${_t("help.comment_hint")}</p>
</section>
<section class="help-section">
    <h4>${_t("help.delete_title")}</h4>
    <ol>
        <li>${_t("help.delete_1")}</li>
        <li>${_t("help.delete_2")}</li>
    </ol>
    <p class="help-hint">${_t("help.delete_hint")}</p>
</section>
<section class="help-section">
    <h4>${_t("help.insert_title")}</h4>
    <ol>
        <li>${_t("help.insert_1")}</li>
        <li>${_t("help.insert_2")}</li>
        <li>${_t("help.insert_3")}</li>
    </ol>
</section>
<section class="help-section">
    <h4>${_t("help.edit_title")}</h4>
    <ol>
        <li>${_t("help.edit_1")}</li>
        <li>${_t("help.edit_2")}</li>
        <li>${_t("help.edit_3")}</li>
        <li>${_t("help.edit_4")}</li>
        <li>${_t("help.edit_5")}</li>
    </ol>
</section>
<section class="help-section">
    <h4>${_t("help.search_title")}</h4>
    <ul>
        <li>${_t("help.search_1")}</li>
        <li>${_t("help.search_2")}</li>
        <li>${_t("help.search_3")}</li>
        <li>${_t("help.search_4")}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t("help.ai_title")}</h4>
    <ol>
        <li>${_t("help.ai_1")}</li>
        <li>${_t("help.ai_2")}</li>
        <li>${_t("help.ai_3")}</li>
        <li>${_t("help.ai_4")}</li>
    </ol>
</section>
<section class="help-section">
    <h4>${_t("help.export_title")}</h4>
    <ul>
        <li>${_t("help.export_1")}</li>
        <li>${_t("help.export_2")}</li>
        <li>${_t("help.export_3")}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t("help.ui_title")}</h4>
    <ul>
        <li>${_t("help.ui_toc")}</li>
        <li>${_t("help.ui_annotations")}</li>
        <li>${_t("help.ui_lightbox")}</li>
        <li>${_t("help.ui_mermaid")}</li>
        <li>${_t("help.ui_plantuml")}</li>
        <li>${_t("help.ui_graphviz")}</li>
        <li>${_t("help.ui_search")}</li>
        <li>${_t("help.ui_multi_window")}</li>
        <li>${_t("help.ui_zen")}</li>
        <li>${_t("help.ui_theme")}</li>
        <li>${_t("help.ui_file_select")}</li>
        <li>${_t("help.ui_file_change")}</li>
        <li>${_t("help.ui_resize")}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t("help.tips_title")}</h4>
    <ul>
        <li>${_t("help.tips_reader")}</li>
        <li>${_t("help.tips_styles")}</li>
    </ul>
</section>
<section class="help-section">
    <h4>${_t("help.shortcut_title")}</h4>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 8px;"><kbd>Alt</kbd>+<kbd>Z</kbd></td><td style="padding:4px 8px;">${_t("help.shortcut_zen")}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>F</kbd></td><td style="padding:4px 8px;">${_t("help.shortcut_search")}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>E</kbd></td><td style="padding:4px 8px;">${_t("help.shortcut_export")}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td style="padding:4px 8px;">${_t("help.shortcut_save")}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd></td><td style="padding:4px 8px;">${_t("help.shortcut_mode")}</td></tr>
        <tr><td style="padding:4px 8px;"><kbd>ESC</kbd></td><td style="padding:4px 8px;">${_t("help.shortcut_esc")}</td></tr>
    </table>
</section>
<section class="help-section help-links">
    <div style="display:flex;align-items:center;justify-content:center;gap:24px;padding:4px 0;">
        <a href="https://github.com/LetitiaChan/md-review-tool" target="_blank" class="help-link-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 .5A7.5 7.5 0 0 0 5.63 15.13c.37.07.51-.16.51-.36v-1.24c-2.1.46-2.54-1.01-2.54-1.01a2 2 0 0 0-.84-1.1c-.69-.47.05-.46.05-.46a1.58 1.58 0 0 1 1.15.78 1.6 1.6 0 0 0 2.19.62 1.6 1.6 0 0 1 .48-1c-1.68-.19-3.44-.84-3.44-3.74a2.93 2.93 0 0 1 .78-2.03 2.72 2.72 0 0 1 .07-2s.64-.2 2.08.78a7.17 7.17 0 0 1 3.78 0c1.44-.99 2.08-.78 2.08-.78a2.72 2.72 0 0 1 .07 2 2.93 2.93 0 0 1 .78 2.03c0 2.91-1.77 3.55-3.45 3.74a1.8 1.8 0 0 1 .51 1.39v2.06c0 .2.14.44.52.36A7.5 7.5 0 0 0 8 .5z" fill="currentColor"/></svg>
            <span>GitHub</span>
        </a>
        <span style="color:var(--text-light);">\xB7</span>
        <a href="https://github.com/LetitiaChan/md-review-tool/issues" target="_blank" class="help-link-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 4.5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11" r="0.75" fill="currentColor"/></svg>
            <span>${_t("help.feedback")}</span>
        </a>
    </div>
</section>`;
    }
    return {
      t: t3,
      setLocale,
      getLocale,
      applyToDOM,
      // expose for Extension Host i18n dict access
      getDict: (locale) => _dict[locale] || _dict["zh-CN"]
    };
  })();
  var t2 = window.I18n.t;
  var I18n = window.I18n;

  // webview/js/store.js
  var Store2 = /* @__PURE__ */ (() => {
    const STORAGE_KEY = "md_review_data";
    let data = {
      fileName: "",
      rawMarkdown: "",
      fileHash: "",
      docVersion: "",
      sourceFilePath: "",
      sourceDir: "",
      relPath: "",
      pathHash: "",
      annotations: [],
      nextId: 1,
      reviewVersion: 1,
      createdAt: ""
    };
    function save() {
      try {
        vscode.setState({ [STORAGE_KEY]: data });
        vscode.postMessage({ type: "setState", payload: { key: STORAGE_KEY, value: data } });
      } catch (e) {
        console.warn("[Store] \u5B58\u50A8\u5931\u8D25:", e);
      }
      if (typeof Exporter !== "undefined" && Exporter.triggerAutoSave) {
        Exporter.triggerAutoSave();
      }
    }
    function load() {
      try {
        const state = vscode.getState();
        if (state && state[STORAGE_KEY]) {
          data = state[STORAGE_KEY];
          if (!data.fileHash) data.fileHash = "";
          if (!data.docVersion) data.docVersion = "";
          if (!data.sourceFilePath) data.sourceFilePath = "";
          if (!data.sourceDir) data.sourceDir = "";
          if (!data.relPath) data.relPath = "";
          if (!data.pathHash) data.pathHash = "";
          if (!data.reviewVersion) data.reviewVersion = 1;
          if (!data.createdAt) data.createdAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      } catch (e) {
        console.warn("\u8BFB\u53D6\u5B58\u50A8\u5931\u8D25:", e);
      }
      return data;
    }
    function loadFromHost() {
      return new Promise((resolve) => {
        const requestId = "state_load_" + Date.now();
        const handler = (event) => {
          const msg = event.data;
          if (msg.type === "stateValue" && msg.requestId === requestId) {
            window.removeEventListener("message", handler);
            if (msg.payload && msg.payload.value) {
              data = msg.payload.value;
              if (!data.fileHash) data.fileHash = "";
              if (!data.docVersion) data.docVersion = "";
              if (!data.sourceFilePath) data.sourceFilePath = "";
              if (!data.sourceDir) data.sourceDir = "";
              if (!data.relPath) data.relPath = "";
              if (!data.pathHash) data.pathHash = "";
              if (!data.reviewVersion) data.reviewVersion = 1;
              if (!data.createdAt) data.createdAt = (/* @__PURE__ */ new Date()).toISOString();
              vscode.setState({ [STORAGE_KEY]: data });
            }
            resolve(data);
          }
        };
        window.addEventListener("message", handler);
        vscode.postMessage({ type: "getState", payload: { key: STORAGE_KEY }, requestId });
        setTimeout(() => {
          window.removeEventListener("message", handler);
          resolve(data);
        }, 3e3);
      });
    }
    function reset() {
      data = {
        fileName: "",
        rawMarkdown: "",
        fileHash: "",
        docVersion: "",
        sourceFilePath: "",
        sourceDir: "",
        relPath: "",
        pathHash: "",
        annotations: [],
        nextId: 1,
        reviewVersion: 1,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      save();
    }
    function setFile(name, markdown, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash) {
      const sameFile = data.fileName === name;
      const hashChanged = sameFile && data.fileHash && fileHash && data.fileHash !== fileHash;
      const contentChanged = sameFile && !fileHash && data.rawMarkdown && markdown && data.rawMarkdown.trim() !== markdown.trim();
      if (hashChanged || contentChanged) {
        archiveCurrentRecord();
        data.rawMarkdown = markdown;
        data.fileHash = fileHash || "";
        data.docVersion = docVersion || "";
        data.sourceFilePath = sourceFilePath || data.sourceFilePath || "";
        data.sourceDir = sourceDir || data.sourceDir || "";
        data.relPath = relPath || data.relPath || "";
        data.pathHash = pathHash || data.pathHash || "";
        data.annotations = [];
        data.nextId = 1;
        data.reviewVersion = (data.reviewVersion || 1) + 1;
        data.createdAt = (/* @__PURE__ */ new Date()).toISOString();
      } else if (data.fileName !== name) {
        data.fileName = name;
        data.rawMarkdown = markdown;
        data.fileHash = fileHash || "";
        data.docVersion = docVersion || "";
        data.sourceFilePath = sourceFilePath || "";
        data.sourceDir = sourceDir || "";
        data.relPath = relPath || "";
        data.pathHash = pathHash || "";
        data.annotations = [];
        data.nextId = 1;
        data.reviewVersion = 1;
        data.createdAt = (/* @__PURE__ */ new Date()).toISOString();
      } else {
        data.rawMarkdown = markdown;
        if (fileHash) data.fileHash = fileHash;
        if (docVersion) data.docVersion = docVersion;
        if (sourceFilePath) data.sourceFilePath = sourceFilePath;
        if (sourceDir) data.sourceDir = sourceDir;
        if (relPath) data.relPath = relPath;
        if (pathHash) data.pathHash = pathHash;
      }
      save();
    }
    function archiveCurrentRecord() {
    }
    function getArchivedRecords(fileName) {
      return [];
    }
    function addAnnotation(annotation) {
      annotation.id = data.nextId++;
      annotation.timestamp = (/* @__PURE__ */ new Date()).toISOString();
      data.annotations.push(annotation);
      data.annotations.sort((a, b) => {
        if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
        return a.startOffset - b.startOffset;
      });
      save();
      return annotation;
    }
    function removeAnnotation(id) {
      data.annotations = data.annotations.filter((a) => a.id !== id);
      data.annotations.forEach((a, i) => {
        a.id = i + 1;
      });
      data.nextId = data.annotations.length + 1;
      save();
    }
    function updateAnnotation(id, updates) {
      const idx = data.annotations.findIndex((a) => a.id === id);
      if (idx >= 0) {
        Object.assign(data.annotations[idx], updates);
        save();
      }
    }
    function getAnnotations() {
      return data.annotations;
    }
    function getAnnotationsForBlock(blockIndex) {
      return data.annotations.filter((a) => a.blockIndex === blockIndex);
    }
    function getData() {
      return data;
    }
    function clearAll() {
      data.annotations = [];
      data.nextId = 1;
      save();
    }
    function getFileHash() {
      return data.fileHash;
    }
    function setFileHash(hash) {
      data.fileHash = hash;
      save();
    }
    function getDocVersion() {
      return data.docVersion || "";
    }
    function setDocVersion(version) {
      data.docVersion = version || "";
      save();
    }
    function getSourceFilePath() {
      return data.sourceFilePath || "";
    }
    function getSourceDir() {
      return data.sourceDir || "";
    }
    function getRelPath() {
      return data.relPath || "";
    }
    function restoreFromReviewRecord(record, fileName, markdown, docVersion) {
      data.fileName = fileName;
      data.rawMarkdown = markdown;
      data.docVersion = docVersion || "";
      data.reviewVersion = record.reviewVersion || 1;
      data.createdAt = record.createdAt || (/* @__PURE__ */ new Date()).toISOString();
      if (record.annotations && record.annotations.length > 0) {
        data.annotations = record.annotations;
        data.nextId = Math.max(...record.annotations.map((a) => a.id || 0)) + 1;
      } else {
        data.annotations = [];
        data.nextId = 1;
      }
      save();
      console.log("[Store] \u4ECE .review \u6062\u590D\u6279\u9605\u8BB0\u5F55:", fileName, "\u8BC4\u5BA1\u7248\u672C:", data.reviewVersion, "\u6279\u6CE8\u6570:", data.annotations.length);
    }
    function forceBumpVersion(fromVersion, markdown, docVersion) {
      data.reviewVersion = (fromVersion || 1) + 1;
      data.rawMarkdown = markdown;
      if (docVersion) data.docVersion = docVersion;
      data.annotations = [];
      data.nextId = 1;
      data.createdAt = (/* @__PURE__ */ new Date()).toISOString();
      save();
      console.log("[Store] \u5173\u95ED\u671F\u95F4\u6E90\u6587\u4EF6\u53D8\u5316\uFF0C\u5F3A\u5236\u5347\u7EA7\u5230 v" + data.reviewVersion);
    }
    function setRawMarkdown(markdown) {
      if (typeof markdown !== "string") return;
      data.rawMarkdown = markdown;
    }
    return {
      save,
      load,
      loadFromHost,
      reset,
      setFile,
      addAnnotation,
      removeAnnotation,
      updateAnnotation,
      getAnnotations,
      getAnnotationsForBlock,
      getData,
      clearAll,
      getFileHash,
      setFileHash,
      getDocVersion,
      setDocVersion,
      getSourceFilePath,
      getSourceDir,
      getRelPath,
      archiveCurrentRecord,
      getArchivedRecords,
      restoreFromReviewRecord,
      forceBumpVersion,
      setRawMarkdown
    };
  })();

  // webview/js/renderer.js
  var Renderer2 = /* @__PURE__ */ (() => {
    let _imageUriCache = {};
    let _mermaidCounter = 0;
    let _mermaidInitialized = false;
    const MATH_PLACEHOLDER_PREFIX = "%%MATH_EXPR_";
    const MATH_PLACEHOLDER_SUFFIX = "%%";
    let _mathExpressions = [];
    let _refLinkDefs = [];
    let _footnoteDefs = [];
    let _rawBlocksBeforeExtract = [];
    let _orphanedDefBlocks = [];
    let _inlineExtractedDefs = [];
    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function parseMarkdown(markdown) {
      let processedMarkdown = markdown;
      const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      let frontmatterBlock = null;
      if (frontmatterMatch) {
        frontmatterBlock = frontmatterMatch[0].trimEnd();
        processedMarkdown = markdown.slice(frontmatterMatch[0].length);
      }
      const lines = processedMarkdown.split("\n");
      const blocks = [];
      let current = [];
      let inCodeBlock = false;
      let inHtmlBlock = false;
      let htmlBlockTag = "";
      let htmlBlockDepth = 0;
      let inList = false;
      let inListCodeBlock = false;
      let codeBlockFenceCount = 0;
      let listCodeBlockFenceCount = 0;
      let inBlockquote = false;
      let inFootnote = false;
      const listItemRegex = /^(\s*)([-*+]|\d+[.)]) /;
      const listContinuationRegex = /^([ ]{2,}|\t)/;
      const blockquoteListRegex = /^>\s*([-*+]|\d+[.)]) /;
      const blockquoteLineRegex = /^\s{0,3}>/;
      const footnoteDefLineRegex = /^\s{0,3}\[\^([^\]\n]+)\]:\s*/;
      if (frontmatterBlock) {
        blocks.push("%%FRONTMATTER%%\n" + frontmatterBlock);
      }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (inBlockquote) {
          if (blockquoteLineRegex.test(line)) {
            current.push(line);
            continue;
          } else if (line.trim() === "") {
            let nextNonEmpty = -1;
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].trim() !== "") {
                nextNonEmpty = j;
                break;
              }
            }
            if (nextNonEmpty !== -1 && blockquoteLineRegex.test(lines[nextNonEmpty])) {
              current.push(line);
            } else {
              if (current.length > 0) {
                blocks.push(current.join("\n"));
                current = [];
              }
              inBlockquote = false;
            }
            continue;
          } else {
            inBlockquote = false;
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
          }
        }
        if (inFootnote && line.trim() !== "") {
          if (/^(?:[ ]{4}|\t)/.test(line)) {
            current.push(line);
            continue;
          } else {
            inFootnote = false;
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
          }
        }
        const fenceMatch = !inHtmlBlock && line.trim().match(/^(`{3,})/);
        if (fenceMatch) {
          const fenceCount = fenceMatch[1].length;
          const isIndentedFence = /^\s+`/.test(line);
          if (inListCodeBlock) {
            if (fenceCount >= listCodeBlockFenceCount && line.trim().match(/^`{3,}\s*$/)) {
              current.push(line);
              inListCodeBlock = false;
              listCodeBlockFenceCount = 0;
            } else {
              current.push(line);
            }
            continue;
          }
          if (inList && isIndentedFence) {
            current.push(line);
            inListCodeBlock = true;
            listCodeBlockFenceCount = fenceCount;
            continue;
          }
          if (inCodeBlock) {
            if (fenceCount >= codeBlockFenceCount && line.trim().match(/^`{3,}\s*$/)) {
              current.push(line);
              blocks.push(current.join("\n"));
              current = [];
              inCodeBlock = false;
              codeBlockFenceCount = 0;
              inList = false;
            } else {
              current.push(line);
            }
            continue;
          } else {
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
            inCodeBlock = true;
            codeBlockFenceCount = fenceCount;
            inList = false;
            current.push(line);
            continue;
          }
        }
        if (inCodeBlock) {
          current.push(line);
          continue;
        }
        if (inListCodeBlock) {
          current.push(line);
          continue;
        }
        if (!inHtmlBlock) {
          const htmlBlockMatch = /^\s*<(details|div)[\s>]/i.exec(line);
          if (htmlBlockMatch) {
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
            inHtmlBlock = true;
            inList = false;
            htmlBlockTag = htmlBlockMatch[1].toLowerCase();
            htmlBlockDepth = 1;
            current.push(line);
            const openCount = (line.match(new RegExp(`<${htmlBlockTag}[\\s>]`, "gi")) || []).length;
            const closeCount = (line.match(new RegExp(`</${htmlBlockTag}\\s*>`, "gi")) || []).length;
            htmlBlockDepth = openCount - closeCount;
            if (htmlBlockDepth <= 0) {
              blocks.push(current.join("\n"));
              current = [];
              inHtmlBlock = false;
              htmlBlockTag = "";
              htmlBlockDepth = 0;
            }
            continue;
          }
        }
        if (inHtmlBlock) {
          current.push(line);
          const openCount = (line.match(new RegExp(`<${htmlBlockTag}[\\s>]`, "gi")) || []).length;
          const closeCount = (line.match(new RegExp(`</${htmlBlockTag}\\s*>`, "gi")) || []).length;
          htmlBlockDepth += openCount - closeCount;
          if (htmlBlockDepth <= 0) {
            blocks.push(current.join("\n"));
            current = [];
            inHtmlBlock = false;
            htmlBlockTag = "";
            htmlBlockDepth = 0;
          }
          continue;
        }
        if (line.trim() === "") {
          if (inFootnote) {
            let nextNonEmpty = -1;
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].trim() !== "") {
                nextNonEmpty = j;
                break;
              }
            }
            if (nextNonEmpty !== -1 && /^(?:[ ]{4}|\t)/.test(lines[nextNonEmpty])) {
              current.push(line);
            } else {
              if (current.length > 0) {
                blocks.push(current.join("\n"));
                current = [];
              }
              inFootnote = false;
            }
          } else if (inList) {
            let nextNonEmpty = -1;
            for (let j = i + 1; j < lines.length; j++) {
              if (lines[j].trim() !== "") {
                nextNonEmpty = j;
                break;
              }
            }
            if (nextNonEmpty !== -1 && (listContinuationRegex.test(lines[nextNonEmpty]) || listItemRegex.test(lines[nextNonEmpty]))) {
              current.push(line);
            } else {
              if (current.length > 0) {
                blocks.push(current.join("\n"));
                current = [];
              }
              inList = false;
            }
          } else {
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
          }
        } else {
          if (!inList && !inBlockquote && !inFootnote && footnoteDefLineRegex.test(line)) {
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
            inFootnote = true;
            current.push(line);
          } else if (!inList && !inBlockquote && blockquoteLineRegex.test(line)) {
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
            inBlockquote = true;
            inList = false;
            current.push(line);
          } else if (!inList && !inBlockquote && (listItemRegex.test(line) || blockquoteListRegex.test(line))) {
            if (current.length > 0) {
              blocks.push(current.join("\n"));
              current = [];
            }
            inList = true;
            current.push(line);
          } else {
            current.push(line);
          }
        }
      }
      if (current.length > 0) {
        blocks.push(current.join("\n"));
      }
      const refLinkDefRegex = /^\s{0,3}\[([^\]]+)\]:\s+(.+?)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/;
      const footnoteDefStartRegex = /^\s{0,3}\[\^([^\]\n]+)\]:\s*/;
      _refLinkDefs = [];
      _footnoteDefs = [];
      const rawBlocksCopy = blocks.map((b) => b);
      for (let b = 0; b < blocks.length; b++) {
        const blockLines = blocks[b].split("\n");
        const remaining = [];
        let i = 0;
        while (i < blockLines.length) {
          const line = blockLines[i];
          if (footnoteDefStartRegex.test(line)) {
            const fnLines = [line];
            i++;
            while (i < blockLines.length) {
              if (/^(?:[ ]{4}|\t)/.test(blockLines[i])) {
                fnLines.push(blockLines[i]);
                i++;
              } else if (blockLines[i].trim() === "") {
                let nextNonEmpty = -1;
                for (let j = i + 1; j < blockLines.length; j++) {
                  if (blockLines[j].trim() !== "") {
                    nextNonEmpty = j;
                    break;
                  }
                }
                if (nextNonEmpty !== -1 && /^(?:[ ]{4}|\t)/.test(blockLines[nextNonEmpty])) {
                  fnLines.push(blockLines[i]);
                  i++;
                } else {
                  break;
                }
              } else {
                break;
              }
            }
            _footnoteDefs.push(fnLines.join("\n"));
          } else {
            const m = refLinkDefRegex.exec(line);
            if (m) {
              _refLinkDefs.push(line.trim());
            } else {
              remaining.push(line);
            }
            i++;
          }
        }
        const cleaned = remaining.join("\n").trim();
        blocks[b] = cleaned;
      }
      const finalBlocks = [];
      _rawBlocksBeforeExtract = [];
      _orphanedDefBlocks = [];
      _inlineExtractedDefs = [];
      let pendingOrphans = [];
      for (let b = 0; b < blocks.length; b++) {
        if (blocks[b].length > 0) {
          const currentFinalIndex = finalBlocks.length;
          for (const orphan of pendingOrphans) {
            _orphanedDefBlocks.push({ insertBeforeIndex: currentFinalIndex, rawText: orphan });
          }
          pendingOrphans = [];
          finalBlocks.push(blocks[b]);
          _rawBlocksBeforeExtract.push(rawBlocksCopy[b]);
          const rawLines = rawBlocksCopy[b].split("\n");
          const cleanedLines = new Set(blocks[b].split("\n").map((l) => l.trimEnd()));
          const extractedLines = rawLines.filter((line) => !cleanedLines.has(line.trimEnd()));
          _inlineExtractedDefs.push(extractedLines);
        } else {
          pendingOrphans.push(rawBlocksCopy[b]);
        }
      }
      for (const orphan of pendingOrphans) {
        _orphanedDefBlocks.push({ insertBeforeIndex: finalBlocks.length, rawText: orphan });
      }
      return finalBlocks;
    }
    function preprocessMath(md) {
      let result = md;
      const codeBlocks = [];
      result = result.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
        const index = codeBlocks.length;
        codeBlocks.push(match);
        return `%%CODE_BLOCK_${index}%%`;
      });
      result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        const index = _mathExpressions.length;
        _mathExpressions.push({ formula: formula.trim(), displayMode: true });
        return `

${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}

`;
      });
      result = result.replace(/(?<!\$|\\)\$(?!\$)(.+?)(?<!\$|\\)\$(?!\$)/g, (match, formula) => {
        if (/^\d/.test(formula.trim()) && /\d$/.test(formula.trim()) && !/[\\{}^_]/.test(formula)) {
          return match;
        }
        const index = _mathExpressions.length;
        _mathExpressions.push({ formula: formula.trim(), displayMode: false });
        return `${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}`;
      });
      result = result.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => {
        return codeBlocks[parseInt(index)];
      });
      return result;
    }
    function preprocessMarkdown(md) {
      md = md.replace(/\r/g, "");
      md = md.replace(
        /\{color:([\w#]+(?:\([\d,.\s%]+\))?)\}([\s\S]*?)\{\/color\}/g,
        '<span style="color:$1">$2</span>'
      );
      const lines = md.split("\n");
      const result = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
        if (/^(>{1,})\s+\S/.test(line) && nextLine !== null && /^(>{1,})\s+\S/.test(nextLine)) {
          const curLevel = line.match(/^(>{1,})/)[1].length;
          const nextLevel = nextLine.match(/^(>{1,})/)[1].length;
          if (curLevel === nextLevel && !line.endsWith("  ")) {
            result.push(line + "  ");
            continue;
          }
        }
        result.push(line);
      }
      md = result.join("\n");
      return md;
    }
    function postprocessHTML(html, rawBlock) {
      html = html.replace(/<section class="footnotes"[\s\S]*?<\/section>\s*/g, "");
      return html;
    }
    function configureHighlight() {
      if (typeof marked === "undefined") return;
      const renderer = new marked.Renderer();
      renderer.code = function(data) {
        const code = data.text || "";
        const lang = (data.lang || "").trim().toLowerCase();
        if (lang === "mermaid") {
          const id = "mermaid-" + ++_mermaidCounter;
          const base64Code = btoa(unescape(encodeURIComponent(code)));
          return `<div class="mermaid-container" data-mermaid-id="${id}"><div class="mermaid-source-data" data-source="${base64Code}" style="display:none"></div><pre class="mermaid-source">${escapeHtml(code)}</pre></div>`;
        }
        if (lang === "plantuml" || lang === "puml") {
          const base64Code = btoa(unescape(encodeURIComponent(code)));
          return `<div class="plantuml-container"><div class="plantuml-source-data" data-source="${base64Code}" style="display:none"></div><pre class="plantuml-source">${escapeHtml(code)}</pre></div>`;
        }
        if (lang === "dot" || lang === "graphviz") {
          const base64Code = btoa(unescape(encodeURIComponent(code)));
          return `<div class="graphviz-container"><div class="graphviz-source-data" data-source="${base64Code}" style="display:none"></div><pre class="graphviz-source">${escapeHtml(code)}</pre></div>`;
        }
        function wrapLines(highlightedCode, language) {
          const lines = highlightedCode.split("\n");
          while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
          const isDiff = language === "diff";
          let openSpans = [];
          return lines.map((line, i) => {
            let lineClass = "code-line";
            if (isDiff) {
              if (line.includes("hljs-addition")) {
                lineClass += " diff-addition";
              } else if (line.includes("hljs-deletion")) {
                lineClass += " diff-deletion";
              } else {
                const plainText = line.replace(/<[^>]*>/g, "");
                if (plainText.startsWith("+")) lineClass += " diff-addition";
                else if (plainText.startsWith("-")) lineClass += " diff-deletion";
              }
            }
            const reopenTags = openSpans.join("");
            const tagRegex = /<span[^>]*>|<\/span>/g;
            let match;
            while ((match = tagRegex.exec(line)) !== null) {
              if (match[0].startsWith("</")) {
                openSpans.pop();
              } else {
                openSpans.push(match[0]);
              }
            }
            const closeTags = "</span>".repeat(openSpans.length);
            const content = reopenTags + line || " ";
            return `<span class="${lineClass}" data-line="${i + 1}">${content}${closeTags}</span>`;
          }).join("\n");
        }
        let highlighted = "";
        const langLabel = lang || "code";
        if (typeof hljs !== "undefined") {
          if (lang && hljs.getLanguage(lang)) {
            try {
              highlighted = hljs.highlight(code, { language: lang }).value;
            } catch (e) {
            }
          }
          if (!highlighted) {
            try {
              highlighted = hljs.highlightAuto(code).value;
            } catch (e) {
            }
          }
        }
        if (highlighted) {
          const hasRunawayEmphasis = /<span class="hljs-(emphasis|strong)">[\s\S]*?\n\n[\s\S]*?<\/span>/.test(highlighted);
          highlighted = highlighted.replace(/<span class="hljs-emphasis">([\s\S]*?)<\/span>/g, "$1").replace(/<span class="hljs-strong">([\s\S]*?)<\/span>/g, "$1").replace(/<em class="hljs-emphasis">([\s\S]*?)<\/em>/g, "$1").replace(/<strong class="hljs-strong">([\s\S]*?)<\/strong>/g, "$1");
          highlighted = highlighted.replace(/<span class="hljs-quote">([\s\S]*?)<\/span>/g, function(match, inner) {
            return inner.includes("\n\n") ? inner : match;
          });
          if (hasRunawayEmphasis) {
            highlighted = highlighted.replace(/<span class="hljs-code">([\s\S]*?)<\/span>/g, "$1");
          } else {
            highlighted = highlighted.replace(/<span class="hljs-code">([\s\S]*?)<\/span>/g, function(match, inner) {
              return inner.includes("\n") ? inner : match;
            });
          }
          if (lang === "markdown" || lang === "md") {
            highlighted = highlighted.split("\n").map(function(line) {
              if (!/<span class="hljs-/.test(line)) {
                var m = line.match(/^(#{1,6}\s.*)$/);
                if (m) return '<span class="hljs-section">' + m[1] + "</span>";
                m = line.match(/^(\s*)([-*+])(\s.*)$/);
                if (m) return m[1] + '<span class="hljs-bullet">' + m[2] + "</span>" + m[3];
              }
              if (/^&gt;\s/.test(line) && !/^<span class="hljs-quote">/.test(line)) {
                return '<span class="hljs-quote">' + line + "</span>";
              }
              return line;
            }).join("\n");
          }
        }
        const codeContent = highlighted || escapeHtml(code);
        const hljsClass = highlighted ? ` hljs language-${langLabel}` : "";
        return `<div class="code-block" data-lang="${escapeHtml(lang)}"><div class="code-header"><span class="code-lang">${escapeHtml(langLabel)}</span><button class="code-copy-btn" title="${typeof t === "function" ? t("notification.copy") : "\u{1F4CB} \u590D\u5236"}">${typeof t === "function" ? t("renderer.copy_code") : "\u{1F4CB} \u590D\u5236"}</button></div><pre><code class="${hljsClass}">${wrapLines(codeContent, lang)}</code></pre></div>`;
      };
      renderer.heading = function(data) {
        const text = this.parser.parseInline(data.tokens);
        const depth = data.depth;
        const rawText = text.replace(/<[^>]*>/g, "").trim();
        const slug = rawText.toLowerCase().replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\s-]/g, "").replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
        return `<h${depth} id="${slug}">${text}</h${depth}>
`;
      };
      renderer.link = function(data) {
        const href = data.href || "";
        const title = data.title;
        let text = data.text || "";
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        const isExternal = href.startsWith("http://") || href.startsWith("https://");
        const isAnchor = href.startsWith("#");
        const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
        if (data.tokens && data.tokens.length > 0 && data.tokens[0].type === "image") {
          const img = data.tokens[0];
          const imgTitle = img.title ? ` title="${escapeHtml(img.title)}"` : "";
          text = `<img src="${img.href}" alt="${escapeHtml(img.text)}"${imgTitle} loading="lazy" class="md-image" />`;
        }
        if (!isExternal && !isAnchor && href) {
          return `<a href="${href}"${titleAttr} class="workspace-file-link" data-filepath="${escapeHtml(href)}" title="${escapeHtml(href)}">${text}</a>`;
        }
        return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
      };
      renderer.image = function(data) {
        const href = data.href || "";
        const title = data.title;
        const text = data.text || "";
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
        const safeAlt = escapeHtml(text).replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const errorHandler = `this.onerror=null;this.style.display='none';var p=document.createElement('div');p.className='img-placeholder';p.innerHTML='\u{1F5BC}\uFE0F \u56FE\u7247\u52A0\u8F7D\u5931\u8D25: ${safeAlt}';this.parentNode.insertBefore(p,this);var cap=this.parentNode.querySelector('.md-image-caption');if(cap)cap.style.display='';`;
        return `<span class="md-image-container"><img src="${href}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" class="md-image" onerror="${errorHandler}" />${text ? `<span class="md-image-caption" style="display:none">${escapeHtml(text)}</span>` : ""}</span>`;
      };
      renderer.table = function(data) {
        const header = data.header;
        const rows = data.rows;
        let headerHtml = "<thead><tr>";
        header.forEach((cell) => {
          const align = cell.align ? ` style="text-align:${cell.align}"` : "";
          const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text || "";
          headerHtml += `<th${align}>${content}</th>`;
        });
        headerHtml += "</tr></thead>";
        let bodyHtml = "<tbody>";
        rows.forEach((row) => {
          bodyHtml += "<tr>";
          row.forEach((cell) => {
            const align = cell.align ? ` style="text-align:${cell.align}"` : "";
            const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text || "";
            bodyHtml += `<td${align}>${content}</td>`;
          });
          bodyHtml += "</tr>";
        });
        bodyHtml += "</tbody>";
        return `<div class="table-wrapper"><table>${headerHtml}${bodyHtml}</table></div>`;
      };
      renderer.blockquote = function(data) {
        let inner = "";
        if (data.tokens) {
          inner = this.parser.parse(data.tokens);
        } else if (typeof data.text === "string") {
          inner = data.text;
        }
        const alertTypes = {
          "NOTE": { icon: "\u2139\uFE0F", label: typeof t === "function" ? t("renderer.alert_note") : "Note", cls: "alert-note" },
          "TIP": { icon: "\u{1F4A1}", label: typeof t === "function" ? t("renderer.alert_tip") : "Tip", cls: "alert-tip" },
          "IMPORTANT": { icon: "\u2757", label: typeof t === "function" ? t("renderer.alert_important") : "Important", cls: "alert-important" },
          "WARNING": { icon: "\u26A0\uFE0F", label: typeof t === "function" ? t("renderer.alert_warning") : "Warning", cls: "alert-warning" },
          "CAUTION": { icon: "\u{1F534}", label: typeof t === "function" ? t("renderer.alert_caution") : "Caution", cls: "alert-caution" }
        };
        const alertRegex = /^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
        const match = inner.match(alertRegex);
        if (match) {
          const type = match[1].toUpperCase();
          const info = alertTypes[type] || alertTypes["NOTE"];
          const content = inner.replace(alertRegex, "<p>");
          return `<div class="gh-alert ${info.cls}"><div class="gh-alert-title">${info.icon} ${info.label}</div><div class="gh-alert-content">${content}</div></div>`;
        }
        const blankRegex = /^\s*<p>\s*\[!BLANK\]\s*/i;
        const blankMatch = inner.match(blankRegex);
        if (blankMatch) {
          const content = inner.replace(blankRegex, "<p>");
          return `<div class="gh-alert alert-blank"><div class="gh-alert-content">${content}</div></div>`;
        }
        return `<blockquote>${inner}</blockquote>`;
      };
      renderer.listitem = function(data) {
        let text = this.parser.parse(data.tokens);
        if (!data.loose) {
          text = text.replace(/<p>([\s\S]*?)<\/p>\n?/g, "$1");
        }
        if (data.task) {
          const checkedClass = data.checked ? " checked" : "";
          const checkedAttr = data.checked ? " checked" : "";
          const checkIcon = data.checked ? '<svg class="task-check-icon" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>' : "";
          return `<li class="task-list-item${checkedClass}"><span class="task-checkbox${checkedClass}"><input type="checkbox"${checkedAttr} disabled />${checkIcon}</span><span class="task-text">${text}</span></li>`;
        }
        return `<li>${text}</li>`;
      };
      marked.setOptions({ renderer, gfm: true, breaks: false });
      if (typeof markedFootnote !== "undefined") {
        marked.use(markedFootnote({ prefixId: "fn-", description: "Footnotes" }));
      }
      marked.use({
        extensions: [
          // ==高亮文本== → <mark>高亮文本</mark>
          {
            name: "highlight",
            level: "inline",
            start(src) {
              return src.indexOf("==");
            },
            tokenizer(src) {
              const rule = /^==((?:[^=]|=[^=])+)==/;
              const match = rule.exec(src);
              if (match) {
                return {
                  type: "highlight",
                  raw: match[0],
                  text: match[1],
                  tokens: this.lexer.inlineTokens(match[1])
                };
              }
            },
            renderer(token) {
              return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
            }
          },
          // ^上标^ → <sup>上标</sup>
          {
            name: "superscript",
            level: "inline",
            start(src) {
              const idx = src.indexOf("^");
              if (idx === -1) return -1;
              if (idx > 0 && src[idx - 1] === "[") {
                const nextIdx = src.indexOf("^", idx + 1);
                return nextIdx === -1 ? -1 : nextIdx;
              }
              return idx;
            },
            tokenizer(src) {
              const rule = /^\^([^\s\^\[\]\n]{1,100})\^/;
              const match = rule.exec(src);
              if (match) {
                return {
                  type: "superscript",
                  raw: match[0],
                  text: match[1],
                  tokens: this.lexer.inlineTokens(match[1])
                };
              }
            },
            renderer(token) {
              return `<sup>${this.parser.parseInline(token.tokens)}</sup>`;
            }
          },
          // ~下标~ → <sub>下标</sub>
          {
            name: "subscript",
            level: "inline",
            start(src) {
              const match = src.match(/(?<![~])~(?!~)/);
              return match ? match.index : -1;
            },
            tokenizer(src) {
              const rule = /^~(?!~)([^\s~][^~]*?)~(?!~)/;
              const match = rule.exec(src);
              if (match) {
                return {
                  type: "subscript",
                  raw: match[0],
                  text: match[1],
                  tokens: this.lexer.inlineTokens(match[1])
                };
              }
            },
            renderer(token) {
              return `<sub>${this.parser.parseInline(token.tokens)}</sub>`;
            }
          },
          // ++下划线++ → <ins>下划线</ins>
          {
            name: "underline",
            level: "inline",
            start(src) {
              return src.indexOf("++");
            },
            tokenizer(src) {
              const rule = /^\+\+((?:[^+]|\+[^+])+)\+\+/;
              const match = rule.exec(src);
              if (match) {
                return {
                  type: "underline",
                  raw: match[0],
                  text: match[1],
                  tokens: this.lexer.inlineTokens(match[1])
                };
              }
            },
            renderer(token) {
              return `<ins>${this.parser.parseInline(token.tokens)}</ins>`;
            }
          },
          // 定义列表（PHP Markdown Extra 风格）Term\n: Definition
          {
            name: "deflist",
            level: "block",
            start(src) {
              const match = src.match(/^[^\n]+\n(?=:[ \t])/m);
              return match ? match.index : void 0;
            },
            tokenizer(src) {
              const rule = /^(?:[^\n]+\n(?::[ \t]+[^\n]+(?:\n|$))+(?:\n|$)?)+/;
              const match = rule.exec(src);
              if (match) {
                const raw = match[0];
                const items = [];
                const parts = raw.split(/\n(?=[^\n:])/).filter(Boolean);
                for (const part of parts) {
                  const lines = part.split("\n").filter(Boolean);
                  if (lines.length >= 1) {
                    const dt = lines[0].trim();
                    const dds = [];
                    for (let i = 1; i < lines.length; i++) {
                      const ddMatch = lines[i].match(/^:[ \t]+(.*)/);
                      if (ddMatch) dds.push(ddMatch[1].trim());
                    }
                    if (dds.length > 0) {
                      items.push({
                        dt,
                        dtTokens: this.lexer.inlineTokens(dt),
                        dds: dds.map((dd) => ({
                          text: dd,
                          tokens: this.lexer.inlineTokens(dd)
                        }))
                      });
                    }
                  }
                }
                if (items.length > 0) {
                  return { type: "deflist", raw, items };
                }
              }
            },
            renderer(token) {
              let html = "<dl>\n";
              for (const item of token.items) {
                html += `<dt>${this.parser.parseInline(item.dtTokens)}</dt>
`;
                for (const dd of item.dds) {
                  html += `<dd>${this.parser.parseInline(dd.tokens)}</dd>
`;
                }
              }
              html += "</dl>\n";
              return html;
            }
          },
          // :emoji_name: → GitHub 风格 Emoji（Unicode）
          {
            name: "emoji",
            level: "inline",
            start(src) {
              return src.indexOf(":");
            },
            tokenizer(src) {
              const rule = /^:([a-zA-Z0-9_+\-]+):/;
              const match = rule.exec(src);
              if (match && typeof EMOJI_MAP !== "undefined" && EMOJI_MAP[match[1]]) {
                return {
                  type: "emoji",
                  raw: match[0],
                  name: match[1],
                  emoji: EMOJI_MAP[match[1]]
                };
              }
            },
            renderer(token) {
              return `<span class="emoji" title=":${token.name}:">${token.emoji}</span>`;
            }
          }
        ]
      });
    }
    const _renderCompleteCallbacks = [];
    function renderBlocks(blocks, annotations) {
      const container = document.getElementById("documentContent");
      container.innerHTML = "";
      _mathExpressions = [];
      const fnLabelToGlobalIndex = {};
      if (_footnoteDefs.length > 0) {
        const fnLabelRegex = /^\s{0,3}\[\^([^\]\n]+)\]:/;
        let globalIdx = 1;
        for (const def of _footnoteDefs) {
          const m = fnLabelRegex.exec(def);
          if (m) {
            fnLabelToGlobalIndex[encodeURIComponent(m[1])] = globalIdx++;
          }
        }
      }
      blocks.forEach((block, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "md-block";
        wrapper.dataset.blockIndex = index;
        if (block.startsWith("%%FRONTMATTER%%\n")) {
          const fmRaw = block.slice("%%FRONTMATTER%%\n".length);
          const fmLines = fmRaw.split("\n").filter((l) => l.trim() !== "---");
          let propsHtml = "";
          for (const line of fmLines) {
            const colonIdx = line.indexOf(":");
            if (colonIdx > 0) {
              const key = escapeHtml(line.slice(0, colonIdx).trim());
              const val = escapeHtml(line.slice(colonIdx + 1).trim());
              propsHtml += `<div class="fm-prop"><span class="fm-key">${key}</span><span class="fm-colon">:</span> <span class="fm-value">${val}</span></div>`;
            } else if (line.trim()) {
              propsHtml += `<div class="fm-prop"><span class="fm-value">${escapeHtml(line.trim())}</span></div>`;
            }
          }
          wrapper.innerHTML = `<div class="frontmatter-card"><div class="fm-header"><span class="fm-icon">\u2699\uFE0F</span><span class="fm-title">YAML Front Matter</span></div><div class="fm-body">${propsHtml}</div></div>`;
          container.appendChild(wrapper);
          return;
        }
        let preprocessed = preprocessMarkdown(block);
        preprocessed = preprocessMath(preprocessed);
        if (_refLinkDefs.length > 0) {
          preprocessed = preprocessed + "\n\n" + _refLinkDefs.join("\n");
        }
        if (_footnoteDefs.length > 0) {
          preprocessed = preprocessed + "\n\n" + _footnoteDefs.join("\n\n");
        }
        let html = marked.parse(preprocessed);
        html = postprocessHTML(html, block);
        if (Object.keys(fnLabelToGlobalIndex).length > 0) {
          html = html.replace(
            /<sup><a\s+id="fn-ref-([^"]+)"\s+href="#fn-([^"]+)"\s+data-fn-ref\s+aria-describedby="fn-label">\d+<\/a><\/sup>/g,
            (match, refLabel, hrefLabel) => {
              const globalNum = fnLabelToGlobalIndex[hrefLabel];
              if (globalNum !== void 0) {
                return match.replace(/>\d+<\/a><\/sup>$/, `>${globalNum}</a></sup>`);
              }
              return match;
            }
          );
        }
        html = rewriteImagePaths(html);
        const blockAnnotations = annotations.filter((a) => a.blockIndex === index);
        const crossBlockAnnotations = annotations.filter((a) => {
          if (a.blockIndex === index) return false;
          if (a.type === "insert") return false;
          if (!a.selectedText) return false;
          if (a.endBlockIndex !== void 0 && a.endBlockIndex !== null) {
            return index >= a.blockIndex && index <= a.endBlockIndex;
          }
          const normSelected = a.selectedText.replace(/\s+/g, " ").trim();
          const normBlock = block.replace(/\s+/g, " ").trim();
          if (!normBlock || normBlock.length < 4) return false;
          return normSelected.includes(normBlock);
        });
        const allAnnotations = [...blockAnnotations, ...crossBlockAnnotations];
        if (allAnnotations.length > 0) {
          html = applyHighlights(html, block, allAnnotations);
        }
        wrapper.innerHTML = html;
        container.appendChild(wrapper);
      });
      if (_footnoteDefs.length > 0) {
        const fnLabels = [];
        const fnLabelRegex = /^\s{0,3}\[\^([^\]\n]+)\]:/;
        for (const def of _footnoteDefs) {
          const m = fnLabelRegex.exec(def);
          if (m) fnLabels.push(m[1]);
        }
        if (fnLabels.length > 0) {
          const dummyRefs = fnLabels.map((id) => `[^${id}]`).join(" ");
          const fullFootnoteMd = dummyRefs + "\n\n" + _footnoteDefs.join("\n\n");
          let fnHtml = marked.parse(fullFootnoteMd);
          const sectionMatch = fnHtml.match(/<section class="footnotes"[\s\S]*?<\/section>/);
          if (sectionMatch) {
            const fnWrapper = document.createElement("div");
            fnWrapper.className = "md-block footnotes-block";
            fnWrapper.innerHTML = sectionMatch[0];
            container.appendChild(fnWrapper);
          }
        }
      }
      for (const cb of _renderCompleteCallbacks) {
        try {
          cb();
        } catch (e) {
          console.warn("[Renderer] onRenderComplete callback error:", e);
        }
      }
    }
    function onRenderComplete(callback) {
      if (typeof callback === "function") {
        _renderCompleteCallbacks.push(callback);
      }
    }
    function applyHighlights(html, rawBlock, annotations) {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const sortedAnnotations = [...annotations].sort((a, b) => {
        if (a.type === "insert" && b.type !== "insert") return 1;
        if (a.type !== "insert" && b.type === "insert") return -1;
        return (b.startOffset || 0) - (a.startOffset || 0);
      });
      for (const ann of sortedAnnotations) {
        if (ann.type === "insert") {
          applyInsertHighlight(temp, rawBlock, ann);
        } else {
          applyTextHighlight(temp, ann);
        }
      }
      return temp.innerHTML;
    }
    function applyTextHighlight(container, annotation) {
      const searchText = annotation.selectedText;
      if (!searchText) return;
      if (trySingleNodeHighlight(container, annotation, searchText)) return;
      if (tryCrossNodeHighlight(container, annotation, searchText)) return;
      if (tryPartialBlockHighlight(container, annotation, searchText)) return;
      console.warn(`[renderer] \u9AD8\u4EAE\u5339\u914D\u5931\u8D25\uFF0C\u4F7F\u7528 fallback \u6807\u8BB0: ann#${annotation.id}`);
      applyFallbackMarker(container, annotation);
    }
    function trySingleNodeHighlight(container, annotation, searchText) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      const candidates = [];
      let globalOffset = 0;
      for (const textNode2 of textNodes) {
        const content = textNode2.textContent;
        let searchFrom = 0;
        while (true) {
          const idx2 = content.indexOf(searchText, searchFrom);
          if (idx2 === -1) break;
          candidates.push({ textNode: textNode2, idx: idx2, globalOffset: globalOffset + idx2 });
          searchFrom = idx2 + 1;
        }
        globalOffset += content.length;
      }
      if (candidates.length === 0) return false;
      let best = candidates[0];
      if (candidates.length > 1 && annotation.startOffset != null) {
        let minDist = Infinity;
        for (const c of candidates) {
          const dist = Math.abs(c.globalOffset - annotation.startOffset);
          if (dist < minDist) {
            minDist = dist;
            best = c;
          }
        }
      }
      const textNode = best.textNode;
      const idx = best.idx;
      const before = textNode.textContent.substring(0, idx);
      const match = textNode.textContent.substring(idx, idx + searchText.length);
      const after = textNode.textContent.substring(idx + searchText.length);
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      const span = document.createElement("span");
      span.className = annotation.type === "delete" ? "highlight-delete" : "highlight-comment";
      span.dataset.annotationId = annotation.id;
      span.textContent = match;
      const indicator = document.createElement("span");
      indicator.className = "annotation-indicator";
      indicator.textContent = annotation.id;
      indicator.dataset.annotationId = annotation.id;
      span.appendChild(indicator);
      frag.appendChild(span);
      if (after) frag.appendChild(document.createTextNode(after));
      textNode.parentNode.replaceChild(frag, textNode);
      return true;
    }
    function tryCrossNodeHighlight(container, annotation, searchText) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      if (textNodes.length === 0) return false;
      let fullText = "";
      const nodeMap = [];
      for (const tn of textNodes) {
        const start = fullText.length;
        fullText += tn.textContent;
        nodeMap.push({ node: tn, start, end: fullText.length });
      }
      let allMatches = [];
      let searchFrom = 0;
      while (true) {
        const pos = fullText.indexOf(searchText, searchFrom);
        if (pos === -1) break;
        allMatches.push(pos);
        searchFrom = pos + 1;
      }
      let matchStart = allMatches.length > 0 ? allMatches[0] : -1;
      if (allMatches.length > 1 && annotation.startOffset != null) {
        let minDist = Infinity;
        for (const pos of allMatches) {
          const dist = Math.abs(pos - annotation.startOffset);
          if (dist < minDist) {
            minDist = dist;
            matchStart = pos;
          }
        }
      }
      let actualMatchLen = searchText.length;
      if (matchStart === -1) {
        const normalizedSearch = searchText.replace(/\s+/g, " ").trim();
        const normalizedFull = fullText.replace(/\s+/g, " ");
        const nIdx = normalizedFull.indexOf(normalizedSearch);
        if (nIdx === -1) return false;
        let origPos = 0, normPos = 0;
        while (normPos < nIdx && origPos < fullText.length) {
          if (/\s/.test(fullText[origPos])) {
            while (origPos < fullText.length && /\s/.test(fullText[origPos])) origPos++;
            normPos++;
          } else {
            origPos++;
            normPos++;
          }
        }
        matchStart = origPos;
        let matchEndNorm = nIdx + normalizedSearch.length;
        normPos = nIdx;
        origPos = matchStart;
        while (normPos < matchEndNorm && origPos < fullText.length) {
          if (/\s/.test(fullText[origPos])) {
            while (origPos < fullText.length && /\s/.test(fullText[origPos])) origPos++;
            normPos++;
          } else {
            origPos++;
            normPos++;
          }
        }
        actualMatchLen = origPos - matchStart;
      }
      const matchEnd = matchStart + actualMatchLen;
      const affectedNodes = [];
      for (const nm of nodeMap) {
        if (nm.end <= matchStart) continue;
        if (nm.start >= matchEnd) break;
        affectedNodes.push({
          ...nm,
          highlightStart: Math.max(0, matchStart - nm.start),
          highlightEnd: Math.min(nm.node.textContent.length, matchEnd - nm.start)
        });
      }
      if (affectedNodes.length === 0) return false;
      let isFirst = true;
      for (const an of affectedNodes) {
        const textNode = an.node;
        const text = textNode.textContent;
        const hStart = an.highlightStart;
        const hEnd = an.highlightEnd;
        const before = text.substring(0, hStart);
        const match = text.substring(hStart, hEnd);
        const after = text.substring(hEnd);
        if (!match) continue;
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        const span = document.createElement("span");
        span.className = annotation.type === "delete" ? "highlight-delete" : "highlight-comment";
        span.dataset.annotationId = annotation.id;
        span.textContent = match;
        if (isFirst) {
          const indicator = document.createElement("span");
          indicator.className = "annotation-indicator";
          indicator.textContent = annotation.id;
          indicator.dataset.annotationId = annotation.id;
          span.appendChild(indicator);
          isFirst = false;
        }
        frag.appendChild(span);
        if (after) frag.appendChild(document.createTextNode(after));
        textNode.parentNode.replaceChild(frag, textNode);
      }
      return !isFirst;
    }
    function tryPartialBlockHighlight(container, annotation, searchText) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      if (textNodes.length === 0) return false;
      let blockText = "";
      for (const tn of textNodes) {
        blockText += tn.textContent;
      }
      blockText = blockText.trim();
      if (!blockText) return false;
      const normBlock = blockText.replace(/\s+/g, " ").trim();
      const normSearch = searchText.replace(/\s+/g, " ").trim();
      const isContained = normSearch.includes(normBlock);
      let overlapStart = -1;
      if (isContained) {
        overlapStart = 0;
      } else {
        for (let len = Math.min(normSearch.length, normBlock.length); len >= 4; len--) {
          if (normSearch.substring(normSearch.length - len) === normBlock.substring(0, len)) {
            overlapStart = 0;
            break;
          }
        }
        if (overlapStart === -1) {
          for (let len = Math.min(normSearch.length, normBlock.length); len >= 4; len--) {
            if (normSearch.substring(0, len) === normBlock.substring(normBlock.length - len)) {
              overlapStart = 0;
              break;
            }
          }
        }
      }
      if (overlapStart === -1) return false;
      let isFirst = true;
      for (const textNode of textNodes) {
        const text = textNode.textContent;
        if (!text.trim()) continue;
        const frag = document.createDocumentFragment();
        const span = document.createElement("span");
        span.className = annotation.type === "delete" ? "highlight-delete" : "highlight-comment";
        span.dataset.annotationId = annotation.id;
        span.textContent = text;
        if (isFirst) {
          const indicator = document.createElement("span");
          indicator.className = "annotation-indicator";
          indicator.textContent = annotation.id;
          indicator.dataset.annotationId = annotation.id;
          span.appendChild(indicator);
          isFirst = false;
        }
        frag.appendChild(span);
        textNode.parentNode.replaceChild(frag, textNode);
      }
      return !isFirst;
    }
    function applyFallbackMarker(container, annotation) {
      const marker = document.createElement("span");
      marker.className = "annotation-fallback-marker";
      marker.dataset.annotationId = annotation.id;
      marker.style.display = "none";
      container.insertBefore(marker, container.firstChild);
    }
    function applyInsertHighlight(container, rawBlock, annotation) {
      const afterText = annotation.selectedText;
      if (!afterText) return;
      const isBefore = annotation.insertPosition === "before";
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }
      const candidates = [];
      let globalOffset = 0;
      for (const textNode2 of textNodes) {
        const content = textNode2.textContent;
        let searchFrom = 0;
        while (true) {
          const idx2 = content.indexOf(afterText, searchFrom);
          if (idx2 === -1) break;
          candidates.push({ textNode: textNode2, idx: idx2, globalOffset: globalOffset + idx2 });
          searchFrom = idx2 + 1;
        }
        globalOffset += content.length;
      }
      if (candidates.length === 0) return;
      let best = candidates[0];
      if (candidates.length > 1 && annotation.startOffset != null) {
        let minDist = Infinity;
        for (const c of candidates) {
          const dist = Math.abs(c.globalOffset - annotation.startOffset);
          if (dist < minDist) {
            minDist = dist;
            best = c;
          }
        }
      }
      const textNode = best.textNode;
      const idx = best.idx;
      const endIdx = idx + afterText.length;
      const marker = document.createElement("span");
      marker.className = "insert-marker";
      marker.dataset.annotationId = annotation.id;
      const indicator = document.createElement("span");
      indicator.className = "annotation-indicator";
      indicator.textContent = annotation.id;
      indicator.dataset.annotationId = annotation.id;
      marker.appendChild(indicator);
      const insertText = annotation.insertContent || (isBefore ? typeof t === "function" ? t("renderer.insert_before_text") : "\u524D\u63D2\u5185\u5BB9" : typeof t === "function" ? t("renderer.insert_after_text") : "\u63D2\u5165\u5185\u5BB9");
      const displayText = insertText.length > 20 ? insertText.substring(0, 20) + "..." : insertText;
      marker.appendChild(document.createTextNode(" " + displayText));
      const frag = document.createDocumentFragment();
      if (isBefore) {
        const before = textNode.textContent.substring(0, idx);
        const after = textNode.textContent.substring(idx);
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(marker);
        if (after) frag.appendChild(document.createTextNode(after));
      } else {
        const before = textNode.textContent.substring(0, endIdx);
        const after = textNode.textContent.substring(endIdx);
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(marker);
        if (after) frag.appendChild(document.createTextNode(after));
      }
      textNode.parentNode.replaceChild(frag, textNode);
    }
    function getBlockIndex(node) {
      let el = node;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains("md-block")) {
          return parseInt(el.dataset.blockIndex, 10);
        }
        el = el.parentNode;
      }
      return -1;
    }
    function rewriteImagePaths(html) {
      return html.replace(/<img\s+([^>]*?)src="([^"]*)"([^>]*?)>/gi, (match, before, src, after) => {
        if (/^(https?:\/\/|data:|vscode-)/i.test(src)) {
          return match;
        }
        let decodedSrc;
        try {
          decodedSrc = decodeURIComponent(src);
        } catch (e) {
          decodedSrc = src;
        }
        if (_imageUriCache[decodedSrc]) {
          return `<img ${before}src="${_imageUriCache[decodedSrc]}"${after}>`;
        }
        const safeFileName = decodedSrc.replace(/&/g, "&amp;").replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const errorHandler = `this.onerror=null;this.style.display='none';var p=document.createElement('div');p.className='img-placeholder';p.innerHTML='\u{1F5BC}\uFE0F \u56FE\u7247\u52A0\u8F7D\u4E2D: ${safeFileName}';this.parentNode.insertBefore(p,this);`;
        return `<img ${before}src="${src}"${after} onerror="${errorHandler}">`;
      });
    }
    function setImageUriCache(uriMap) {
      _imageUriCache = { ..._imageUriCache, ...uriMap };
    }
    function collectRelativeImagePaths(html) {
      const paths = [];
      const regex = /<img[^>]*src="([^"]*)"[^>]*>/gi;
      let m;
      while ((m = regex.exec(html)) !== null) {
        const src = m[1];
        if (!/^(https?:\/\/|data:|vscode-)/i.test(src)) {
          try {
            paths.push(decodeURIComponent(src));
          } catch (e) {
            paths.push(src);
          }
        }
      }
      return [...new Set(paths)];
    }
    function preprocessMermaidCode(code) {
      const lines = code.split("\n");
      const trimmedFirst = lines.find((l) => l.trim().length > 0);
      if (!trimmedFirst) return code;
      const firstLine = trimmedFirst.trim();
      if (firstLine.startsWith("sequenceDiagram")) {
        return preprocessSequenceDiagram(lines);
      }
      if (firstLine.startsWith("classDiagram")) {
        return preprocessClassDiagram(lines);
      }
      if (firstLine.startsWith("stateDiagram")) {
        return preprocessStateDiagram(lines);
      }
      return code;
    }
    function preprocessSequenceDiagram(lines) {
      const unsafePattern = /\+\+|--|#/;
      const idMap = /* @__PURE__ */ new Map();
      let safeCounter = 0;
      const participantRegex = /^(\s*)(participant|actor)\s+(.+)$/i;
      for (const line of lines) {
        const match = line.match(participantRegex);
        if (!match) continue;
        const rest = match[3].trim();
        let rawId, displayName;
        const asMatch = rest.match(/^(.+?)\s+as\s+(.+)$/i);
        if (asMatch) {
          rawId = asMatch[1].trim();
          displayName = asMatch[2].trim();
        } else {
          rawId = rest;
          displayName = rest;
        }
        const unquotedId = rawId.replace(/^["']|["']$/g, "");
        const unquotedDisplay = displayName.replace(/^["']|["']$/g, "");
        if (unsafePattern.test(unquotedId) || unsafePattern.test(unquotedDisplay)) {
          const safeId = "_safe_" + safeCounter++;
          idMap.set(unquotedId, safeId);
        }
      }
      if (idMap.size === 0) return lines.join("\n");
      const result = lines.map((line) => {
        const pMatch = line.match(participantRegex);
        if (pMatch) {
          const indent = pMatch[1];
          const keyword = pMatch[2];
          const rest = pMatch[3].trim();
          let rawId, displayName;
          const asMatch = rest.match(/^(.+?)\s+as\s+(.+)$/i);
          if (asMatch) {
            rawId = asMatch[1].trim().replace(/^["']|["']$/g, "");
            displayName = asMatch[2].trim().replace(/^["']|["']$/g, "");
          } else {
            rawId = rest.replace(/^["']|["']$/g, "");
            displayName = null;
          }
          if (idMap.has(rawId)) {
            const safeId = idMap.get(rawId);
            const display = displayName || rawId;
            return `${indent}${keyword} ${safeId} as "${display}"`;
          }
          return line;
        }
        let newLine = line;
        for (const [originalId, safeId] of idMap) {
          if (newLine.includes(originalId)) {
            const escaped = originalId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            newLine = newLine.replace(new RegExp(escaped, "g"), safeId);
          }
        }
        return newLine;
      });
      return result.join("\n");
    }
    function preprocessClassDiagram(lines) {
      const unsafePattern = /[+#~<>{}|\[\]]/;
      const classNameMap = /* @__PURE__ */ new Map();
      let safeCounter = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        const classMatch = trimmed.match(/^class\s+([^\s{:"]+)/i);
        if (classMatch) {
          const className = classMatch[1].replace(/^`|`$/g, "");
          if (unsafePattern.test(className) && !classNameMap.has(className)) {
            classNameMap.set(className, "_cls_" + safeCounter++);
          }
        }
        const relationMatch = trimmed.match(/^([^\s:"]+)\s+(?:<\||\*|o|\.|--|\.\.)[|<>*o-]+\s+([^\s:"]+)/);
        if (relationMatch) {
          for (const name of [relationMatch[1], relationMatch[2]]) {
            const cleanName = name.replace(/^`|`$/g, "");
            if (unsafePattern.test(cleanName) && !classNameMap.has(cleanName)) {
              classNameMap.set(cleanName, "_cls_" + safeCounter++);
            }
          }
        }
      }
      if (classNameMap.size === 0) return lines.join("\n");
      const result = [];
      let addedLabels = false;
      for (const line of lines) {
        let newLine = line;
        for (const [originalName, safeId] of classNameMap) {
          if (newLine.includes(originalName)) {
            const escaped = originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            newLine = newLine.replace(new RegExp(escaped, "g"), safeId);
          }
        }
        result.push(newLine);
        if (!addedLabels && line.trim().startsWith("classDiagram")) {
          for (const [originalName, safeId] of classNameMap) {
            result.push(`    ${safeId} : "${originalName}"`);
          }
          addedLabels = true;
        }
      }
      return result.join("\n");
    }
    function preprocessStateDiagram(lines) {
      const unsafePattern = /\+\+|--|#|[<>{}|\[\]]/;
      const stateNameMap = /* @__PURE__ */ new Map();
      let safeCounter = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("stateDiagram") || trimmed.startsWith("%%")) continue;
        if (/^state\s+"/.test(trimmed)) continue;
        const stateMatch = trimmed.match(/^state\s+([^\s{"]+)/i);
        if (stateMatch) {
          const stateName = stateMatch[1];
          if (unsafePattern.test(stateName) && !stateNameMap.has(stateName)) {
            stateNameMap.set(stateName, "_st_" + safeCounter++);
          }
        }
        const transMatch = trimmed.match(/^([^\s:]+)\s*-->\s*([^\s:]+)/);
        if (transMatch) {
          for (const name of [transMatch[1], transMatch[2]]) {
            if (name === "[*]") continue;
            if (unsafePattern.test(name) && !stateNameMap.has(name)) {
              stateNameMap.set(name, "_st_" + safeCounter++);
            }
          }
        }
      }
      if (stateNameMap.size === 0) return lines.join("\n");
      const result = [];
      let addedDeclarations = false;
      for (const line of lines) {
        let newLine = line;
        for (const [originalName, safeId] of stateNameMap) {
          if (newLine.includes(originalName)) {
            const escaped = originalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            newLine = newLine.replace(new RegExp(escaped, "g"), safeId);
          }
        }
        result.push(newLine);
        if (!addedDeclarations && line.trim().startsWith("stateDiagram")) {
          for (const [originalName, safeId] of stateNameMap) {
            result.push(`    state "${originalName}" as ${safeId}`);
          }
          addedDeclarations = true;
        }
      }
      return result.join("\n");
    }
    function parseCssColor(str) {
      if (!str || typeof str !== "string") return null;
      const s = str.trim().toLowerCase();
      if (s === "none" || s === "transparent") return null;
      if (s[0] === "#") {
        let hex = s.slice(1);
        if (hex.length === 3 || hex.length === 4) {
          hex = hex.split("").map((c) => c + c).join("");
        }
        if (hex.length === 6 || hex.length === 8) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
          if ([r, g, b].every((n) => !isNaN(n))) return { r, g, b, a };
        }
        return null;
      }
      const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
      if (m) {
        const r = Math.round(parseFloat(m[1]));
        const g = Math.round(parseFloat(m[2]));
        const b = Math.round(parseFloat(m[3]));
        let a = 1;
        if (m[4] != null) {
          a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        }
        return { r, g, b, a };
      }
      try {
        const probe = document.createElement("span");
        probe.style.color = "rgba(0,0,0,0)";
        probe.style.color = s;
        if (!probe.style.color) return null;
        document.body.appendChild(probe);
        const rgb = getComputedStyle(probe).color;
        document.body.removeChild(probe);
        const mm = rgb.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/);
        if (mm) {
          return {
            r: Math.round(parseFloat(mm[1])),
            g: Math.round(parseFloat(mm[2])),
            b: Math.round(parseFloat(mm[3])),
            a: mm[4] != null ? parseFloat(mm[4]) : 1
          };
        }
      } catch (e) {
      }
      return null;
    }
    function relativeLuminance(rgb) {
      const toLin = (c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
    }
    function fixMermaidNodeTextContrast(container, isDark) {
      const svg = container.querySelector("svg");
      if (!svg) return;
      const LUMA_THRESHOLD = 0.5;
      const DARK_TEXT = "#1a202c";
      const LIGHT_TEXT = "#f7fafc";
      const targets = svg.querySelectorAll("g.node, g.cluster, .node, .cluster");
      targets.forEach((nodeG) => {
        const shapes = nodeG.querySelectorAll(":scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path");
        let fill = null;
        for (const sh of shapes) {
          const f = sh.getAttribute("fill") || sh.style.fill || getComputedStyle(sh).fill;
          const parsed = parseCssColor(f);
          if (parsed && parsed.a > 0) {
            fill = parsed;
            break;
          }
        }
        if (!fill) return;
        const luma = relativeLuminance(fill);
        let newColor = null;
        if (isDark && luma > LUMA_THRESHOLD) {
          newColor = DARK_TEXT;
        } else if (!isDark && luma <= LUMA_THRESHOLD) {
          newColor = LIGHT_TEXT;
        }
        if (!newColor) return;
        nodeG.querySelectorAll("text, tspan").forEach((t3) => {
          t3.setAttribute("fill", newColor);
          t3.style.fill = newColor;
        });
        nodeG.querySelectorAll("foreignObject *").forEach((el) => {
          el.style.setProperty("color", newColor, "important");
        });
        const directLabel = nodeG.querySelector(":scope > .nodeLabel, :scope > .label");
        if (directLabel) {
          directLabel.style.setProperty("color", newColor, "important");
        }
      });
    }
    async function renderMermaid() {
      if (typeof mermaid === "undefined") return;
      document.querySelectorAll('div[id^="dmermaid-"]').forEach((el) => el.remove());
      document.querySelectorAll('svg[id^="mermaid-"]').forEach((el) => {
        if (!el.closest(".mermaid-container")) el.remove();
      });
      document.querySelectorAll('iframe[id^="imermaid-"]').forEach((el) => el.remove());
      const isDark = document.body.classList.contains("theme-dark");
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        // 使用 'loose' 而非 'strict'：
        // 'strict' 会强制将 htmlLabels 设为 false，导致节点文本中的特殊字符
        // （如 C++ 中的 +、C# 中的 #）被 Mermaid 解析器误解为语法符号，渲染失败。
        // VS Code webview 本身已是沙箱环境，安全性由宿主保证，'loose' 不会引入额外风险。
        securityLevel: "loose",
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: "basis"
        },
        sequence: {
          useMaxWidth: false,
          diagramMarginX: 8,
          diagramMarginY: 8
        },
        gantt: {
          useMaxWidth: false
        },
        themeVariables: isDark ? {
          darkMode: true,
          background: "#1e1e2e",
          primaryColor: "#4fc3f7",
          primaryTextColor: "#e0e0e0",
          primaryBorderColor: "#4a5568",
          lineColor: "#718096",
          secondaryColor: "#2d3748",
          tertiaryColor: "#374151",
          textColor: "#e2e8f0",
          mainBkg: "#2d3748",
          nodeBorder: "#4a5568",
          clusterBkg: "rgba(30, 41, 59, 0.5)",
          clusterBorder: "#475569",
          titleColor: "#e2e8f0",
          edgeLabelBackground: "#1e293b",
          nodeTextColor: "#e2e8f0"
        } : {}
      });
      _mermaidInitialized = true;
      const containers = document.querySelectorAll(".mermaid-container");
      for (const container of containers) {
        const sourceDataEl = container.querySelector(".mermaid-source-data");
        const sourceEl = container.querySelector(".mermaid-source");
        let code = "";
        if (sourceDataEl && sourceDataEl.dataset.source) {
          try {
            code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
          } catch (e) {
            code = sourceEl ? sourceEl.textContent : "";
          }
        } else if (sourceEl) {
          code = sourceEl.textContent;
        }
        if (!code) continue;
        const id = "mermaid-" + Date.now() + "-" + ++_mermaidCounter;
        code = preprocessMermaidCode(code);
        try {
          const { svg } = await mermaid.render(id, code, container);
          const tempDiv = document.getElementById("d" + id);
          if (tempDiv) tempDiv.remove();
          const tempSvg = document.getElementById(id);
          if (tempSvg && !tempSvg.closest(".mermaid-container")) tempSvg.remove();
          const tempIframe = document.getElementById("i" + id);
          if (tempIframe) tempIframe.remove();
          const latestBase64 = btoa(unescape(encodeURIComponent(code)));
          container.innerHTML = `<div class="mermaid-rendered" data-source="${latestBase64}">${svg}</div>`;
          try {
            fixMermaidNodeTextContrast(container, isDark);
          } catch (e) {
          }
          const svgEl = container.querySelector("svg");
          if (svgEl) {
            const rawW = parseFloat(svgEl.getAttribute("width")) || svgEl.getBoundingClientRect().width;
            const rawH = parseFloat(svgEl.getAttribute("height")) || svgEl.getBoundingClientRect().height;
            if (!svgEl.getAttribute("viewBox") && rawW && rawH) {
              svgEl.setAttribute("viewBox", `0 0 ${rawW} ${rawH}`);
            }
            svgEl.removeAttribute("style");
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
            const containerW = container.clientWidth - 32 || 800;
            const aspect = rawW / rawH;
            if (aspect > 2.5) {
              const calcH = Math.max(containerW / aspect, 300);
              svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
            } else if (aspect > 1.5) {
              const calcH = Math.max(containerW / aspect, 250);
              svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
            } else {
              svgEl.style.cssText = `width:100%;height:auto;max-width:100%;`;
              if (rawH > 100) {
                svgEl.style.minHeight = Math.min(rawH, 600) + "px";
              }
            }
          }
        } catch (e) {
          console.warn("[Renderer] Mermaid \u6E32\u67D3\u5931\u8D25:", e);
          container.innerHTML = `<div class="mermaid-error"><span class="mermaid-error-icon">\u26A0\uFE0F</span> Mermaid \u56FE\u8868\u6E32\u67D3\u5931\u8D25<pre>${escapeHtml(code)}</pre></div>`;
        }
      }
      document.querySelectorAll('div[id^="dmermaid-"]').forEach((el) => el.remove());
      document.querySelectorAll('svg[id^="mermaid-"]').forEach((el) => {
        if (!el.closest(".mermaid-container")) el.remove();
      });
      document.querySelectorAll('iframe[id^="imermaid-"]').forEach((el) => el.remove());
    }
    function reinitMermaid() {
      _mermaidInitialized = false;
      document.querySelectorAll(".mermaid-container").forEach((container) => {
        container.removeAttribute("data-mermaid-id");
        const rendered = container.querySelector(".mermaid-rendered");
        if (rendered && rendered.dataset.source) {
          let code = "";
          try {
            code = decodeURIComponent(escape(atob(rendered.dataset.source)));
          } catch (e) {
            code = "";
          }
          if (code) {
            container.innerHTML = `<div class="mermaid-source-data" data-source="${rendered.dataset.source}" style="display:none"></div><pre class="mermaid-source">${escapeHtml(code)}</pre>`;
          }
        }
      });
      _mermaidCounter = 0;
    }
    function renderMath() {
      if (typeof katex === "undefined") return;
      if (_mathExpressions.length === 0) return;
      const container = document.getElementById("documentContent");
      if (!container) return;
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes(MATH_PLACEHOLDER_PREFIX)) {
          textNodes.push(node);
        }
      }
      const placeholderRegex = new RegExp(
        MATH_PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)" + MATH_PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      for (const textNode of textNodes) {
        const text = textNode.textContent;
        const parts = [];
        let lastIndex = 0;
        let match;
        placeholderRegex.lastIndex = 0;
        while ((match = placeholderRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
          }
          const exprIndex = parseInt(match[1]);
          const expr = _mathExpressions[exprIndex];
          if (expr) {
            try {
              const rendered = document.createElement(expr.displayMode ? "div" : "span");
              rendered.className = expr.displayMode ? "katex-display" : "katex-inline";
              katex.render(expr.formula, rendered, {
                displayMode: expr.displayMode,
                throwOnError: false,
                output: "html"
              });
              parts.push(rendered);
            } catch (e) {
              const errorSpan = document.createElement("span");
              errorSpan.className = "katex-error";
              errorSpan.textContent = expr.displayMode ? `$$${expr.formula}$$` : `$${expr.formula}$`;
              errorSpan.title = "\u516C\u5F0F\u6E32\u67D3\u5931\u8D25: " + e.message;
              parts.push(errorSpan);
            }
          } else {
            parts.push(document.createTextNode(match[0]));
          }
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
          parts.push(document.createTextNode(text.slice(lastIndex)));
        }
        if (parts.length > 0) {
          const fragment = document.createDocumentFragment();
          parts.forEach((p) => fragment.appendChild(p));
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      }
    }
    function plantumlHexEncode(text) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      let hex = "";
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, "0");
      }
      return hex;
    }
    function renderPlantUML() {
      const containers = document.querySelectorAll(".plantuml-container");
      if (containers.length === 0) return;
      containers.forEach((container) => {
        if (container.querySelector(".plantuml-rendered")) {
          const img2 = container.querySelector(".plantuml-rendered");
          if (img2 && !img2.dataset.lightboxBound) {
            img2.dataset.lightboxBound = "true";
            img2.title = "\u70B9\u51FB\u67E5\u770B\u5927\u56FE";
            img2.style.cursor = "pointer";
          }
          return;
        }
        const sourceDataEl = container.querySelector(".plantuml-source-data");
        if (!sourceDataEl || !sourceDataEl.dataset.source) return;
        let code = "";
        try {
          code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
        } catch (e) {
          const sourceEl = container.querySelector(".plantuml-source");
          code = sourceEl ? sourceEl.textContent : "";
        }
        if (!code) return;
        const maxLen = 4e3;
        if (code.length > maxLen) {
          container.innerHTML = `<div class="plantuml-error"><span class="plantuml-error-icon">\u26A0\uFE0F</span> \u56FE\u8868\u6E90\u7801\u8FC7\u957F\uFF08${code.length} \u5B57\u7B26\uFF09\uFF0C\u65E0\u6CD5\u5728\u7EBF\u6E32\u67D3</div><pre class="plantuml-source">${escapeHtml(code)}</pre>`;
          container.classList.add("plantuml-too-long");
          return;
        }
        const hexCode = plantumlHexEncode(code);
        const svgUrl = "https://www.plantuml.com/plantuml/svg/~h" + hexCode;
        container.innerHTML = `<img class="plantuml-rendered" src="${svgUrl}" alt="PlantUML Diagram" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" /><div class="plantuml-fallback" style="display:none"><div class="plantuml-error"><span class="plantuml-error-icon">\u26A0\uFE0F</span> PlantUML \u56FE\u8868\u6E32\u67D3\u5931\u8D25\uFF08\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\uFF09</div><pre class="plantuml-source">${escapeHtml(code)}</pre></div><pre class="plantuml-source-data" data-source="${sourceDataEl.dataset.source}" style="display:none"></pre>`;
        const img = container.querySelector(".plantuml-rendered");
        if (img) {
          img.dataset.lightboxBound = "true";
          img.title = "\u70B9\u51FB\u67E5\u770B\u5927\u56FE";
          img.style.cursor = "pointer";
        }
      });
    }
    async function renderGraphviz() {
      const containers = document.querySelectorAll(".graphviz-container");
      if (containers.length === 0) return;
      if (typeof Viz === "undefined") {
        console.warn("[Renderer] Viz.js \u672A\u52A0\u8F7D");
        return;
      }
      let vizInstance;
      try {
        vizInstance = await Viz.instance();
      } catch (e) {
        console.warn("[Renderer] Viz.js \u521D\u59CB\u5316\u5931\u8D25:", e);
        return;
      }
      for (const container of containers) {
        if (container.querySelector(".graphviz-rendered")) continue;
        const sourceDataEl = container.querySelector(".graphviz-source-data");
        const sourceEl = container.querySelector(".graphviz-source");
        let code = "";
        if (sourceDataEl && sourceDataEl.dataset.source) {
          try {
            code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
          } catch (e) {
            code = sourceEl ? sourceEl.textContent : "";
          }
        } else if (sourceEl) {
          code = sourceEl.textContent;
        }
        if (!code) continue;
        try {
          const svg = vizInstance.renderSVGElement(code);
          const wrapper = document.createElement("div");
          wrapper.className = "graphviz-rendered";
          wrapper.dataset.source = sourceDataEl ? sourceDataEl.dataset.source : "";
          wrapper.appendChild(svg);
          container.innerHTML = "";
          container.appendChild(wrapper);
          const rawW = parseFloat(svg.getAttribute("width")) || svg.getBoundingClientRect().width;
          const rawH = parseFloat(svg.getAttribute("height")) || svg.getBoundingClientRect().height;
          if (!svg.getAttribute("viewBox") && rawW && rawH) {
            svg.setAttribute("viewBox", `0 0 ${rawW} ${rawH}`);
          }
          svg.removeAttribute("width");
          svg.removeAttribute("height");
          svg.style.cssText = "width:100%;height:auto;max-width:100%;";
        } catch (e) {
          console.warn("[Renderer] Graphviz \u6E32\u67D3\u5931\u8D25:", e);
          container.innerHTML = `<div class="graphviz-error"><span class="graphviz-error-icon">\u26A0\uFE0F</span> Graphviz \u56FE\u8868\u6E32\u67D3\u5931\u8D25: ${escapeHtml(e.message || "")}<pre>${escapeHtml(code)}</pre></div>`;
        }
      }
    }
    function reinitGraphviz() {
      document.querySelectorAll(".graphviz-container").forEach((container) => {
        const rendered = container.querySelector(".graphviz-rendered");
        if (rendered && rendered.dataset.source) {
          let code = "";
          try {
            code = decodeURIComponent(escape(atob(rendered.dataset.source)));
          } catch (e) {
            code = "";
          }
          if (code) {
            container.innerHTML = `<div class="graphviz-source-data" data-source="${rendered.dataset.source}" style="display:none"></div><pre class="graphviz-source">${escapeHtml(code)}</pre>`;
          }
        }
      });
    }
    function restoreMathPlaceholders() {
      if (_mathExpressions.length === 0) return;
      const container = document.getElementById("documentContent");
      if (!container) return;
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes(MATH_PLACEHOLDER_PREFIX)) {
          textNodes.push(node);
        }
      }
      const placeholderRegex = new RegExp(
        MATH_PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)" + MATH_PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      for (const textNode of textNodes) {
        const text = textNode.textContent;
        const restored = text.replace(placeholderRegex, (match, indexStr) => {
          const exprIndex = parseInt(indexStr);
          const expr = _mathExpressions[exprIndex];
          if (expr) {
            return expr.displayMode ? `$$${expr.formula}$$` : `$${expr.formula}$`;
          }
          return match;
        });
        if (restored !== text) {
          textNode.textContent = restored;
        }
      }
    }
    return { parseMarkdown, renderBlocks, onRenderComplete, getBlockIndex, setImageUriCache, getImageUriCache: () => _imageUriCache, collectRelativeImagePaths, configureHighlight, renderMermaid, reinitMermaid, renderMath, restoreMathPlaceholders, renderPlantUML, renderGraphviz, reinitGraphviz, postprocessHTML, preprocessMath, getRawBlocksBeforeExtract: () => _rawBlocksBeforeExtract, getOrphanedDefBlocks: () => _orphanedDefBlocks, getInlineExtractedDefs: () => _inlineExtractedDefs };
  })();

  // webview/js/annotations.js
  var Annotations2 = /* @__PURE__ */ (() => {
    let currentSelection = null;
    let pendingImages = [];
    let selectionTooltip = null;
    let blocks = [];
    let editingAnnotationId = null;
    let currentSortMode = "time";
    let currentInsertPosition = "after";
    let annotationSearchQuery = "";
    let annotationSearchDebounceTimer = null;
    let _annotationImageUriCache = {};
    function isBase64Image(str) {
      return str && str.startsWith("data:image/");
    }
    function getImageSrc(img) {
      if (isBase64Image(img)) {
        return img;
      }
      return _annotationImageUriCache[img] || "";
    }
    function _callHost(type, payload) {
      return new Promise((resolve, reject) => {
        const requestId = type + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        const handler = (event) => {
          const msg = event.data;
          if (msg.requestId === requestId) {
            window.removeEventListener("message", handler);
            resolve(msg.payload);
          }
        };
        window.addEventListener("message", handler);
        vscode.postMessage({ type, payload, requestId });
        setTimeout(() => {
          window.removeEventListener("message", handler);
          reject(new Error("\u8BF7\u6C42\u8D85\u65F6: " + type));
        }, 1e4);
      });
    }
    async function resolveAnnotationImageUris(imagePaths) {
      if (!imagePaths || imagePaths.length === 0) return;
      const needResolve = imagePaths.filter((p) => !isBase64Image(p) && !_annotationImageUriCache[p]);
      if (needResolve.length === 0) return;
      try {
        const uriMap = await _callHost("resolveAnnotationImageUris", { imagePaths: needResolve });
        if (uriMap) {
          Object.assign(_annotationImageUriCache, uriMap);
        }
      } catch (e) {
        console.warn("[annotations] \u89E3\u6790\u6279\u6CE8\u56FE\u7247 URI \u5931\u8D25:", e);
      }
    }
    function init(parsedBlocks) {
      blocks = parsedBlocks;
      setupTextSelection();
      setupContextMenu();
      setupCommentModal();
      setupInsertModal();
      setupAnnotationClicks();
      setupSortSelect();
      setupAnnotationSearch();
    }
    function setupAnnotationSearch() {
      const searchInput = document.getElementById("annotationSearchInput");
      const searchClear = document.getElementById("annotationSearchClear");
      if (!searchInput) return;
      searchInput.oninput = null;
      searchInput.oninput = () => {
        const val = searchInput.value.trim();
        if (searchClear) searchClear.style.display = val ? "" : "none";
        if (annotationSearchDebounceTimer) clearTimeout(annotationSearchDebounceTimer);
        annotationSearchDebounceTimer = setTimeout(() => {
          annotationSearchQuery = val;
          renderAnnotationsList();
        }, 150);
      };
      if (searchClear) {
        searchClear.onclick = null;
        searchClear.onclick = () => {
          searchInput.value = "";
          searchClear.style.display = "none";
          annotationSearchQuery = "";
          renderAnnotationsList();
        };
      }
    }
    function getAnnotationSearchQuery() {
      return annotationSearchQuery;
    }
    function setupSortSelect() {
      const sortSelect = document.getElementById("sortSelect");
      if (!sortSelect) return;
      sortSelect.value = currentSortMode;
      sortSelect.onchange = null;
      sortSelect.onchange = (e) => {
        currentSortMode = e.target.value;
        renderAnnotationsList();
      };
    }
    function isWysiwygEditing() {
      const docContent = document.getElementById("documentContent");
      return docContent && docContent.contentEditable === "true";
    }
    function computeGlobalOffset(container, targetNode, localOffset) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      let globalOffset = 0;
      while (walker.nextNode()) {
        if (walker.currentNode === targetNode) {
          return globalOffset + localOffset;
        }
        globalOffset += walker.currentNode.textContent.length;
      }
      return localOffset;
    }
    function findBlockContainer(node) {
      let el = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains("md-block")) return el;
        el = el.parentNode;
      }
      return null;
    }
    function setupTextSelection() {
      const content = document.getElementById("documentContent");
      content.addEventListener("mouseup", (e) => {
        if (isWysiwygEditing()) return;
        if (e.target.classList.contains("annotation-indicator") || e.target.classList.contains("highlight-comment") || e.target.classList.contains("highlight-delete") || e.target.classList.contains("insert-marker")) {
          return;
        }
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            hideSelectionTooltip();
            return;
          }
          const rawText = selection.toString();
          if (rawText.length === 0) {
            hideSelectionTooltip();
            return;
          }
          const text = rawText.trim() || rawText;
          const range = selection.getRangeAt(0);
          const blockIndex = Renderer.getBlockIndex(range.startContainer);
          const endBlockIndex = Renderer.getBlockIndex(range.endContainer);
          if (blockIndex < 0) {
            hideSelectionTooltip();
            return;
          }
          const startBlock = findBlockContainer(range.startContainer);
          const endBlock = findBlockContainer(range.endContainer);
          const globalStartOffset = startBlock ? computeGlobalOffset(startBlock, range.startContainer, range.startOffset) : range.startOffset;
          const globalEndOffset = endBlock ? computeGlobalOffset(endBlock, range.endContainer, range.endOffset) : range.endOffset;
          currentSelection = {
            text,
            blockIndex,
            endBlockIndex: endBlockIndex >= 0 ? endBlockIndex : blockIndex,
            startOffset: globalStartOffset,
            endOffset: globalEndOffset,
            range: range.cloneRange()
          };
          showSelectionTooltip(e.clientX, e.clientY);
        }, 10);
      });
      document.addEventListener("mousedown", (e) => {
        if (selectionTooltip && !selectionTooltip.contains(e.target)) {
          hideSelectionTooltip();
        }
      });
    }
    function showSelectionTooltip(x, y) {
      hideSelectionTooltip();
      selectionTooltip = document.createElement("div");
      selectionTooltip.className = "selection-tooltip";
      selectionTooltip.innerHTML = `
            <button data-action="comment">${t("float.comment")}</button>
            <button data-action="delete">${t("float.delete")}</button>
            <button data-action="insert">${t("float.insert_after")}</button>
            <button data-action="insertBefore">${t("float.insert_before")}</button>
        `;
      selectionTooltip.style.left = Math.min(x, window.innerWidth - 250) + "px";
      selectionTooltip.style.top = y - 45 + "px";
      selectionTooltip.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
      selectionTooltip.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        e.stopPropagation();
        const action = btn.dataset.action;
        const savedSelection = currentSelection ? { ...currentSelection } : null;
        if (action === "comment") {
          openCommentModal();
        } else if (action === "delete") {
          if (!currentSelection && savedSelection) {
            currentSelection = savedSelection;
          }
          markDelete();
        } else if (action === "insert") {
          openInsertModal("after");
        } else if (action === "insertBefore") {
          openInsertModal("before");
        }
        hideSelectionTooltip();
      });
      document.body.appendChild(selectionTooltip);
    }
    function hideSelectionTooltip() {
      if (selectionTooltip) {
        selectionTooltip.remove();
        selectionTooltip = null;
      }
    }
    function setupContextMenu() {
      const content = document.getElementById("documentContent");
      const menu = document.getElementById("contextMenu");
      content.addEventListener("contextmenu", (e) => {
        if (isWysiwygEditing()) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          return;
        }
        const rawText = selection.toString();
        if (rawText.length === 0) return;
        e.preventDefault();
        const text = rawText.trim() || rawText;
        const range = selection.getRangeAt(0);
        const blockIndex = Renderer.getBlockIndex(range.startContainer);
        const endBlockIndex = Renderer.getBlockIndex(range.endContainer);
        if (blockIndex < 0) return;
        const startBlock = findBlockContainer(range.startContainer);
        const endBlock = findBlockContainer(range.endContainer);
        const globalStartOffset = startBlock ? computeGlobalOffset(startBlock, range.startContainer, range.startOffset) : range.startOffset;
        const globalEndOffset = endBlock ? computeGlobalOffset(endBlock, range.endContainer, range.endOffset) : range.endOffset;
        currentSelection = {
          text,
          blockIndex,
          endBlockIndex: endBlockIndex >= 0 ? endBlockIndex : blockIndex,
          startOffset: globalStartOffset,
          endOffset: globalEndOffset,
          range: range.cloneRange()
        };
        menu.style.display = "block";
        menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + "px";
        menu.style.top = Math.min(e.clientY, window.innerHeight - 150) + "px";
      });
      document.addEventListener("click", (e) => {
        if (!menu.contains(e.target)) {
          menu.style.display = "none";
        }
      });
      document.getElementById("menuAddComment").addEventListener("click", () => {
        menu.style.display = "none";
        openCommentModal();
      });
      document.getElementById("menuMarkDelete").addEventListener("click", () => {
        menu.style.display = "none";
        markDelete();
      });
      document.getElementById("menuAddInsert").addEventListener("click", () => {
        menu.style.display = "none";
        openInsertModal("after");
      });
      document.getElementById("menuAddInsertBefore").addEventListener("click", () => {
        menu.style.display = "none";
        openInsertModal("before");
      });
    }
    function setupCommentModal() {
      const modal = document.getElementById("commentModal");
      const uploadZone = document.getElementById("imageUploadZone");
      const imageInput = document.getElementById("imageInput");
      document.getElementById("btnCloseModal").addEventListener("click", closeCommentModal);
      document.getElementById("btnCancelComment").addEventListener("click", closeCommentModal);
      document.getElementById("btnSubmitComment").addEventListener("click", submitComment);
      uploadZone.addEventListener("click", async (e) => {
        if (e.target === imageInput) return;
        try {
          const sourceDir = Store.getSourceDir();
          const result = await _callHost("pickImage", { sourceDir });
          if (result && result.success && result.images && result.images.length > 0) {
            for (const img of result.images) {
              if (img.success && img.imagePath) {
                pendingImages.push(img.imagePath);
              }
            }
            const pathImages = pendingImages.filter((p) => !isBase64Image(p) && !_annotationImageUriCache[p]);
            if (pathImages.length > 0) {
              await resolveAnnotationImageUris(pathImages);
            }
            renderImagePreviews();
          }
        } catch (err) {
          console.warn("[annotations] pickImage \u5931\u8D25\uFF0C\u964D\u7EA7\u5C1D\u8BD5 file input:", err);
          imageInput.click();
        }
      });
      uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadZone.classList.add("drag-over");
      });
      uploadZone.addEventListener("dragleave", () => {
        uploadZone.classList.remove("drag-over");
      });
      uploadZone.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadZone.classList.remove("drag-over");
        handleImageFiles(e.dataTransfer.files);
      });
      imageInput.addEventListener("change", () => {
        handleImageFiles(imageInput.files);
        imageInput.value = "";
      });
      modal.addEventListener("paste", (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        const imageFiles = [];
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }
        if (imageFiles.length > 0) {
          e.preventDefault();
          handleImageFiles(imageFiles);
        }
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCommentModal();
      });
    }
    async function openCommentModal(editId) {
      editingAnnotationId = editId || null;
      if (editingAnnotationId) {
        const ann = Store.getAnnotations().find((a) => a.id === editingAnnotationId);
        if (!ann) return;
        pendingImages = ann.images ? [...ann.images] : [];
        const pathImages = pendingImages.filter((img) => !isBase64Image(img));
        if (pathImages.length > 0) {
          await resolveAnnotationImageUris(pathImages);
        }
        document.getElementById("selectedTextPreview").textContent = ann.selectedText;
        document.getElementById("commentText").value = ann.comment || "";
        document.getElementById("commentModalTitle").textContent = t("modal.comment.edit_title");
      } else {
        if (!currentSelection) return;
        pendingImages = [];
        document.getElementById("selectedTextPreview").textContent = currentSelection.text;
        document.getElementById("commentText").value = "";
        document.getElementById("commentModalTitle").textContent = t("modal.comment.title");
      }
      renderImagePreviews();
      document.getElementById("commentModal").style.display = "flex";
      setTimeout(() => document.getElementById("commentText").focus(), 100);
    }
    function closeCommentModal() {
      document.getElementById("commentModal").style.display = "none";
      pendingImages = [];
      currentSelection = null;
      editingAnnotationId = null;
    }
    function submitComment() {
      const comment = document.getElementById("commentText").value.trim();
      if (!comment && pendingImages.length === 0) {
        document.getElementById("commentText").focus();
        return;
      }
      if (editingAnnotationId) {
        Store.updateAnnotation(editingAnnotationId, {
          comment,
          images: [...pendingImages]
        });
      } else {
        if (!currentSelection) return;
        Store.addAnnotation({
          type: "comment",
          selectedText: currentSelection.text,
          blockIndex: currentSelection.blockIndex,
          endBlockIndex: currentSelection.endBlockIndex || currentSelection.blockIndex,
          startOffset: currentSelection.startOffset,
          endOffset: currentSelection.endOffset,
          comment,
          images: [...pendingImages]
        });
      }
      closeCommentModal();
      refreshView();
    }
    function handleImageFiles(files) {
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target.result;
          try {
            const sourceDir = Store.getSourceDir();
            const result = await _callHost("saveAnnotationImage", { base64Data, sourceDir });
            if (result && result.success && result.imagePath) {
              pendingImages.push(result.imagePath);
              await resolveAnnotationImageUris([result.imagePath]);
              renderImagePreviews();
            } else {
              console.warn("[annotations] \u4FDD\u5B58\u56FE\u7247\u5931\u8D25:", result?.error);
            }
          } catch (err) {
            console.warn("[annotations] \u4FDD\u5B58\u56FE\u7247\u5F02\u5E38:", err);
            pendingImages.push(base64Data);
            renderImagePreviews();
          }
        };
        reader.readAsDataURL(file);
      });
    }
    function renderImagePreviews() {
      const container = document.getElementById("imagePreviews");
      container.innerHTML = pendingImages.map((img, i) => {
        const src = getImageSrc(img);
        return `
                <div class="image-preview-item">
                    <img src="${src}" alt="\u9884\u89C8${i}">
                    <button class="remove-image" data-index="${i}">&times;</button>
                </div>
            `;
      }).join("");
      container.querySelectorAll(".remove-image").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          pendingImages.splice(parseInt(btn.dataset.index), 1);
          renderImagePreviews();
        });
      });
    }
    function markDelete() {
      if (!currentSelection) {
        console.warn("[annotations] markDelete: currentSelection \u4E3A\u7A7A\uFF0C\u65E0\u6CD5\u6807\u8BB0\u5220\u9664");
        return;
      }
      Store.addAnnotation({
        type: "delete",
        selectedText: currentSelection.text,
        blockIndex: currentSelection.blockIndex,
        endBlockIndex: currentSelection.endBlockIndex || currentSelection.blockIndex,
        startOffset: currentSelection.startOffset,
        endOffset: currentSelection.endOffset,
        comment: "",
        images: []
      });
      currentSelection = null;
      window.getSelection().removeAllRanges();
      refreshView();
    }
    function setupInsertModal() {
      const modal = document.getElementById("insertModal");
      document.getElementById("btnCloseInsertModal").addEventListener("click", closeInsertModal);
      document.getElementById("btnCancelInsert").addEventListener("click", closeInsertModal);
      document.getElementById("btnSubmitInsert").addEventListener("click", submitInsert);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeInsertModal();
      });
    }
    let editingInsertId = null;
    function openInsertModal(position) {
      if (!currentSelection) return;
      editingInsertId = null;
      currentInsertPosition = position || "after";
      const titleEl = document.getElementById("insertModalTitle");
      const labelEl = document.getElementById("insertPositionLabel");
      if (currentInsertPosition === "before") {
        titleEl.textContent = t("modal.insert.title_before");
        labelEl.textContent = t("modal.insert.position_before");
      } else {
        titleEl.textContent = t("modal.insert.title_after");
        labelEl.textContent = t("modal.insert.position_after");
      }
      document.getElementById("insertPositionPreview").textContent = currentSelection.text;
      document.getElementById("insertText").value = "";
      document.getElementById("insertReason").value = "";
      document.getElementById("insertModal").style.display = "flex";
      setTimeout(() => document.getElementById("insertText").focus(), 100);
    }
    function openInsertModalForEdit(id) {
      const ann = Store.getAnnotations().find((a) => a.id === id);
      if (!ann) return;
      editingInsertId = id;
      currentInsertPosition = ann.insertPosition || "after";
      const titleEl = document.getElementById("insertModalTitle");
      const labelEl = document.getElementById("insertPositionLabel");
      if (currentInsertPosition === "before") {
        titleEl.textContent = t("modal.insert.title_before");
        labelEl.textContent = t("modal.insert.position_before");
      } else {
        titleEl.textContent = t("modal.insert.title_after");
        labelEl.textContent = t("modal.insert.position_after");
      }
      document.getElementById("insertPositionPreview").textContent = ann.selectedText;
      document.getElementById("insertText").value = ann.insertContent || "";
      document.getElementById("insertReason").value = ann.comment || "";
      document.getElementById("insertModal").style.display = "flex";
      setTimeout(() => document.getElementById("insertText").focus(), 100);
    }
    function closeInsertModal() {
      document.getElementById("insertModal").style.display = "none";
      currentSelection = null;
      editingInsertId = null;
      currentInsertPosition = "after";
    }
    function submitInsert() {
      const insertContent = document.getElementById("insertText").value.trim();
      const insertReason = document.getElementById("insertReason").value.trim();
      if (!insertContent) {
        document.getElementById("insertText").focus();
        return;
      }
      if (editingInsertId) {
        Store.updateAnnotation(editingInsertId, {
          insertContent,
          comment: insertReason
        });
      } else {
        if (!currentSelection) return;
        const isBefore = currentInsertPosition === "before";
        Store.addAnnotation({
          type: "insert",
          selectedText: currentSelection.text,
          blockIndex: currentSelection.blockIndex,
          endBlockIndex: currentSelection.endBlockIndex || currentSelection.blockIndex,
          startOffset: isBefore ? currentSelection.startOffset : currentSelection.endOffset,
          endOffset: isBefore ? currentSelection.startOffset : currentSelection.endOffset,
          comment: insertReason,
          insertContent,
          insertPosition: currentInsertPosition,
          images: []
        });
      }
      closeInsertModal();
      refreshView();
    }
    function setupAnnotationClicks() {
      document.getElementById("documentContent").addEventListener("click", (e) => {
        const indicator = e.target.closest("[data-annotation-id]");
        if (!indicator) return;
        const id = parseInt(indicator.dataset.annotationId);
        scrollToAnnotationCard(id);
      });
    }
    function scrollToAnnotationCard(id) {
      const card = document.querySelector(`.annotation-card[data-id="${id}"]`);
      if (card) {
        document.querySelectorAll(".annotation-card.active").forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    async function renderAnnotationsList() {
      const list = document.getElementById("annotationsList");
      const annotations = Store.getAnnotations();
      const allImagePaths = [];
      annotations.forEach((ann) => {
        if (ann.images && ann.images.length > 0) {
          ann.images.forEach((img) => {
            if (!isBase64Image(img)) {
              allImagePaths.push(img);
            }
          });
        }
      });
      if (allImagePaths.length > 0) {
        await resolveAnnotationImageUris(allImagePaths);
      }
      let sortedAnnotations;
      if (currentSortMode === "time") {
        sortedAnnotations = [...annotations].sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
      } else {
        sortedAnnotations = [...annotations].sort((a, b) => {
          if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
          return (a.startOffset || 0) - (b.startOffset || 0);
        });
      }
      if (annotationSearchQuery) {
        const lowerQuery = annotationSearchQuery.toLowerCase();
        sortedAnnotations = sortedAnnotations.filter((ann) => {
          const text = (ann.selectedText || "").toLowerCase();
          const comment = (ann.comment || "").toLowerCase();
          const insertContent = (ann.insertContent || "").toLowerCase();
          return text.includes(lowerQuery) || comment.includes(lowerQuery) || insertContent.includes(lowerQuery);
        });
      }
      if (sortedAnnotations.length === 0) {
        if (annotationSearchQuery) {
          list.innerHTML = `
                    <div class="annotation-no-results">
                        <p>${t("annotations.no_results")}</p>
                    </div>
                `;
          const countEl0 = document.getElementById("annotationCount");
          if (countEl0) countEl0.textContent = t("toolbar.annotations_count", { count: 0 });
        } else {
          list.innerHTML = `
                    <div class="empty-annotations">
                        <p>${t("annotations.empty")}</p>
                        <p class="hint">${t("annotations.empty_hint")}</p>
                    </div>
                `;
          const countElZ = document.getElementById("annotationCount");
          if (countElZ) countElZ.textContent = t("toolbar.annotations_zero");
        }
        return;
      }
      const countEl = document.getElementById("annotationCount");
      if (countEl) countEl.textContent = t("toolbar.annotations_count", { count: sortedAnnotations.length });
      list.innerHTML = sortedAnnotations.map((ann) => {
        const typeLabel = ann.type === "comment" ? t("annotation.type_comment") : ann.type === "delete" ? t("annotation.type_delete") : ann.insertPosition === "before" ? t("annotation.type_insert_before") : t("annotation.type_insert_after");
        const imagesHtml = ann.images && ann.images.length > 0 ? `<div class="annotation-images">${ann.images.map((img) => `<img src="${getImageSrc(img)}" alt="${t("annotation.image_alt")}" data-lightbox>`).join("")}</div>` : "";
        const commentHtml = ann.comment ? `<div class="annotation-comment">${escapeHtml(ann.comment)}</div>` : "";
        const insertHtml = ann.type === "insert" && ann.insertContent ? `<div class="annotation-insert-content">\u{1F4DD} ${escapeHtml(ann.insertContent)}</div>` : "";
        const locale = window.I18n && window.I18n.getLocale() === "en" ? "en-US" : "zh-CN";
        const time = new Date(ann.timestamp).toLocaleString(locale, {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
        return `
                <div class="annotation-card type-${ann.type}" data-id="${ann.id}">
                    <div class="annotation-card-header">
                        <span class="annotation-type ${ann.type}">#${ann.id} ${typeLabel}</span>
                        <span class="annotation-index">${t("annotation.block_index", { index: ann.blockIndex + 1 })}</span>
                    </div>
                    <div class="annotation-selected-text">${ann.type === "insert" ? ann.insertPosition === "before" ? t("annotation.insert_before_label") : t("annotation.insert_after_label") : ""}${escapeHtml(ann.selectedText)}</div>
                    ${commentHtml}
                    ${insertHtml}
                    ${imagesHtml}
                    <div class="annotation-card-footer">
                        <span class="annotation-time">${time}</span>
                        <div class="annotation-actions">
                            ${ann.type !== "delete" ? `<button data-edit="${ann.id}">${t("annotation.edit")}</button>` : ""}
                            <button data-remove="${ann.id}">${t("annotation.type_delete")}</button>
                        </div>
                    </div>
                </div>
            `;
      }).join("");
      list.querySelectorAll("[data-edit]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.edit);
          const ann = Store.getAnnotations().find((a) => a.id === id);
          if (!ann) return;
          if (ann.type === "insert") {
            openInsertModalForEdit(id);
          } else {
            openCommentModal(id);
          }
        });
      });
      list.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          const id = parseInt(btn.dataset.remove);
          if (isNaN(id)) return;
          Store.removeAnnotation(id);
          refreshView();
        });
      });
      list.querySelectorAll(".annotation-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest("[data-remove]") || e.target.closest("[data-edit]") || e.target.closest("[data-lightbox]")) return;
          const id = parseInt(card.dataset.id);
          let highlight = document.querySelector(`span.highlight-comment[data-annotation-id="${id}"], span.highlight-delete[data-annotation-id="${id}"], span.insert-marker[data-annotation-id="${id}"]`);
          if (!highlight) {
            highlight = document.querySelector(`span.annotation-fallback-marker[data-annotation-id="${id}"]`);
          }
          if (!highlight) {
            const ann = Store.getAnnotations().find((a) => a.id === id);
            if (ann) {
              const block = document.querySelector(`.md-block[data-block-index="${ann.blockIndex}"]`);
              if (block) {
                block.scrollIntoView({ behavior: "smooth", block: "center" });
                block.style.transition = "background 0.3s";
                block.style.background = "rgba(79, 70, 229, 0.12)";
                setTimeout(() => {
                  block.style.background = "";
                }, 1500);
              }
            }
          } else {
            const target = highlight.style.display === "none" ? highlight.parentElement : highlight;
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "center" });
              target.style.transition = "background 0.3s";
              target.style.background = "rgba(79, 70, 229, 0.4)";
              setTimeout(() => {
                target.style.background = "";
              }, 1500);
            }
          }
          document.querySelectorAll(".annotation-card.active").forEach((c) => c.classList.remove("active"));
          card.classList.add("active");
        });
      });
      list.querySelectorAll("[data-lightbox]").forEach((img) => {
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          showLightbox(img.src);
        });
      });
    }
    function showLightbox(src) {
      const lb = document.createElement("div");
      lb.className = "image-lightbox";
      lb.innerHTML = `<img src="${src}" alt="\u5927\u56FE">`;
      lb.addEventListener("click", () => lb.remove());
      document.body.appendChild(lb);
    }
    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
    function refreshView() {
      const data = Store.getData();
      Renderer.renderBlocks(blocks, data.annotations);
      renderAnnotationsList();
      updateToolbarState();
      if (globalThis.Exporter && Exporter.triggerAutoSave) {
        Exporter.triggerAutoSave();
      }
    }
    function setBlocks(b) {
      blocks = b;
    }
    function updateToolbarState() {
      const hasAnnotations = Store.getAnnotations().length > 0;
      document.getElementById("btnExport").disabled = !hasAnnotations;
      document.getElementById("btnClearAll").disabled = !hasAnnotations;
      const applyBtn = document.getElementById("btnApplyReview");
      if (applyBtn) applyBtn.disabled = !hasAnnotations;
    }
    return {
      init,
      renderAnnotationsList,
      refreshView,
      setBlocks,
      updateToolbarState
    };
  })();

  // webview/js/export.js
  var Exporter2 = /* @__PURE__ */ (() => {
    let autoSaveEnabled = false;
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1500;
    function _reviewBaseName(data) {
      const baseName = data.fileName.replace(/\.(mdc|md)$/, "");
      const hash = data.pathHash || "";
      return hash ? `${hash}_${baseName}` : baseName;
    }
    function _isBase64Image(str) {
      return str && str.startsWith("data:image/");
    }
    function _hasBase64Images(annotations) {
      return annotations.some((a) => a.images && a.images.some((img) => _isBase64Image(img)));
    }
    async function exportReviewDocument() {
      const data = Store.getData();
      if (!data.annotations.length) {
        alert(t("notification.export_empty"));
        return;
      }
      const blocks = Renderer.parseMarkdown(data.rawMarkdown);
      const doc = generateReviewDoc(data, blocks);
      const rbaseName = _reviewBaseName(data);
      const version = data.reviewVersion || 1;
      const mdFileName = `${rbaseName}_v${version}_record.md`;
      const saved = await saveViaHost(mdFileName, doc);
      if (saved) {
        showExportSuccess(`\u5DF2\u4FDD\u5B58\u5230 .review \u76EE\u5F55\uFF1A${mdFileName}`);
        if (_hasBase64Images(data.annotations)) {
          const jsonFileName = `${rbaseName}_v${version}_data.json`;
          const json = JSON.stringify({
            fileName: data.fileName,
            rawMarkdown: data.rawMarkdown,
            reviewVersion: version,
            annotations: data.annotations
          }, null, 2);
          await saveViaHost(jsonFileName, json);
        }
        return;
      }
      showExportSuccess("\u5BFC\u51FA\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u5DE5\u4F5C\u533A\u8BBE\u7F6E");
    }
    function showExportSuccess(msg) {
      let toast = document.getElementById("_toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "_toast";
        toast.className = "toast-notification";
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 3e3);
    }
    function generateReviewDoc(data, blocks) {
      const lines = [];
      const docVersion = data.docVersion || t("export.unknown");
      lines.push(`# ${t("export.title")}`);
      lines.push(``);
      lines.push(`- **${t("export.source_file")}**\uFF1A${data.fileName}`);
      if (data.sourceFilePath) {
        lines.push(`- **${t("export.source_path")}**\uFF1A${data.sourceFilePath}`);
      }
      lines.push(`- **${t("export.source_version")}**\uFF1A${docVersion}`);
      lines.push(`- **${t("export.review_time")}**\uFF1A${formatDate()}`);
      lines.push(`- **${t("export.review_version")}**\uFF1Av${data.reviewVersion || 1}`);
      lines.push(`- **${t("export.annotation_count")}**\uFF1A${data.annotations.length}`);
      lines.push(`  - ${t("export.type_comment")}\uFF1A${data.annotations.filter((a) => a.type === "comment").length}`);
      lines.push(`  - ${t("export.type_delete")}\uFF1A${data.annotations.filter((a) => a.type === "delete").length}`);
      lines.push(`  - ${t("export.type_insert_after")}\uFF1A${data.annotations.filter((a) => a.type === "insert" && a.insertPosition !== "before").length}`);
      lines.push(`  - ${t("export.type_insert_before")}\uFF1A${data.annotations.filter((a) => a.type === "insert" && a.insertPosition === "before").length}`);
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
      lines.push(`## ${t("export.section_instructions")}`);
      lines.push(``);
      lines.push(`> ${t("export.instruction_order_hint")}`);
      lines.push(`> ${t("export.instruction_anchor_hint")}`);
      lines.push(``);
      const sortedAnnotations = [...data.annotations].sort((a, b) => {
        if (a.blockIndex !== b.blockIndex) {
          return b.blockIndex - a.blockIndex;
        }
        return (b.startOffset || 0) - (a.startOffset || 0);
      });
      sortedAnnotations.forEach((ann, i) => {
        const num = i + 1;
        const blockContent = blocks[ann.blockIndex] || "";
        const blockFingerprint = blockContent.substring(0, 80).replace(/\n/g, " ");
        const insertLabel = ann.type === "insert" ? ann.insertPosition === "before" ? "\uFF08\u524D\u63D2\uFF09" : "\uFF08\u540E\u63D2\uFF09" : "";
        lines.push(`### \u6307\u4EE4 ${num}${ann.type === "comment" ? "\uFF08\u4FEE\u6539\uFF09" : ann.type === "delete" ? "\uFF08\u5220\u9664\uFF09" : insertLabel}`);
        lines.push(``);
        if (ann.type === "comment") {
          lines.push(`- **\u64CD\u4F5C**\uFF1A\u6839\u636E\u8BC4\u8BBA\u4FEE\u6539\u5185\u5BB9`);
          lines.push(`- **\u5B9A\u4F4D\u5757**\uFF1A\u7B2C ${ann.blockIndex + 1} \u5757`);
          if (blockFingerprint) {
            lines.push(`- **\u6587\u672C\u951A\u70B9**\uFF1A\`${blockFingerprint}\``);
          }
          if (ann.startOffset != null) {
            lines.push(`- **\u5757\u5185\u504F\u79FB**\uFF1A\u7B2C ${ann.startOffset} \u4E2A\u5B57\u7B26\u5904\uFF08startOffset=${ann.startOffset}\uFF09`);
          }
          lines.push(`- **\u76EE\u6807\u6587\u672C**\uFF1A`);
          lines.push(`\`\`\``);
          lines.push(ann.selectedText);
          lines.push(`\`\`\``);
          lines.push(`- **\u8BC4\u8BBA\u5185\u5BB9**\uFF1A${ann.comment}`);
          if (ann.images && ann.images.length > 0) {
            lines.push(`- **\u9644\u56FE**\uFF1A\u5171 ${ann.images.length} \u5F20`);
            ann.images.forEach((img, j) => {
              lines.push(`  - \u56FE\u7247${j + 1}\uFF1A`);
              lines.push(`  ![\u9644\u56FE${j + 1}](${img})`);
            });
          }
        } else if (ann.type === "delete") {
          lines.push(`- **\u64CD\u4F5C**\uFF1A\u5220\u9664\u4EE5\u4E0B\u6587\u672C`);
          lines.push(`- **\u5B9A\u4F4D\u5757**\uFF1A\u7B2C ${ann.blockIndex + 1} \u5757`);
          if (blockFingerprint) {
            lines.push(`- **\u6587\u672C\u951A\u70B9**\uFF1A\`${blockFingerprint}\``);
          }
          if (ann.startOffset != null) {
            lines.push(`- **\u5757\u5185\u504F\u79FB**\uFF1A\u7B2C ${ann.startOffset} \u4E2A\u5B57\u7B26\u5904\uFF08startOffset=${ann.startOffset}\uFF09`);
          }
          lines.push(`- **\u8981\u5220\u9664\u7684\u6587\u672C**\uFF1A`);
          lines.push(`\`\`\``);
          lines.push(ann.selectedText);
          lines.push(`\`\`\``);
        } else if (ann.type === "insert") {
          const isBefore = ann.insertPosition === "before";
          lines.push(`- **\u64CD\u4F5C**\uFF1A\u5728\u6307\u5B9A\u4F4D\u7F6E${isBefore ? "\u524D" : "\u540E"}\u63D2\u5165\u65B0\u5185\u5BB9`);
          lines.push(`- **\u5B9A\u4F4D\u5757**\uFF1A\u7B2C ${ann.blockIndex + 1} \u5757`);
          if (blockFingerprint) {
            lines.push(`- **\u6587\u672C\u951A\u70B9**\uFF1A\`${blockFingerprint}\``);
          }
          if (ann.startOffset != null) {
            lines.push(`- **\u5757\u5185\u504F\u79FB**\uFF1A\u7B2C ${ann.startOffset} \u4E2A\u5B57\u7B26\u5904\uFF08startOffset=${ann.startOffset}\uFF09`);
          }
          lines.push(`- **\u63D2\u5165\u4F4D\u7F6E\uFF08\u5728\u6B64\u6587\u672C\u4E4B${isBefore ? "\u524D" : "\u540E"}\uFF09**\uFF1A`);
          lines.push(`\`\`\``);
          lines.push(ann.selectedText);
          lines.push(`\`\`\``);
          lines.push(`- **\u8981\u63D2\u5165\u7684\u5185\u5BB9**\uFF1A`);
          lines.push(`\`\`\``);
          lines.push(ann.insertContent);
          lines.push(`\`\`\``);
          if (ann.comment) {
            lines.push(`- **\u63D2\u5165\u8BF4\u660E**\uFF1A${ann.comment}`);
          }
        }
        lines.push(``);
      });
      lines.push(`---`);
      lines.push(``);
      lines.push(`## \u539F\u59CB\u6570\u636E\uFF08JSON\uFF09`);
      lines.push(``);
      lines.push(`> \u5982\u9700\u7CBE\u786E\u64CD\u4F5C\uFF0C\u53EF\u4F7F\u7528\u4EE5\u4E0B JSON \u6570\u636E\u3002\u5176\u4E2D \`blockIndex\` \u662F\u57FA\u4E8E\u7A7A\u884C\u5206\u5272\u7684\u5757\u7D22\u5F15\uFF08\u4ECE0\u5F00\u59CB\uFF09\uFF0C\`startOffset\` \u662F\u76EE\u6807\u6587\u672C\u5728\u5757\u5185\u7684\u5B57\u7B26\u504F\u79FB\u91CF\uFF08\u4ECE0\u5F00\u59CB\uFF09\uFF0C\u53EF\u7528\u4E8E\u533A\u5206\u540C\u4E00\u5757\u5185\u7684\u91CD\u590D\u6587\u672C\u3002`);
      lines.push(``);
      lines.push(`\`\`\`json`);
      const exportAnnotations = data.annotations.map((a) => ({ ...a }));
      lines.push(JSON.stringify({
        fileName: data.fileName,
        docVersion: data.docVersion || "\u672A\u77E5",
        reviewVersion: data.reviewVersion || 1,
        annotationCount: data.annotations.length,
        rawMarkdown: data.rawMarkdown || "",
        annotations: exportAnnotations
      }, null, 2));
      lines.push(`\`\`\``);
      if (data.annotations.some((a) => a.images && a.images.length > 0)) {
        const hasBase64 = _hasBase64Images(data.annotations);
        const hasPathImages = data.annotations.some((a) => a.images && a.images.some((img) => !_isBase64Image(img)));
        lines.push(``);
        if (hasPathImages) {
          lines.push(`> **\u6CE8\u610F**\uFF1A\u6279\u6CE8\u4E2D\u5305\u542B\u56FE\u7247\u9644\u4EF6\uFF0C\u56FE\u7247\u6587\u4EF6\u5B58\u50A8\u5728 .review \u76EE\u5F55\u7684 images \u5B50\u76EE\u5F55\u4E2D\u3002`);
        }
        if (hasBase64) {
          lines.push(`> **\u6CE8\u610F**\uFF1A\u90E8\u5206\u6279\u6CE8\u5305\u542B Base64 \u56FE\u7247\u6570\u636E\uFF0C\u5B8C\u6574\u56FE\u7247\u6570\u636E\u5DF2\u540C\u65F6\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6\uFF0C\u8BF7\u4E00\u5E76\u53D1\u9001\u7ED9 AI\u3002`);
        }
      }
      return lines.join("\n");
    }
    function formatDate() {
      const d = /* @__PURE__ */ new Date();
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    }
    function saveViaHost(fileName, content) {
      return new Promise((resolve) => {
        const requestId = "save_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        const handler = (event) => {
          const msg = event.data;
          if (msg.type === "reviewSaved" && msg.requestId === requestId) {
            window.removeEventListener("message", handler);
            resolve(msg.payload && msg.payload.success);
          }
        };
        window.addEventListener("message", handler);
        vscode.postMessage({ type: "saveReview", payload: { fileName, content }, requestId });
        setTimeout(() => {
          window.removeEventListener("message", handler);
          resolve(false);
        }, 5e3);
      });
    }
    function enableAutoSave() {
      autoSaveEnabled = true;
      doAutoSave();
      return true;
    }
    function disableAutoSave() {
      autoSaveEnabled = false;
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
    }
    function triggerAutoSave() {
      if (!autoSaveEnabled) {
        autoSaveEnabled = true;
      }
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      autoSaveTimer = setTimeout(() => doAutoSave(), AUTO_SAVE_DELAY);
    }
    async function doAutoSave() {
      const data = Store.getData();
      if (!data.fileName) return;
      if (!data.annotations.length) {
        const version = data.reviewVersion || 1;
        try {
          const blocks = Renderer.parseMarkdown(data.rawMarkdown);
          const doc = generateReviewDoc(data, blocks);
          const rbaseName = _reviewBaseName(data);
          const mdFileName = `${rbaseName}_v${version}_record.md`;
          const saved = await saveViaHost(mdFileName, doc);
          updateAutoSaveStatus(saved ? "saved" : "error");
        } catch (e) {
          console.error("[AutoSave] \u7A7A\u7248\u672C\u5360\u4F4D\u8BB0\u5F55\u4FDD\u5B58\u5931\u8D25:", e);
          updateAutoSaveStatus("error");
        }
        return;
      }
      try {
        const blocks = Renderer.parseMarkdown(data.rawMarkdown);
        const doc = generateReviewDoc(data, blocks);
        const rbaseName = _reviewBaseName(data);
        const version = data.reviewVersion || 1;
        const mdFileName = `${rbaseName}_v${version}_record.md`;
        const saved = await saveViaHost(mdFileName, doc);
        if (saved) {
          updateAutoSaveStatus("saved");
          if (_hasBase64Images(data.annotations)) {
            const jsonFileName = `${rbaseName}_v${version}_data.json`;
            const json = JSON.stringify({
              fileName: data.fileName,
              rawMarkdown: data.rawMarkdown,
              reviewVersion: version,
              annotations: data.annotations
            }, null, 2);
            await saveViaHost(jsonFileName, json);
          }
        } else {
          updateAutoSaveStatus("error");
        }
      } catch (e) {
        console.error("[AutoSave] \u81EA\u52A8\u4FDD\u5B58\u5F02\u5E38:", e);
        updateAutoSaveStatus("error");
      }
    }
    function updateAutoSaveStatus(status) {
      const indicator = document.getElementById("autoSaveStatus");
      if (!indicator) return;
      if (status === "saved") {
        indicator.textContent = "\u2713 \u5DF2\u81EA\u52A8\u4FDD\u5B58";
        indicator.className = "auto-save-status saved";
      } else if (status === "error") {
        indicator.textContent = t("notification.auto_save_failed");
        indicator.className = "auto-save-status error";
      }
      setTimeout(() => {
        if (indicator.textContent !== "\u2717 \u4FDD\u5B58\u5931\u8D25") {
          indicator.className = "auto-save-status";
        }
      }, 5e3);
    }
    function isAutoSaveEnabled() {
      return autoSaveEnabled;
    }
    return {
      exportReviewDocument,
      generateReviewDoc,
      enableAutoSave,
      disableAutoSave,
      triggerAutoSave,
      isAutoSaveEnabled
    };
  })();

  // webview/js/settings.js
  var Settings2 = (() => {
    const DEFAULTS = {
      fontSize: 16,
      lineHeight: 1.6,
      contentMaxWidth: 1100,
      fontFamily: "",
      codeFontFamily: "",
      theme: "light",
      showToc: true,
      showAnnotations: true,
      sidebarLayout: "toc-left",
      panelMode: "floating",
      documentAlign: "center",
      enableMermaid: true,
      enableMath: true,
      enablePlantUML: true,
      enableGraphviz: true,
      showLineNumbers: false,
      autoSave: true,
      autoSaveDelay: 1500,
      codeTheme: "default-light-modern",
      language: "zh-CN"
    };
    const DARK_CODE_THEMES = [
      "github-dark",
      "monokai",
      "vs2015",
      "atom-one-dark",
      "dracula",
      "nord",
      "solarized-dark",
      "tokyo-night",
      "one-dark-pro",
      "default-dark-modern"
    ];
    let currentSettings = { ...DEFAULTS };
    let panelVisible = false;
    let _onChangeCallbacks = [];
    function init() {
      vscode.postMessage({ type: "getSettings" });
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (currentSettings.theme === "auto") {
          applyTheme("auto");
          _notifyChange("themeChanged", "auto");
        }
      });
    }
    function applySettings(settings) {
      currentSettings = { ...DEFAULTS, ...settings };
      if (currentSettings.language && window.I18n) {
        window.I18n.setLocale(currentSettings.language);
      }
      applyToDOM();
      updatePanelUI();
    }
    function applyToDOM() {
      const root = document.documentElement;
      root.style.setProperty("--doc-font-size", currentSettings.fontSize + "px");
      root.style.setProperty("--doc-line-height", String(currentSettings.lineHeight));
      root.style.setProperty("--doc-max-width", currentSettings.contentMaxWidth + "px");
      const fontVal = currentSettings.fontFamily;
      if (fontVal === "serif") {
        root.style.setProperty("--doc-font-family", "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif");
      } else if (fontVal) {
        root.style.setProperty("--doc-font-family", "'" + fontVal + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
      } else {
        root.style.removeProperty("--doc-font-family");
      }
      const codeFontVal = currentSettings.codeFontFamily;
      const codeFontCss = codeFontVal ? "'" + codeFontVal + "', 'Fira Code', Consolas, 'Courier New', monospace" : "";
      if (codeFontVal) {
        root.style.setProperty("--code-font-family", codeFontCss);
      } else {
        root.style.removeProperty("--code-font-family");
      }
      applyCodeFontToElements();
      const docContent = document.getElementById("documentContent");
      if (docContent) {
        docContent.style.fontSize = currentSettings.fontSize + "px";
        docContent.style.lineHeight = String(currentSettings.lineHeight);
        docContent.style.maxWidth = currentSettings.contentMaxWidth + "px";
        if (fontVal === "serif") {
          docContent.style.fontFamily = "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif";
        } else if (fontVal) {
          docContent.style.fontFamily = "'" + fontVal + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        } else {
          docContent.style.fontFamily = "";
        }
      }
      applyTheme(currentSettings.theme);
      const tocPanel2 = document.getElementById("tocPanel");
      if (tocPanel2) {
        if (!currentSettings.showToc) {
          tocPanel2.classList.add("collapsed");
        } else {
          tocPanel2.classList.remove("collapsed");
        }
      }
      const btnToggleToc = document.getElementById("btnToggleToc");
      if (btnToggleToc) {
        btnToggleToc.classList.toggle("toc-active", currentSettings.showToc);
        btnToggleToc.classList.toggle("toc-inactive", !currentSettings.showToc);
      }
      const annotationsPanel = document.getElementById("annotationsPanel");
      if (annotationsPanel) {
        if (!currentSettings.showAnnotations) {
          annotationsPanel.classList.add("collapsed");
        } else {
          annotationsPanel.classList.remove("collapsed");
        }
      }
      const btnToggleAnnotations = document.getElementById("btnToggleAnnotations");
      if (btnToggleAnnotations) {
        btnToggleAnnotations.classList.toggle("panel-hidden", !currentSettings.showAnnotations);
      }
      if (currentSettings.sidebarLayout === "toc-right") {
        document.body.classList.add("sidebar-reversed");
      } else {
        document.body.classList.remove("sidebar-reversed");
      }
      if (currentSettings.showLineNumbers) {
        document.body.classList.add("show-line-numbers");
      } else {
        document.body.classList.remove("show-line-numbers");
      }
      if (currentSettings.panelMode === "embedded") {
        document.body.classList.add("panel-embedded");
      } else {
        document.body.classList.remove("panel-embedded");
      }
      document.body.setAttribute("data-doc-align", currentSettings.documentAlign || "center");
      applyCodeTheme(currentSettings.codeTheme);
    }
    function applyTheme(theme) {
      document.body.classList.remove("theme-light", "theme-dark");
      if (theme === "auto") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.classList.add(prefersDark ? "theme-dark" : "theme-light");
      } else if (theme === "dark") {
        document.body.classList.add("theme-dark");
      } else {
        document.body.classList.add("theme-light");
      }
    }
    function resolveCodeTheme(codeTheme) {
      if (codeTheme === "auto") {
        return DEFAULTS.codeTheme;
      }
      return codeTheme;
    }
    function applyCodeTheme(codeTheme) {
      const resolved = resolveCodeTheme(codeTheme);
      document.documentElement.setAttribute("data-code-theme", resolved);
      const isDarkCodeTheme = DARK_CODE_THEMES.includes(resolved);
      document.documentElement.setAttribute("data-code-theme-mode", isDarkCodeTheme ? "dark" : "light");
    }
    function show() {
      const overlay = document.getElementById("settingsOverlay");
      if (overlay) {
        overlay.style.display = "";
        requestAnimationFrame(() => {
          overlay.classList.add("visible");
        });
        panelVisible = true;
        updatePanelUI();
      }
    }
    function hide() {
      const overlay = document.getElementById("settingsOverlay");
      if (overlay) {
        overlay.classList.remove("visible");
        panelVisible = false;
        const onEnd = () => {
          overlay.removeEventListener("transitionend", onEnd);
          if (!panelVisible) {
            overlay.style.display = "none";
          }
        };
        overlay.addEventListener("transitionend", onEnd);
      }
    }
    function updatePanelUI() {
      if (!panelVisible) return;
      const fontSizeSlider = document.getElementById("settingFontSize");
      const fontSizeValue = document.getElementById("settingFontSizeValue");
      if (fontSizeSlider) fontSizeSlider.value = currentSettings.fontSize;
      if (fontSizeValue) fontSizeValue.textContent = currentSettings.fontSize + "px";
      const lineHeightSlider = document.getElementById("settingLineHeight");
      const lineHeightValue = document.getElementById("settingLineHeightValue");
      if (lineHeightSlider) lineHeightSlider.value = currentSettings.lineHeight;
      if (lineHeightValue) lineHeightValue.textContent = currentSettings.lineHeight.toFixed(1);
      const widthSlider = document.getElementById("settingMaxWidth");
      const widthValue = document.getElementById("settingMaxWidthValue");
      if (widthSlider) widthSlider.value = currentSettings.contentMaxWidth;
      if (widthValue) widthValue.textContent = currentSettings.contentMaxWidth + "px";
      const fontSelect = document.getElementById("settingFontFamily");
      const fontCustom = document.getElementById("settingFontFamilyCustom");
      if (fontSelect) {
        const isPreset = Array.from(fontSelect.options).some((o) => o.value === currentSettings.fontFamily);
        if (isPreset || !currentSettings.fontFamily) {
          fontSelect.value = currentSettings.fontFamily;
          if (fontCustom) fontCustom.style.display = "none";
        } else {
          fontSelect.value = "__custom__";
          if (fontCustom) {
            fontCustom.style.display = "";
            fontCustom.value = currentSettings.fontFamily;
          }
        }
      }
      const codeFontSelect = document.getElementById("settingCodeFontFamily");
      const codeFontCustom = document.getElementById("settingCodeFontFamilyCustom");
      if (codeFontSelect) {
        const isPreset = Array.from(codeFontSelect.options).some((o) => o.value === currentSettings.codeFontFamily);
        if (isPreset || !currentSettings.codeFontFamily) {
          codeFontSelect.value = currentSettings.codeFontFamily;
          if (codeFontCustom) codeFontCustom.style.display = "none";
        } else {
          codeFontSelect.value = "__custom__";
          if (codeFontCustom) {
            codeFontCustom.style.display = "";
            codeFontCustom.value = currentSettings.codeFontFamily;
          }
        }
      }
      document.querySelectorAll(".theme-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === currentSettings.theme);
      });
      const langSel = document.getElementById("settingLanguage");
      if (langSel) langSel.value = currentSettings.language || "zh-CN";
      const codeThemeSelect = document.getElementById("settingCodeTheme");
      if (codeThemeSelect) codeThemeSelect.value = currentSettings.codeTheme;
      updateCodePreview();
      const tocSwitch = document.getElementById("settingShowToc");
      if (tocSwitch) tocSwitch.checked = currentSettings.showToc;
      const annotationsSwitch = document.getElementById("settingShowAnnotations");
      if (annotationsSwitch) annotationsSwitch.checked = currentSettings.showAnnotations;
      document.querySelectorAll(".sidebar-layout-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.layout === currentSettings.sidebarLayout);
      });
      document.querySelectorAll(".panel-mode-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === currentSettings.panelMode);
      });
      document.querySelectorAll(".doc-align-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.align === currentSettings.documentAlign);
      });
      const mermaidSwitch = document.getElementById("settingEnableMermaid");
      if (mermaidSwitch) mermaidSwitch.checked = currentSettings.enableMermaid;
      const mathSwitch = document.getElementById("settingEnableMath");
      if (mathSwitch) mathSwitch.checked = currentSettings.enableMath;
      const plantumlSwitch = document.getElementById("settingEnablePlantUML");
      if (plantumlSwitch) plantumlSwitch.checked = currentSettings.enablePlantUML;
      const graphvizSwitch = document.getElementById("settingEnableGraphviz");
      if (graphvizSwitch) graphvizSwitch.checked = currentSettings.enableGraphviz;
      const lineNumSwitch = document.getElementById("settingShowLineNumbers");
      if (lineNumSwitch) lineNumSwitch.checked = currentSettings.showLineNumbers;
      const autoSaveSwitch = document.getElementById("settingAutoSave");
      if (autoSaveSwitch) autoSaveSwitch.checked = currentSettings.autoSave;
      const delaySlider = document.getElementById("settingAutoSaveDelay");
      const delayValue = document.getElementById("settingAutoSaveDelayValue");
      if (delaySlider) delaySlider.value = currentSettings.autoSaveDelay;
      if (delayValue) delayValue.textContent = (currentSettings.autoSaveDelay / 1e3).toFixed(1) + "s";
      updateTypographyPreview();
    }
    function updateCodePreview() {
      const previewContainer = document.getElementById("codeThemePreview");
      if (!previewContainer) return;
      const previewTheme = currentSettings.codeTheme;
      previewContainer.setAttribute("data-code-theme", previewTheme);
    }
    function updateTypographyPreview() {
      const preview = document.getElementById("typographyPreview");
      if (!preview) return;
      preview.style.fontSize = currentSettings.fontSize + "px";
      preview.style.lineHeight = String(currentSettings.lineHeight);
      preview.style.maxWidth = currentSettings.contentMaxWidth + "px";
      const fv = currentSettings.fontFamily;
      if (fv === "serif") {
        preview.style.fontFamily = "Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif";
      } else if (fv) {
        preview.style.fontFamily = "'" + fv + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      } else {
        preview.style.fontFamily = "";
      }
    }
    function bindEvents() {
      const btnSettings = document.getElementById("btnSettings");
      if (btnSettings) btnSettings.addEventListener("click", show);
      const closeBtn = document.getElementById("btnCloseSettings");
      if (closeBtn) closeBtn.addEventListener("click", hide);
      const overlay = document.getElementById("settingsOverlay");
      if (overlay) {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) hide();
        });
      }
      document.querySelectorAll(".theme-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentSettings.theme = btn.dataset.theme;
          document.querySelectorAll(".theme-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          applyToDOM();
          saveSettings();
          _notifyChange("themeChanged", btn.dataset.theme);
        });
      });
      const langSelect = document.getElementById("settingLanguage");
      if (langSelect) {
        langSelect.addEventListener("change", () => {
          currentSettings.language = langSelect.value;
          if (window.I18n) {
            window.I18n.setLocale(currentSettings.language);
          }
          saveSettings();
          _notifyChange("languageChanged", currentSettings.language);
        });
      }
      const codeThemeSelect = document.getElementById("settingCodeTheme");
      if (codeThemeSelect) {
        codeThemeSelect.addEventListener("change", () => {
          currentSettings.codeTheme = codeThemeSelect.value;
          applyCodeTheme(currentSettings.codeTheme);
          updateCodePreview();
          saveSettings();
        });
      }
      const fontFamilySelect = document.getElementById("settingFontFamily");
      const fontFamilyCustom = document.getElementById("settingFontFamilyCustom");
      if (fontFamilySelect) {
        fontFamilySelect.addEventListener("change", () => {
          if (fontFamilySelect.value === "__custom__") {
            if (fontFamilyCustom) {
              fontFamilyCustom.style.display = "";
              fontFamilyCustom.focus();
            }
          } else {
            if (fontFamilyCustom) fontFamilyCustom.style.display = "none";
            currentSettings.fontFamily = fontFamilySelect.value;
            applyToDOM();
            updateTypographyPreview();
            saveSettings();
          }
        });
      }
      if (fontFamilyCustom) {
        fontFamilyCustom.addEventListener("change", () => {
          currentSettings.fontFamily = fontFamilyCustom.value.trim();
          applyToDOM();
          updateTypographyPreview();
          saveSettings();
        });
      }
      const codeFontSelect = document.getElementById("settingCodeFontFamily");
      const codeFontCustom = document.getElementById("settingCodeFontFamilyCustom");
      if (codeFontSelect) {
        codeFontSelect.addEventListener("change", () => {
          if (codeFontSelect.value === "__custom__") {
            if (codeFontCustom) {
              codeFontCustom.style.display = "";
              codeFontCustom.focus();
            }
          } else {
            if (codeFontCustom) codeFontCustom.style.display = "none";
            currentSettings.codeFontFamily = codeFontSelect.value;
            applyToDOM();
            saveSettings();
          }
        });
      }
      if (codeFontCustom) {
        codeFontCustom.addEventListener("change", () => {
          currentSettings.codeFontFamily = codeFontCustom.value.trim();
          applyToDOM();
          saveSettings();
        });
      }
      const fontSizeSlider = document.getElementById("settingFontSize");
      if (fontSizeSlider) {
        fontSizeSlider.addEventListener("input", () => {
          currentSettings.fontSize = parseInt(fontSizeSlider.value);
          document.getElementById("settingFontSizeValue").textContent = currentSettings.fontSize + "px";
          applyToDOM();
          updateTypographyPreview();
        });
        fontSizeSlider.addEventListener("change", () => {
          saveSettings();
        });
      }
      const lineHeightSlider = document.getElementById("settingLineHeight");
      if (lineHeightSlider) {
        lineHeightSlider.addEventListener("input", () => {
          currentSettings.lineHeight = parseFloat(lineHeightSlider.value);
          document.getElementById("settingLineHeightValue").textContent = currentSettings.lineHeight.toFixed(1);
          applyToDOM();
          updateTypographyPreview();
        });
        lineHeightSlider.addEventListener("change", () => {
          saveSettings();
        });
      }
      const widthSlider = document.getElementById("settingMaxWidth");
      if (widthSlider) {
        widthSlider.addEventListener("input", () => {
          currentSettings.contentMaxWidth = parseInt(widthSlider.value);
          document.getElementById("settingMaxWidthValue").textContent = currentSettings.contentMaxWidth + "px";
          applyToDOM();
          updateTypographyPreview();
        });
        widthSlider.addEventListener("change", () => {
          saveSettings();
        });
      }
      const tocSwitch = document.getElementById("settingShowToc");
      if (tocSwitch) {
        tocSwitch.addEventListener("change", () => {
          currentSettings.showToc = tocSwitch.checked;
          const tocPanel = document.getElementById("tocPanel");
          if (tocSwitch.checked) {
            tocPanel.classList.remove("collapsed");
          } else {
            tocPanel.classList.add("collapsed");
          }
          const tocToolbarBtn = document.getElementById("btnToggleToc");
          if (tocToolbarBtn) {
            tocToolbarBtn.classList.toggle("toc-active", tocSwitch.checked);
            tocToolbarBtn.classList.toggle("toc-inactive", !tocSwitch.checked);
          }
          saveSettings();
        });
      }
      const annotationsSwitch = document.getElementById("settingShowAnnotations");
      if (annotationsSwitch) {
        annotationsSwitch.addEventListener("change", () => {
          currentSettings.showAnnotations = annotationsSwitch.checked;
          const annotationsPanel = document.getElementById("annotationsPanel");
          if (annotationsPanel) {
            if (annotationsSwitch.checked) {
              annotationsPanel.classList.remove("collapsed");
            } else {
              annotationsPanel.classList.add("collapsed");
            }
          }
          saveSettings();
        });
      }
      document.querySelectorAll(".sidebar-layout-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentSettings.sidebarLayout = btn.dataset.layout;
          document.querySelectorAll(".sidebar-layout-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          applyToDOM();
          saveSettings();
        });
      });
      document.querySelectorAll(".panel-mode-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentSettings.panelMode = btn.dataset.mode;
          document.querySelectorAll(".panel-mode-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          applyToDOM();
          saveSettings();
        });
      });
      document.querySelectorAll(".doc-align-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentSettings.documentAlign = btn.dataset.align;
          document.querySelectorAll(".doc-align-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          applyToDOM();
          saveSettings();
        });
      });
      const mermaidSwitch = document.getElementById("settingEnableMermaid");
      if (mermaidSwitch) {
        mermaidSwitch.addEventListener("change", () => {
          currentSettings.enableMermaid = mermaidSwitch.checked;
          applyToDOM();
          saveSettings();
          _notifyChange("enableMermaid", mermaidSwitch.checked);
        });
      }
      const mathSwitch = document.getElementById("settingEnableMath");
      if (mathSwitch) {
        mathSwitch.addEventListener("change", () => {
          currentSettings.enableMath = mathSwitch.checked;
          applyToDOM();
          saveSettings();
          _notifyChange("enableMath", mathSwitch.checked);
        });
      }
      const plantumlSwitch = document.getElementById("settingEnablePlantUML");
      if (plantumlSwitch) {
        plantumlSwitch.addEventListener("change", () => {
          currentSettings.enablePlantUML = plantumlSwitch.checked;
          applyToDOM();
          saveSettings();
          _notifyChange("enablePlantUML", plantumlSwitch.checked);
        });
      }
      const graphvizSwitch = document.getElementById("settingEnableGraphviz");
      if (graphvizSwitch) {
        graphvizSwitch.addEventListener("change", () => {
          currentSettings.enableGraphviz = graphvizSwitch.checked;
          applyToDOM();
          saveSettings();
          _notifyChange("enableGraphviz", graphvizSwitch.checked);
        });
      }
      const lineNumSwitch = document.getElementById("settingShowLineNumbers");
      if (lineNumSwitch) {
        lineNumSwitch.addEventListener("change", () => {
          currentSettings.showLineNumbers = lineNumSwitch.checked;
          applyToDOM();
          saveSettings();
        });
      }
      const autoSaveSwitch = document.getElementById("settingAutoSave");
      if (autoSaveSwitch) {
        autoSaveSwitch.addEventListener("change", () => {
          currentSettings.autoSave = autoSaveSwitch.checked;
          if (currentSettings.autoSave) {
            Exporter.enableAutoSave();
          } else {
            Exporter.disableAutoSave();
          }
          saveSettings();
        });
      }
      const delaySlider = document.getElementById("settingAutoSaveDelay");
      if (delaySlider) {
        delaySlider.addEventListener("input", () => {
          currentSettings.autoSaveDelay = parseInt(delaySlider.value);
          document.getElementById("settingAutoSaveDelayValue").textContent = (currentSettings.autoSaveDelay / 1e3).toFixed(1) + "s";
        });
        delaySlider.addEventListener("change", () => {
          saveSettings();
        });
      }
      const resetBtn = document.getElementById("btnResetSettings");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          currentSettings = { ...DEFAULTS };
          updatePanelUI();
          applyToDOM();
          applyCodeTheme(currentSettings.codeTheme);
          saveSettings();
          const tocToolbarBtn = document.getElementById("btnToggleToc");
          if (tocToolbarBtn) {
            tocToolbarBtn.classList.toggle("toc-active", currentSettings.showToc);
            tocToolbarBtn.classList.toggle("toc-inactive", !currentSettings.showToc);
          }
          _notifyChange("reset", null);
        });
      }
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && panelVisible) {
          hide();
        }
      });
    }
    function saveSettings() {
      vscode.postMessage({
        type: "saveSettings",
        payload: { ...currentSettings }
      });
      let toast = document.getElementById("_toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "_toast";
        toast.className = "toast-notification";
        document.body.appendChild(toast);
      }
      toast.textContent = typeof t === "function" ? t("settings.saved_toast") : "\u2705 \u8BBE\u7F6E\u5DF2\u81EA\u52A8\u4FDD\u5B58";
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 2e3);
    }
    function getSettings() {
      return { ...currentSettings };
    }
    function onChange(callback) {
      if (typeof callback === "function") {
        _onChangeCallbacks.push(callback);
      }
    }
    function _notifyChange(key, value) {
      for (const cb of _onChangeCallbacks) {
        try {
          cb(key, value);
        } catch (e) {
          console.warn("[Settings] onChange callback error:", e);
        }
      }
    }
    function applyCodeFontToElements() {
      const codeFontVal = currentSettings.codeFontFamily;
      const codeFontCss = codeFontVal ? "'" + codeFontVal + "', 'Fira Code', Consolas, 'Courier New', monospace" : "";
      const codeElements = document.querySelectorAll(
        ".document-content code, .document-content kbd, .frontmatter-card, .diagram-edit-textarea"
      );
      for (let i = 0; i < codeElements.length; i++) {
        codeElements[i].style.fontFamily = codeFontCss;
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
      applyCodeFontToElements,
      onChange
    };
  })();

  // webview/js/edit-mode.js
  var MODE = { INACTIVE: "inactive", RICH: "rich" };
  var _mode = MODE.INACTIVE;
  var _editor = null;
  var RICH_CONTAINER_ID = "richModeContainer";
  var RICH_BODY_CLASS = "rich-mode-active";
  function ensureRichContainer() {
    let el = document.getElementById(RICH_CONTAINER_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = RICH_CONTAINER_ID;
      const docContent = document.getElementById("documentContent");
      if (docContent && docContent.parentNode) {
        docContent.parentNode.insertBefore(el, docContent.nextSibling);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }
  function enterRich(options) {
    if (_mode !== MODE.INACTIVE) return;
    if (!globalThis.PM || typeof globalThis.PM.createRichEditor !== "function") {
      console.warn("[edit-mode] PM not loaded, cannot enter rich mode");
      return;
    }
    const store = globalThis.Store;
    if (!store || typeof store.getData !== "function") {
      console.warn("[edit-mode] Store not loaded");
      return;
    }
    const markdown = store.getData().rawMarkdown || "";
    const annotations = store.getAnnotations ? store.getAnnotations() : [];
    const container = ensureRichContainer();
    const editorOptions = {
      parent: container,
      markdown,
      annotations,
      onChange: (newMarkdown) => {
        if (typeof store.setRawMarkdown === "function") {
          store.setRawMarkdown(newMarkdown);
        }
        if (typeof globalThis.triggerAutoSave === "function") {
          globalThis.triggerAutoSave();
        }
      },
      onSave: () => {
        if (_editor && typeof store.setRawMarkdown === "function") {
          store.setRawMarkdown(_editor.getMarkdown());
        }
        if (typeof globalThis.handleSaveMd === "function") {
          globalThis.handleSaveMd();
        }
      }
    };
    if (options && typeof options.onSelectionChange === "function") {
      editorOptions.onSelectionChange = options.onSelectionChange;
    }
    _editor = globalThis.PM.createRichEditor(editorOptions);
    document.body.classList.add(RICH_BODY_CLASS);
    _mode = MODE.RICH;
    try {
      _editor.focus();
    } catch (e) {
    }
  }
  function exitRich() {
    if (_mode !== MODE.RICH) return;
    const store = globalThis.Store;
    let finalMarkdown = "";
    if (_editor) {
      try {
        finalMarkdown = _editor.getMarkdown();
      } catch (e) {
        finalMarkdown = "";
      }
      if (store && typeof store.setRawMarkdown === "function") {
        store.setRawMarkdown(finalMarkdown);
      }
      try {
        _editor.destroy();
      } catch (e) {
      }
      _editor = null;
    }
    const richContainer = document.getElementById(RICH_CONTAINER_ID);
    if (richContainer && richContainer.parentNode) {
      try {
        richContainer.parentNode.removeChild(richContainer);
      } catch (e) {
      }
    }
    document.body.classList.remove(RICH_BODY_CLASS);
    _mode = MODE.INACTIVE;
    try {
      window.dispatchEvent(new CustomEvent("rich-mode-exit", { detail: { finalMarkdown } }));
    } catch (e) {
    }
  }
  function execCommand(name, attrs) {
    if (_mode !== MODE.RICH || !_editor || typeof _editor.execCommand !== "function") return false;
    return _editor.execCommand(name, attrs);
  }
  function isRichActive() {
    return _mode === MODE.RICH;
  }
  function isAnyEditorActive() {
    return _mode !== MODE.INACTIVE;
  }
  var EditMode2 = {
    enterRich,
    exitRich,
    isRichActive,
    isAnyEditorActive,
    execCommand
  };

  // webview/js/app.js
  function initApp() {
    let blocks = [];
    let serverFileList = [];
    let currentMode = "preview";
    let editorDirty = false;
    let autoSaveTimer = null;
    const AUTO_SAVE_DELAY = 1500;
    let tocScrollTimer = null;
    let tocCollapsed = false;
    let tocRefreshTimer = null;
    const TOC_REFRESH_DELAY = 800;
    let zenMode = false;
    let _ideType = "codebuddy";
    const _pendingRequests = /* @__PURE__ */ new Map();
    function callHost(type, payload) {
      return new Promise((resolve, reject) => {
        const requestId = type + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        _pendingRequests.set(requestId, { resolve, reject });
        vscode.postMessage({ type, payload, requestId });
        setTimeout(() => {
          if (_pendingRequests.has(requestId)) {
            _pendingRequests.delete(requestId);
            reject(new Error("\u8BF7\u6C42\u8D85\u65F6: " + type));
          }
        }, 15e3);
      });
    }
    window.addEventListener("message", (event) => {
      const message = event.data;
      if (!message || !message.type) return;
      if (message.requestId && _pendingRequests.has(message.requestId)) {
        const { resolve } = _pendingRequests.get(message.requestId);
        _pendingRequests.delete(message.requestId);
        resolve(message.payload);
        return;
      }
      switch (message.type) {
        case "fileContent":
          handleFileContentPush(message.payload);
          break;
        case "fileChanged":
          showFileChangeBadge();
          break;
        case "triggerExport":
          if (Store.getAnnotations().length > 0) {
            Exporter.exportReviewDocument();
          }
          break;
        case "imageUris":
          Renderer.setImageUriCache(message.payload);
          refreshCurrentView();
          break;
        case "settingsData":
          Settings.applySettings(message.payload);
          updateThemeButtonLabel(Settings.getSettings().theme);
          break;
        case "ideType":
          _ideType = message.payload.ideType || "codebuddy";
          break;
        case "error":
          console.error("[App] Extension Host \u62A5\u9519:", message.payload && message.payload.message);
          showNotification(t("notification.load_error", { error: message.payload && message.payload.message || "Unknown error" }));
          break;
      }
    });
    function _isRecordStaleOnOpen(record, currentContent, currentDocVersion) {
      if (!record || typeof record.rawMarkdown !== "string" || record.rawMarkdown === "") {
        return { stale: false, reason: "no-snapshot" };
      }
      const snapshotTrim = (record.rawMarkdown || "").trim();
      const currentTrim = (currentContent || "").trim();
      const contentDiffers = snapshotTrim !== currentTrim;
      const docVersionDiffers = !!(record.docVersion && currentDocVersion && record.docVersion !== currentDocVersion);
      if (contentDiffers) {
        return {
          stale: true,
          reason: docVersionDiffers ? "content+docVersion-both-differ" : "content-differs"
        };
      }
      return { stale: false, reason: docVersionDiffers ? "only-docVersion-differs" : "match" };
    }
    async function handleFileContentPush(data) {
      if (data.error) {
        showNotification(t("notification.load_error", { error: data.error }));
        return;
      }
      try {
        const records = await callHost("getReviewRecords", { fileName: data.name, relPath: data.relPath || "" });
        if (records && records.records && records.records.length > 0) {
          const matchedRecord = records.records[0];
          const staleCheck = _isRecordStaleOnOpen(matchedRecord, data.content, data.docVersion);
          if (staleCheck.stale) {
            loadDocument(data.name, data.content, true, void 0, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
            requestImageUris(data.content, data.sourceDir);
            Store.forceBumpVersion(matchedRecord.reviewVersion || 1, data.content, data.docVersion);
            if (Exporter && Exporter.triggerAutoSave) {
              Exporter.triggerAutoSave();
            }
            showNotification(t("notification.stale_content_bumped", { version: Store.getData().reviewVersion }));
            console.log("[App] \u6279\u9605\u8BB0\u5F55\u8FC7\u671F (" + staleCheck.reason + ")\uFF0C\u5DF2\u5347\u7EA7\u5230 v" + Store.getData().reviewVersion);
            return;
          }
          loadDocument(data.name, data.content, true, void 0, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
          requestImageUris(data.content, data.sourceDir);
          Store.restoreFromReviewRecord(matchedRecord, data.name, data.content, data.docVersion);
          const newBlocks = Renderer.parseMarkdown(data.content);
          Renderer.renderBlocks(newBlocks, Store.getAnnotations());
          renderMathAndMermaid();
          Annotations.setBlocks(newBlocks);
          Annotations.init(newBlocks);
          Annotations.renderAnnotationsList();
          Annotations.updateToolbarState();
          if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
            showNotification(t("notification.restored", { count: matchedRecord.annotations.length }));
          }
          return;
        }
      } catch (e) {
        console.warn("[App] \u63A8\u9001\u6062\u590D\u6279\u9605\u8BB0\u5F55\u5931\u8D25:", e);
      }
      loadDocument(data.name, data.content, true, void 0, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
      requestImageUris(data.content, data.sourceDir);
    }
    async function init() {
      try {
        bindEvents();
      } catch (e) {
        console.error("[App] bindEvents \u5931\u8D25:", e);
      }
      try {
        Settings.bindEvents();
        Renderer.configureHighlight();
        Settings.init();
      } catch (e) {
        console.error("[App] \u8BBE\u7F6E/\u6E32\u67D3\u5668\u521D\u59CB\u5316\u5931\u8D25:", e);
      }
      Renderer.onRenderComplete(() => {
        Settings.applyCodeFontToElements();
      });
      Settings.onChange((key, value) => {
        if (key === "enableMermaid" || key === "enableMath" || key === "enablePlantUML" || key === "enableGraphviz" || key === "reset") {
          refreshCurrentView();
        }
        if (key === "themeChanged") {
          Renderer.reinitMermaid();
          Renderer.reinitGraphviz();
          renderMathAndMermaid();
        }
        if (key === "themeChanged" || key === "reset" || key === "languageChanged") {
          updateThemeButtonLabel(Settings.getSettings().theme);
        }
        if (key === "languageChanged") {
          updateZenButtonLabel();
          updateServerFileSelect();
          if (typeof Annotations !== "undefined" && Annotations.renderAnnotationsList) {
            Annotations.renderAnnotationsList();
          }
        }
      });
      try {
        updateThemeButtonLabel(Settings.getSettings().theme);
        const tocBtn = document.getElementById("btnToggleToc");
        if (tocBtn) tocBtn.classList.add("toc-active");
        const data = Store.load();
        if (data.rawMarkdown) {
          loadDocument(data.fileName, data.rawMarkdown, false);
          if (data.annotations && data.annotations.length > 0) {
            Exporter.triggerAutoSave();
          }
        }
      } catch (e) {
        console.error("[App] \u72B6\u6001\u6062\u590D\u5931\u8D25:", e);
      }
      vscode.postMessage({ type: "ready" });
      loadFileList();
      Exporter.enableAutoSave();
    }
    async function loadFileList() {
      try {
        const result = await callHost("getFiles", {});
        if (result && result.files && result.files.length > 0) {
          serverFileList = result.files;
          updateServerFileSelect();
          document.getElementById("fileSelectorGroup").style.display = "flex";
        }
      } catch (e) {
        console.warn("[App] \u52A0\u8F7D\u6587\u4EF6\u5217\u8868\u5931\u8D25:", e);
      }
    }
    function requestImageUris(markdown, sourceDir) {
      const html = marked.parse(markdown);
      const paths = Renderer.collectRelativeImagePaths(html);
      if (paths.length > 0 && sourceDir) {
        vscode.postMessage({
          type: "resolveImageUris",
          payload: { imagePaths: paths, basePath: sourceDir }
        });
      }
    }
    function updateServerFileSelect() {
      const select = document.getElementById("fileSelect");
      select.innerHTML = '<option value="" data-i18n="toolbar.file_select_default">' + t("toolbar.file_select_default") + "</option>";
      serverFileList.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    }
    function bindEvents() {
      globalThis.handleSaveMd = handleSaveMd;
      globalThis.triggerAutoSave = scheduleAutoSave;
      document.getElementById("fileSelect").addEventListener("change", handleFileSelectChange);
      document.getElementById("btnRefresh").addEventListener("click", handleRefresh);
      const btnToggleRich = document.getElementById("btnToggleRich");
      if (btnToggleRich && globalThis.EditMode) {
        btnToggleRich.addEventListener("click", () => {
          if (EditMode.isRichActive()) {
            EditMode.exitRich();
            btnToggleRich.classList.remove("active");
          } else {
            EditMode.enterRich({
              onSelectionChange: updateEditorToolbarState
            });
            btnToggleRich.classList.add("active");
          }
        });
      }
      const editorToolbar = document.getElementById("editorToolbar");
      if (editorToolbar && globalThis.EditMode) {
        editorToolbar.addEventListener("click", (e) => {
          const btn = e.target.closest(".editor-toolbar-btn");
          if (!btn) return;
          const cmd = btn.getAttribute("data-cmd");
          if (cmd && EditMode.isRichActive()) {
            EditMode.execCommand(cmd);
          }
        });
      }
      window.addEventListener("rich-mode-exit", () => {
        const btn = document.getElementById("btnToggleRich");
        if (btn) btn.classList.remove("active");
        currentMode = "preview";
        editorDirty = false;
        updateEditStatus("", "");
        clearEditorToolbarState();
        refreshCurrentView();
      });
      document.getElementById("btnSaveMd").addEventListener("click", handleSaveMd);
      document.getElementById("documentContent").addEventListener("input", () => {
        if (currentMode === "rich") {
          editorDirty = true;
          updateEditStatus("modified", t("notification.unsaved"));
          scheduleAutoSave();
          scheduleTocRefresh();
        }
      });
      document.getElementById("documentContent").addEventListener("click", (e) => {
        if (currentMode !== "rich") return;
        const checkboxSpan = e.target.closest(".task-checkbox");
        if (!checkboxSpan) return;
        e.preventDefault();
        e.stopPropagation();
        const li = checkboxSpan.closest(".task-list-item");
        if (!li) return;
        const isChecked = checkboxSpan.classList.contains("checked");
        const input = checkboxSpan.querySelector('input[type="checkbox"]');
        if (isChecked) {
          checkboxSpan.classList.remove("checked");
          li.classList.remove("checked");
          if (input) input.checked = false;
          const icon = checkboxSpan.querySelector(".task-check-icon");
          if (icon) icon.remove();
        } else {
          checkboxSpan.classList.add("checked");
          li.classList.add("checked");
          if (input) input.checked = true;
          if (!checkboxSpan.querySelector(".task-check-icon")) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "task-check-icon");
            svg.setAttribute("viewBox", "0 0 16 16");
            svg.setAttribute("width", "14");
            svg.setAttribute("height", "14");
            const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pathEl.setAttribute("fill", "currentColor");
            pathEl.setAttribute("d", "M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z");
            svg.appendChild(pathEl);
            checkboxSpan.appendChild(svg);
          }
        }
        checkboxSpan.style.animation = "taskCheckPop 0.2s ease";
        setTimeout(() => {
          checkboxSpan.style.animation = "";
        }, 200);
        const allTaskItems = document.querySelectorAll("#documentContent .task-list-item");
        const taskIndex = Array.prototype.indexOf.call(allTaskItems, li);
        if (taskIndex >= 0) {
          const data = Store.getData();
          const taskCheckboxRegex = /^(\s*[-*+]\s+)\[([ xX])\]/gm;
          let matchCount = 0;
          const newMarkdown = data.rawMarkdown.replace(taskCheckboxRegex, (match, prefix, checkChar, offset) => {
            if (matchCount++ === taskIndex) {
              return prefix + (isChecked ? "[ ]" : "[x]");
            }
            return match;
          });
          if (newMarkdown !== data.rawMarkdown) {
            data.rawMarkdown = newMarkdown;
            Store.save();
            const filePath = data.sourceFilePath || data.fileName;
            callHost("saveFile", { filePath, content: newMarkdown }).catch((e2) => {
              console.error("[App] checkbox \u4FDD\u5B58\u5931\u8D25:", e2);
            });
          }
        }
      });
      setupTableContextMenu();
      document.getElementById("btnExport").addEventListener("click", async () => {
        await Exporter.exportReviewDocument();
      });
      document.getElementById("btnClearAll").addEventListener("click", () => {
        document.getElementById("clearAllModal").style.display = "flex";
      });
      document.getElementById("btnCloseClearAll").addEventListener("click", () => {
        document.getElementById("clearAllModal").style.display = "none";
      });
      document.getElementById("btnCancelClearAll").addEventListener("click", () => {
        document.getElementById("clearAllModal").style.display = "none";
      });
      document.getElementById("btnConfirmClearAll").addEventListener("click", async () => {
        document.getElementById("clearAllModal").style.display = "none";
        const fileName = Store.getData().fileName;
        const relPath = Store.getRelPath();
        Store.clearAll();
        Annotations.refreshView();
        if (fileName) {
          try {
            await callHost("deleteReviewRecords", { fileName, relPath });
          } catch (e) {
            console.warn("[App] \u5220\u9664\u6279\u9605\u8BB0\u5F55\u6587\u4EF6\u5931\u8D25:", e);
          }
        }
      });
      document.getElementById("btnApplyReview").addEventListener("click", handleApplyReview);
      document.getElementById("btnCancelApply").addEventListener("click", () => {
        document.getElementById("applyConfirmModal").style.display = "none";
      });
      document.getElementById("btnCloseApplyConfirm").addEventListener("click", () => {
        document.getElementById("applyConfirmModal").style.display = "none";
      });
      document.getElementById("btnConfirmApply").addEventListener("click", executeApplyReview);
      document.getElementById("btnCloseApplyResult").addEventListener("click", () => {
        document.getElementById("applyResultModal").style.display = "none";
      });
      document.getElementById("btnCloseResultOk").addEventListener("click", () => {
        document.getElementById("applyResultModal").style.display = "none";
      });
      document.getElementById("btnExecuteAiInstruction").addEventListener("click", () => {
        document.getElementById("applyResultModal").style.display = "none";
        if (_lastAiCopyText) {
          navigator.clipboard.writeText(_lastAiCopyText).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = _lastAiCopyText;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
          });
          vscode.postMessage({
            type: "openCodeBuddyChat",
            payload: {
              instruction: _lastAiCopyText,
              sourceFilePath: _lastAiSourceFilePath,
              aiInstructionFilePath: _lastAiInstructionFilePath
            }
          });
        }
      });
      document.getElementById("btnHelp").addEventListener("click", () => {
        document.getElementById("helpModal").style.display = "flex";
      });
      document.getElementById("btnCloseHelp").addEventListener("click", () => {
        document.getElementById("helpModal").style.display = "none";
      });
      document.getElementById("btnCloseHelpOk").addEventListener("click", () => {
        document.getElementById("helpModal").style.display = "none";
      });
      document.getElementById("btnToggleAnnotations").addEventListener("click", () => {
        const panel = document.getElementById("annotationsPanel");
        const isHidden = panel.classList.contains("collapsed");
        toggleAnnotationsPanel(isHidden);
      });
      document.getElementById("btnToggleToc").addEventListener("click", () => {
        const tocPanel = document.getElementById("tocPanel");
        const isCollapsed = tocPanel.classList.contains("collapsed");
        toggleTocPanel(isCollapsed);
      });
      const btnHideToc = document.getElementById("btnHideToc");
      if (btnHideToc) btnHideToc.addEventListener("click", () => {
        toggleTocPanel(false);
      });
      const btnHideAnnotations = document.getElementById("btnHideAnnotations");
      if (btnHideAnnotations) btnHideAnnotations.addEventListener("click", () => {
        toggleAnnotationsPanel(false);
      });
      document.getElementById("btnTocMenu").addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("tocMenuDropdown");
        dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
      });
      document.getElementById("tocMenuCollapseAll").addEventListener("click", (e) => {
        e.stopPropagation();
        tocCollapseAll();
        document.getElementById("tocMenuDropdown").style.display = "none";
      });
      document.getElementById("tocMenuExpandAll").addEventListener("click", (e) => {
        e.stopPropagation();
        tocExpandAll();
        document.getElementById("tocMenuDropdown").style.display = "none";
      });
      document.addEventListener("click", () => {
        document.getElementById("tocMenuDropdown").style.display = "none";
      });
      document.getElementById("btnZenMode").addEventListener("click", () => {
        toggleZenMode();
      });
      document.getElementById("btnToggleTheme").addEventListener("click", () => {
        const settings = Settings.getSettings();
        let nextTheme;
        if (settings.theme === "auto") {
          const isDark = document.body.classList.contains("theme-dark");
          nextTheme = isDark ? "light" : "dark";
        } else {
          nextTheme = settings.theme === "light" ? "dark" : "light";
        }
        Settings.applySettings({ ...settings, theme: nextTheme });
        vscode.postMessage({ type: "saveSettings", payload: { ...settings, theme: nextTheme } });
        updateThemeButtonLabel(nextTheme);
        Renderer.reinitMermaid();
        Renderer.reinitGraphviz();
        renderMathAndMermaid();
      });
      const btnScrollTop = document.getElementById("btnScrollTop");
      const docContentForScroll = document.getElementById("documentContent");
      if (btnScrollTop && docContentForScroll) {
        btnScrollTop.addEventListener("click", () => {
          docContentForScroll.scrollTo({ top: 0, behavior: "smooth" });
        });
        docContentForScroll.addEventListener("scroll", () => {
          if (docContentForScroll.scrollTop > 300) {
            btnScrollTop.classList.add("visible");
          } else {
            btnScrollTop.classList.remove("visible");
          }
        });
      }
      document.getElementById("documentContent").addEventListener("click", (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const hash = decodeURIComponent(anchor.getAttribute("href").slice(1));
        if (!hash) return;
        const target = document.getElementById(hash);
        if (!target) return;
        e.preventDefault();
        const container = document.getElementById("documentContent");
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        container.scrollTo({ top: targetRect.top - containerRect.top + container.scrollTop - 16, behavior: "smooth" });
      });
      document.getElementById("documentContent").addEventListener("click", (e) => {
        const link = e.target.closest("a.workspace-file-link");
        if (!link) return;
        e.preventDefault();
        const filePath = link.getAttribute("data-filepath");
        if (!filePath) return;
        vscode.postMessage({ type: "openWorkspaceFile", payload: { filePath } });
      });
      document.getElementById("documentContent").addEventListener("scroll", () => {
        if (tocScrollTimer) clearTimeout(tocScrollTimer);
        tocScrollTimer = setTimeout(() => updateTocActiveItem(), 80);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (document.getElementById("searchBar").style.display !== "none") {
            closeContentSearch();
            return;
          }
          if (zenMode) {
            toggleZenMode();
            return;
          }
          document.getElementById("commentModal").style.display = "none";
          document.getElementById("insertModal").style.display = "none";
          document.getElementById("contextMenu").style.display = "none";
          document.getElementById("applyConfirmModal").style.display = "none";
          document.getElementById("applyResultModal").style.display = "none";
          document.getElementById("helpModal").style.display = "none";
        }
        if (e.ctrlKey && (e.key === "f" || e.key === "F") && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          openContentSearch();
        }
        if (e.altKey && (e.key === "z" || e.key === "Z")) {
          e.preventDefault();
          toggleZenMode();
        }
        if (e.ctrlKey && e.key === "e") {
          e.preventDefault();
          if (Store.getAnnotations().length > 0) {
            Exporter.exportReviewDocument();
          }
        }
        if (e.ctrlKey && e.key === "s") {
          e.preventDefault();
          if (currentMode === "rich" && editorDirty) {
            clearAutoSaveTimer();
            handleSaveMd();
          }
        }
        if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
          e.preventDefault();
          const data = Store.getData();
          if (data.rawMarkdown) {
            switchMode(currentMode === "preview" ? "rich" : "preview");
          }
        }
      });
      initPanelResize();
      initContentSearch();
      initTocSearch();
    }
    async function handleFileSelectChange(e) {
      const value = e.target.value;
      if (!value) return;
      if (currentMode === "rich" && editorDirty) {
        clearAutoSaveTimer();
        await handleSaveMd();
      }
      if (currentMode === "rich") {
        editorDirty = false;
        switchMode("preview");
      }
      try {
        const records = await callHost("getReviewRecords", { fileName: value, relPath: value });
        if (records && records.records && records.records.length > 0) {
          const fileData = await callHost("readFile", { filePath: value });
          if (fileData && !fileData.error) {
            const matchedRecord = records.records[0];
            const staleCheck = _isRecordStaleOnOpen(matchedRecord, fileData.content, fileData.docVersion);
            if (staleCheck.stale) {
              loadDocument(fileData.name, fileData.content, true, void 0, fileData.docVersion, fileData.sourceFilePath, fileData.sourceDir, fileData.relPath, fileData.pathHash);
              requestImageUris(fileData.content, fileData.sourceDir);
              Store.forceBumpVersion(matchedRecord.reviewVersion || 1, fileData.content, fileData.docVersion);
              if (Exporter && Exporter.triggerAutoSave) {
                Exporter.triggerAutoSave();
              }
              showNotification(t("notification.stale_content_bumped", { version: Store.getData().reviewVersion }));
              console.log("[App] \u6279\u9605\u8BB0\u5F55\u8FC7\u671F (" + staleCheck.reason + ")\uFF0C\u5DF2\u5347\u7EA7\u5230 v" + Store.getData().reviewVersion);
              return;
            }
            loadDocument(fileData.name, fileData.content, true, void 0, fileData.docVersion, fileData.sourceFilePath, fileData.sourceDir, fileData.relPath, fileData.pathHash);
            requestImageUris(fileData.content, fileData.sourceDir);
            Store.restoreFromReviewRecord(matchedRecord, fileData.name, fileData.content, fileData.docVersion);
            const newBlocks = Renderer.parseMarkdown(fileData.content);
            Renderer.renderBlocks(newBlocks, Store.getAnnotations());
            renderMathAndMermaid();
            Annotations.setBlocks(newBlocks);
            Annotations.init(newBlocks);
            Annotations.renderAnnotationsList();
            Annotations.updateToolbarState();
            if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
              showNotification(t("notification.restored", { count: matchedRecord.annotations.length }));
            }
            return;
          }
        }
        const data = await callHost("readFile", { filePath: value });
        if (data && !data.error) {
          loadDocument(data.name, data.content, true, void 0, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
          requestImageUris(data.content, data.sourceDir);
        }
      } catch (e2) {
        console.error("[App] \u52A0\u8F7D\u6587\u4EF6\u5931\u8D25:", e2);
        showNotification(t("notification.load_failed"));
      }
    }
    async function handleRefresh() {
      vscode.postMessage({ type: "getSettings" });
      const currentData = Store.getData();
      if (!currentData.fileName) return;
      try {
        const filePath = currentData.sourceFilePath || currentData.fileName;
        const data = await callHost("readFile", { filePath });
        if (data && !data.error) {
          const contentChanged = data.content.trim() !== currentData.rawMarkdown.trim();
          if (contentChanged) {
            loadDocument(data.name, data.content, true, void 0, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
            showNotification("\u6587\u4EF6\u5DF2\u66F4\u65B0\uFF0C\u5DF2\u521B\u5EFA\u65B0\u7684\u6279\u9605\u7248\u672C");
          } else {
            loadDocument(data.name, data.content, false, void 0, data.docVersion, data.sourceFilePath, data.sourceDir, data.relPath, data.pathHash);
            showNotification("\u6587\u4EF6\u5DF2\u91CD\u65B0\u52A0\u8F7D");
            try {
              const records = await callHost("getReviewRecords", { fileName: data.name, relPath: data.relPath || "" });
              if (records && records.records && records.records.length > 0) {
                const matchedRecord = records.records[0];
                Store.restoreFromReviewRecord(matchedRecord, data.name, data.content, data.docVersion);
                if (matchedRecord.annotations && matchedRecord.annotations.length > 0) {
                  const newBlocks = Renderer.parseMarkdown(data.content);
                  Renderer.renderBlocks(newBlocks, Store.getAnnotations());
                  renderMathAndMermaid();
                  Annotations.setBlocks(newBlocks);
                  Annotations.init(newBlocks);
                  Annotations.renderAnnotationsList();
                  Annotations.updateToolbarState();
                }
              }
            } catch (e) {
              console.warn("[App] \u5237\u65B0\u65F6\u6062\u590D\u6279\u9605\u8BB0\u5F55\u5931\u8D25:", e);
            }
          }
          requestImageUris(data.content, data.sourceDir);
          hideFileChangeBadge();
          loadFileList();
        }
      } catch (e) {
        showNotification("\u5237\u65B0\u5931\u8D25: " + e.message);
      }
    }
    function loadDocument(fileName, markdown, isNew, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash) {
      if (isNew) {
        Store.setFile(fileName, markdown, fileHash, docVersion, sourceFilePath, sourceDir, relPath, pathHash);
        if (Exporter && Exporter.isAutoSaveEnabled && Exporter.isAutoSaveEnabled()) {
          Exporter.triggerAutoSave();
        }
      }
      document.getElementById("welcomeScreen").style.display = "none";
      document.getElementById("editorContainer").style.display = "flex";
      const storeData = Store.getData();
      const versionLabel = storeData.docVersion ? ` (${storeData.docVersion})` : "";
      const fileNameEl = document.getElementById("fileName");
      fileNameEl.textContent = fileName + versionLabel;
      const fileRelPath = storeData.relPath || storeData.sourceFilePath || fileName;
      fileNameEl.title = fileRelPath;
      updateFileSelectHighlight(fileName);
      blocks = Renderer.parseMarkdown(markdown);
      const data = Store.getData();
      Renderer.renderBlocks(blocks, data.annotations);
      renderMathAndMermaid();
      Annotations.setBlocks(blocks);
      Annotations.init(blocks);
      Annotations.renderAnnotationsList();
      Annotations.updateToolbarState();
      refreshToc();
    }
    function refreshCurrentView() {
      const data = Store.getData();
      if (!data.rawMarkdown) return;
      blocks = Renderer.parseMarkdown(data.rawMarkdown);
      Renderer.renderBlocks(blocks, data.annotations);
      renderMathAndMermaid();
      Annotations.setBlocks(blocks);
      Annotations.init(blocks);
      Annotations.renderAnnotationsList();
      Annotations.updateToolbarState();
      refreshToc();
    }
    function renderMathAndMermaid() {
      const settings = Settings.getSettings();
      if (settings.enableMath) {
        Renderer.renderMath();
      }
      if (settings.enableMermaid) {
        Renderer.renderMermaid();
        setTimeout(bindMermaidLightbox, 200);
      }
      if (settings.enablePlantUML) {
        Renderer.renderPlantUML();
      }
      if (settings.enableGraphviz) {
        Renderer.renderGraphviz().then(() => {
          bindGraphvizLightbox();
        });
      }
      bindCodeCopyButtons();
      bindImageLightbox();
    }
    function bindImageLightbox() {
      const contentEl = document.getElementById("documentContent");
      if (!contentEl || contentEl.dataset.imageLightboxBound) return;
      contentEl.dataset.imageLightboxBound = "true";
      contentEl.addEventListener("click", (e) => {
        const img = e.target.closest("img");
        if (!img) return;
        if (img.closest(".image-lightbox-overlay") || img.closest(".mermaid-lightbox-overlay")) return;
        if (img.classList.contains("img-placeholder")) return;
        openImageLightbox(img.src);
      });
    }
    function openImageLightbox(src) {
      const overlay = document.createElement("div");
      overlay.className = "image-lightbox-overlay";
      const img = document.createElement("img");
      img.src = src;
      img.draggable = false;
      const closeBtn = document.createElement("button");
      closeBtn.className = "image-lightbox-close";
      closeBtn.innerHTML = "&times;";
      const zoomTip = document.createElement("div");
      zoomTip.className = "image-lightbox-zoom-tip";
      overlay.appendChild(img);
      overlay.appendChild(closeBtn);
      overlay.appendChild(zoomTip);
      document.body.appendChild(overlay);
      let scale = 1;
      let translateX = 0;
      let translateY = 0;
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartTX = 0;
      let dragStartTY = 0;
      let zoomTipTimer = null;
      const MIN_SCALE = 0.1;
      const MAX_SCALE = 20;
      function applyTransform() {
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      }
      function showZoomTip() {
        zoomTip.textContent = `${Math.round(scale * 100)}%`;
        zoomTip.classList.add("visible");
        if (zoomTipTimer) clearTimeout(zoomTipTimer);
        zoomTipTimer = setTimeout(() => {
          zoomTip.classList.remove("visible");
        }, 800);
      }
      function updateCursor() {
        if (scale > 1) {
          img.style.cursor = isDragging ? "grabbing" : "grab";
          overlay.style.cursor = isDragging ? "grabbing" : "zoom-out";
        } else {
          img.style.cursor = "default";
          overlay.style.cursor = "zoom-out";
        }
      }
      overlay.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        const factor = delta > 0 ? 1.15 : 1 / 1.15;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
        const rect = img.getBoundingClientRect();
        const imgCenterX = rect.left + rect.width / 2;
        const imgCenterY = rect.top + rect.height / 2;
        const mouseOffsetX = e.clientX - imgCenterX;
        const mouseOffsetY = e.clientY - imgCenterY;
        const ratio = newScale / scale;
        translateX = translateX - mouseOffsetX * (ratio - 1);
        translateY = translateY - mouseOffsetY * (ratio - 1);
        scale = newScale;
        applyTransform();
        showZoomTip();
        updateCursor();
      }, { passive: false });
      img.addEventListener("mousedown", (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartTX = translateX;
        dragStartTY = translateY;
        updateCursor();
      });
      function onMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        translateX = dragStartTX + (e.clientX - dragStartX);
        translateY = dragStartTY + (e.clientY - dragStartY);
        applyTransform();
      }
      function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;
        updateCursor();
      }
      overlay.addEventListener("mousemove", onMouseMove);
      overlay.addEventListener("mouseup", onMouseUp);
      overlay.addEventListener("mouseleave", onMouseUp);
      img.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        scale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
        showZoomTip();
        updateCursor();
      });
      function closeLightbox() {
        overlay.style.animation = "none";
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 0.15s ease";
        document.removeEventListener("keydown", onKeyDown);
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 150);
      }
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay && !isDragging) closeLightbox();
      });
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeLightbox();
      });
      function onKeyDown(e) {
        if (e.key === "Escape") {
          closeLightbox();
        } else if (e.key === "0") {
          scale = 1;
          translateX = 0;
          translateY = 0;
          applyTransform();
          showZoomTip();
          updateCursor();
        }
      }
      document.addEventListener("keydown", onKeyDown);
    }
    function bindCodeCopyButtons() {
      const copyBtns = document.querySelectorAll(".code-copy-btn");
      copyBtns.forEach((btn) => {
        if (btn.dataset.copyBound) return;
        btn.dataset.copyBound = "true";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const codeBlock = btn.closest(".code-block");
          if (!codeBlock) return;
          const codeEl = codeBlock.querySelector("code");
          if (!codeEl) return;
          const text = codeEl.textContent;
          navigator.clipboard.writeText(text).then(() => {
            btn.textContent = "\u2705 \u5DF2\u590D\u5236";
            setTimeout(() => {
              btn.textContent = "\u{1F4CB} \u590D\u5236";
            }, 2e3);
          }).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            btn.textContent = "\u2705 \u5DF2\u590D\u5236";
            setTimeout(() => {
              btn.textContent = "\u{1F4CB} \u590D\u5236";
            }, 2e3);
          });
        });
      });
    }
    function bindMermaidLightbox() {
      const rendered = document.querySelectorAll(".mermaid-rendered");
      rendered.forEach((el) => {
        if (el.dataset.lightboxBound) return;
        el.dataset.lightboxBound = "true";
        el.title = "\u70B9\u51FB\u67E5\u770B\u5927\u56FE";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openMermaidLightbox(el);
        });
      });
    }
    function bindGraphvizLightbox() {
      const rendered = document.querySelectorAll(".graphviz-rendered");
      rendered.forEach((el) => {
        if (el.dataset.lightboxBound) return;
        el.dataset.lightboxBound = "true";
        el.title = "\u70B9\u51FB\u67E5\u770B\u5927\u56FE";
        el.style.cursor = "pointer";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openMermaidLightbox(el);
        });
      });
    }
    function openMermaidLightbox(mermaidEl) {
      const svgEl = mermaidEl.querySelector("svg");
      if (!svgEl) return;
      let scale = 1;
      let translateX = 0;
      let translateY = 0;
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartTranslateX = 0;
      let dragStartTranslateY = 0;
      const minScale = 0.1;
      const maxScale = 10;
      const scaleStep = 0.15;
      const overlay = document.createElement("div");
      overlay.className = "mermaid-lightbox-overlay";
      const container = document.createElement("div");
      container.className = "mermaid-lightbox-container";
      const content = document.createElement("div");
      content.className = "mermaid-lightbox-content";
      const clonedSvg = svgEl.cloneNode(true);
      const viewBox = clonedSvg.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/);
        const vbW = parseFloat(parts[2]);
        const vbH = parseFloat(parts[3]);
        if (vbW && vbH) {
          clonedSvg.setAttribute("width", vbW);
          clonedSvg.setAttribute("height", vbH);
        }
      }
      clonedSvg.style.cssText = "width: auto; height: auto;";
      content.appendChild(clonedSvg);
      const closeBtn = document.createElement("button");
      closeBtn.className = "mermaid-lightbox-close";
      closeBtn.innerHTML = "&times;";
      const zoomBar = document.createElement("div");
      zoomBar.className = "mermaid-lightbox-zoombar";
      zoomBar.innerHTML = `
            <button class="zoom-btn zoom-out" title="\u7F29\u5C0F (-)">\u2212</button>
            <span class="zoom-level">100%</span>
            <button class="zoom-btn zoom-in" title="\u653E\u5927 (+)">+</button>
            <button class="zoom-btn zoom-fit" title="\u9002\u5E94\u7A97\u53E3 (0)">\u22A1</button>
            <button class="zoom-btn zoom-reset" title="\u91CD\u7F6E (R)">1:1</button>
        `;
      const hint = document.createElement("div");
      hint.className = "mermaid-lightbox-hint";
      hint.textContent = "\u6EDA\u8F6E\u7F29\u653E \xB7 \u62D6\u62FD\u79FB\u52A8 \xB7 +/-/0 \u5FEB\u6377\u952E \xB7 ESC \u5173\u95ED";
      container.appendChild(content);
      overlay.appendChild(container);
      overlay.appendChild(closeBtn);
      overlay.appendChild(zoomBar);
      overlay.appendChild(hint);
      document.body.appendChild(overlay);
      const zoomLevelEl = zoomBar.querySelector(".zoom-level");
      function updateTransform() {
        content.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        zoomLevelEl.textContent = Math.round(scale * 100) + "%";
      }
      function setScale(newScale, centerX, centerY) {
        const oldScale = scale;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        if (newScale === oldScale) return;
        if (centerX !== void 0 && centerY !== void 0) {
          const rect = container.getBoundingClientRect();
          const cx = centerX - rect.left - rect.width / 2;
          const cy = centerY - rect.top - rect.height / 2;
          translateX = cx - (cx - translateX) * newScale / oldScale;
          translateY = cy - (cy - translateY) * newScale / oldScale;
        }
        scale = newScale;
        updateTransform();
      }
      function fitToWindow() {
        const svgInLightbox = content.querySelector("svg");
        if (!svgInLightbox) return;
        const containerRect = container.getBoundingClientRect();
        let svgW = parseFloat(svgInLightbox.getAttribute("width")) || 0;
        let svgH = parseFloat(svgInLightbox.getAttribute("height")) || 0;
        if (!svgW || !svgH) {
          const vb = svgInLightbox.getAttribute("viewBox");
          if (vb) {
            const p = vb.split(/[\s,]+/);
            svgW = parseFloat(p[2]) || 0;
            svgH = parseFloat(p[3]) || 0;
          }
        }
        if (!svgW || !svgH) {
          svgW = svgInLightbox.getBoundingClientRect().width / scale;
          svgH = svgInLightbox.getBoundingClientRect().height / scale;
        }
        const padding = 80;
        const fitScale = Math.min(
          (containerRect.width - padding) / svgW,
          (containerRect.height - padding) / svgH,
          2
          // 最大不超过 200%
        );
        scale = fitScale;
        translateX = 0;
        translateY = 0;
        updateTransform();
      }
      function onWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
        setScale(scale * (1 + delta), e.clientX, e.clientY);
      }
      function onMouseDown(e) {
        if (e.target.closest(".zoom-btn") || e.target === closeBtn || e.target === closeBtn.firstChild) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartTranslateX = translateX;
        dragStartTranslateY = translateY;
        container.classList.add("grabbing");
      }
      function onMouseMove(e) {
        if (!isDragging) return;
        translateX = dragStartTranslateX + (e.clientX - dragStartX);
        translateY = dragStartTranslateY + (e.clientY - dragStartY);
        updateTransform();
      }
      function onMouseUp() {
        if (isDragging) {
          isDragging = false;
          container.classList.remove("grabbing");
        }
      }
      function closeLightbox() {
        overlay.removeEventListener("wheel", onWheel);
        overlay.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
      }
      function onKeyDown(e) {
        if (e.key === "Escape") {
          closeLightbox();
          return;
        }
        if (e.key === "+" || e.key === "=") {
          const rect = container.getBoundingClientRect();
          setScale(scale * (1 + scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
          return;
        }
        if (e.key === "-" || e.key === "_") {
          const rect = container.getBoundingClientRect();
          setScale(scale * (1 - scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
          return;
        }
        if (e.key === "0") {
          fitToWindow();
          return;
        }
        if (e.key === "r" || e.key === "R") {
          scale = 1;
          translateX = 0;
          translateY = 0;
          updateTransform();
          return;
        }
      }
      zoomBar.querySelector(".zoom-out").addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        setScale(scale * (1 - scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
      });
      zoomBar.querySelector(".zoom-in").addEventListener("click", (e) => {
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        setScale(scale * (1 + scaleStep), rect.left + rect.width / 2, rect.top + rect.height / 2);
      });
      zoomBar.querySelector(".zoom-fit").addEventListener("click", (e) => {
        e.stopPropagation();
        fitToWindow();
      });
      zoomBar.querySelector(".zoom-reset").addEventListener("click", (e) => {
        e.stopPropagation();
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
      });
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeLightbox();
      });
      overlay.addEventListener("dblclick", (e) => {
        if (e.target === overlay) closeLightbox();
      });
      let clickStartX = 0, clickStartY = 0;
      overlay.addEventListener("mousedown", (e) => {
        clickStartX = e.clientX;
        clickStartY = e.clientY;
      });
      overlay.addEventListener("click", (e) => {
        const dx = Math.abs(e.clientX - clickStartX);
        const dy = Math.abs(e.clientY - clickStartY);
        if (dx < 5 && dy < 5 && e.target === overlay) closeLightbox();
      });
      overlay.addEventListener("wheel", onWheel, { passive: false });
      overlay.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => fitToWindow());
    }
    function updateFileSelectHighlight(fileName) {
      const select = document.getElementById("fileSelect");
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === fileName || select.options[i].textContent === fileName) {
          select.value = select.options[i].value;
          return;
        }
      }
    }
    function toggleAnnotationsPanel(show) {
      const panel = document.getElementById("annotationsPanel");
      const toggleBtn = document.getElementById("btnToggleAnnotations");
      if (show) {
        panel.classList.remove("collapsed");
        if (toggleBtn) toggleBtn.classList.remove("panel-hidden");
      } else {
        panel.style.width = "";
        panel.classList.add("collapsed");
        if (toggleBtn) toggleBtn.classList.add("panel-hidden");
      }
      const settings = Settings.getSettings();
      if (settings.showAnnotations !== show) {
        Settings.applySettings({ ...settings, showAnnotations: show });
        vscode.postMessage({ type: "saveSettings", payload: { ...settings, showAnnotations: show } });
      }
    }
    function showFileChangeBadge() {
      document.getElementById("fileChangeBadge").style.display = "inline-block";
    }
    function hideFileChangeBadge() {
      document.getElementById("fileChangeBadge").style.display = "none";
    }
    function showNotification(msg) {
      let toast = document.getElementById("_toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "_toast";
        toast.className = "toast-notification";
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 2500);
    }
    function extractDiagramSource(container) {
      const sourceDataEl = container.querySelector("[data-source]");
      if (sourceDataEl && sourceDataEl.dataset.source) {
        try {
          return decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
        } catch (e) {
        }
      }
      const preEl = container.querySelector("pre");
      if (preEl) return preEl.textContent || "";
      return "";
    }
    function autoResizeTextarea(textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.max(textarea.scrollHeight, 80) + "px";
    }
    async function handleApplyReview() {
      if (currentMode === "rich" && editorDirty) {
        clearAutoSaveTimer();
        await handleSaveMd();
      }
      const data = Store.getData();
      if (!data.annotations || data.annotations.length === 0) {
        showNotification(t("modal.ai.no_annotations"));
        return;
      }
      const deleteCount = data.annotations.filter((a) => a.type === "delete").length;
      const insertCount = data.annotations.filter((a) => a.type === "insert").length;
      const commentCount = data.annotations.filter((a) => a.type === "comment").length;
      const summaryEl = document.getElementById("applySummary");
      summaryEl.innerHTML = `
            <div class="summary-file">${t("modal.ai.source_file")}<code>${data.fileName}</code></div>
            <div class="summary-total">${t("modal.ai.total_annotations", { count: data.annotations.length })}</div>
            ${deleteCount > 0 ? `<div class="summary-stat">${t("modal.ai.delete_count", { count: deleteCount })}</div>` : ""}
            ${insertCount > 0 ? `<div class="summary-stat">${t("modal.ai.insert_count", { count: insertCount })}</div>` : ""}
            ${commentCount > 0 ? `<div class="summary-stat">${t("modal.ai.comment_count", { count: commentCount })}</div>` : ""}
            <div class="summary-hint">
                ${t("modal.ai.summary_hint")}
            </div>
        `;
      document.getElementById("applyConfirmModal").style.display = "flex";
    }
    async function executeApplyReview() {
      document.getElementById("applyConfirmModal").style.display = "none";
      const btn = document.getElementById("btnApplyReview");
      const originalText = btn.innerHTML;
      btn.classList.add("loading");
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/></circle></svg> ' + t("notification.updating");
      const data = Store.getData();
      try {
        const result = await callHost("applyReview", {
          fileName: data.fileName,
          annotations: data.annotations,
          sourceFile: data.sourceFilePath || "",
          relPath: data.relPath || ""
        });
        if (!result || !result.success) {
          showNotification(t("notification.update_failed", { error: result?.error || "unknown" }));
          return;
        }
        showApplyResult(result, data);
      } catch (e) {
        showNotification(t("notification.request_failed", { error: e.message }));
      } finally {
        btn.classList.remove("loading");
        btn.innerHTML = originalText;
      }
    }
    let _lastAiCopyText = "";
    let _lastAiSourceFilePath = "";
    let _lastAiInstructionFilePath = "";
    function showApplyResult(result, data) {
      const contentEl = document.getElementById("applyResultContent");
      const { needsAi, aiInstructionFile, sourceFilePath, aiInstructionFilePath } = result;
      let html = "";
      if (needsAi > 0) {
        html += `<div class="result-header">${t("modal.ai_result.header_success")}</div>`;
        html += `<div style="margin-bottom:12px;">${t("modal.ai_result.count", { count: needsAi })}</div>`;
        if (aiInstructionFile) {
          let escapeHtml2 = function(str) {
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          };
          var escapeHtml = escapeHtml2;
          html += `<div class="result-ai-hint">
                    ${t("modal.ai_result.hint_annotations", { count: needsAi })}<br>
                    <div style="margin-top:6px;">
<span class="ai-hint-label">${t("modal.ai_result.source_label")}<code class="ai-hint-path">${escapeHtml2(sourceFilePath || "")}</code></span><br>
                        <span class="ai-hint-label">${t("modal.ai_result.instruction_label")}<code class="ai-hint-path">${escapeHtml2(aiInstructionFilePath || "")}</code></span>
                    </div>
                    <button class="btn btn-copy-ai-instruction" id="btnCopyAiInstruction">${t("modal.ai_result.copy_btn")}</button>
                </div>`;
        }
      } else {
        html += `<div class="result-header">${t("modal.ai_result.header_empty")}</div>`;
      }
      contentEl.innerHTML = html;
      document.getElementById("applyResultModal").style.display = "flex";
      const executeBtn = document.getElementById("btnExecuteAiInstruction");
      const copyBtn = document.getElementById("btnCopyAiInstruction");
      if (copyBtn) {
        const copyText = t("modal.ai_result.copy_text", { source: sourceFilePath || "", instruction: aiInstructionFilePath || "" });
        _lastAiCopyText = copyText;
        _lastAiSourceFilePath = sourceFilePath || "";
        _lastAiInstructionFilePath = aiInstructionFilePath || "";
        if (executeBtn) {
          executeBtn.style.display = "";
        }
        const vscodeHint = document.getElementById("vscodeAiHint");
        if (vscodeHint) {
          if (_ideType === "codebuddy") {
            vscodeHint.style.display = "none";
          } else {
            let hintKey = "modal.ai_result.vscode_hint";
            if (_ideType === "cursor") {
              hintKey = "modal.ai_result.cursor_hint";
            } else if (_ideType === "windsurf") {
              hintKey = "modal.ai_result.windsurf_hint";
            }
            vscodeHint.setAttribute("data-i18n", hintKey);
            vscodeHint.textContent = t(hintKey);
            vscodeHint.style.display = "inline";
          }
        }
        copyBtn.addEventListener("click", function() {
          navigator.clipboard.writeText(copyText).then(() => {
            this.innerHTML = t("modal.ai_result.copied");
            this.classList.add("copied");
            setTimeout(() => {
              this.innerHTML = t("modal.ai_result.copy_btn");
              this.classList.remove("copied");
            }, 2e3);
          }).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = copyText;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            this.innerHTML = t("modal.ai_result.copied");
            this.classList.add("copied");
            setTimeout(() => {
              this.innerHTML = t("modal.ai_result.copy_btn");
              this.classList.remove("copied");
            }, 2e3);
          });
        });
      } else {
        _lastAiCopyText = "";
        _lastAiSourceFilePath = "";
        _lastAiInstructionFilePath = "";
        if (executeBtn) {
          executeBtn.style.display = "none";
        }
      }
    }
    let tableMenuCoords = { left: 0, top: 0 };
    function setupTableContextMenu() {
      const docContent = document.getElementById("documentContent");
      const tableMenu = document.getElementById("tableContextMenu");
      function handleTableContextMenu(e) {
        if (currentMode !== "rich") return;
        const cell = e.target.closest("td, th");
        if (!cell) return;
        const row = cell.parentElement;
        const table = cell.closest("table");
        if (!table || !row) return;
        e.preventDefault();
        tableMenuCoords = { left: e.clientX, top: e.clientY };
        tableMenu.style.display = "block";
        tableMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + "px";
        tableMenu.style.top = Math.min(e.clientY, window.innerHeight - 320) + "px";
        const totalRows = table.querySelectorAll("tr").length;
        const totalCols = row.children.length;
        document.getElementById("tableMenuDeleteRow").style.opacity = totalRows <= 1 ? "0.4" : "1";
        document.getElementById("tableMenuDeleteRow").style.pointerEvents = totalRows <= 1 ? "none" : "auto";
        document.getElementById("tableMenuDeleteCol").style.opacity = totalCols <= 1 ? "0.4" : "1";
        document.getElementById("tableMenuDeleteCol").style.pointerEvents = totalCols <= 1 ? "none" : "auto";
      }
      docContent.addEventListener("contextmenu", handleTableContextMenu);
      document.addEventListener("contextmenu", (e) => {
        const richContainer = document.getElementById("richModeContainer");
        if (richContainer && richContainer.contains(e.target)) {
          handleTableContextMenu(e);
        }
      });
      document.addEventListener("click", (e) => {
        if (!tableMenu.contains(e.target)) tableMenu.style.display = "none";
      });
      document.getElementById("tableMenuInsertRowAbove").addEventListener("click", () => {
        tableMenu.style.display = "none";
        EditMode.execCommand("tableInsertRowAbove", { coords: tableMenuCoords });
      });
      document.getElementById("tableMenuInsertRowBelow").addEventListener("click", () => {
        tableMenu.style.display = "none";
        EditMode.execCommand("tableInsertRowBelow", { coords: tableMenuCoords });
      });
      document.getElementById("tableMenuInsertColLeft").addEventListener("click", () => {
        tableMenu.style.display = "none";
        EditMode.execCommand("tableInsertColLeft", { coords: tableMenuCoords });
      });
      document.getElementById("tableMenuInsertColRight").addEventListener("click", () => {
        tableMenu.style.display = "none";
        EditMode.execCommand("tableInsertColRight", { coords: tableMenuCoords });
      });
      document.getElementById("tableMenuDeleteRow").addEventListener("click", () => {
        tableMenu.style.display = "none";
        EditMode.execCommand("tableDeleteRow", { coords: tableMenuCoords });
      });
      document.getElementById("tableMenuDeleteCol").addEventListener("click", () => {
        tableMenu.style.display = "none";
        EditMode.execCommand("tableDeleteCol", { coords: tableMenuCoords });
      });
    }
    function getScrollAnchor() {
      const docContent = document.getElementById("documentContent");
      const mdBlocks = docContent.querySelectorAll(".md-block");
      if (mdBlocks.length === 0) return null;
      const containerRect = docContent.getBoundingClientRect();
      const viewportTop = containerRect.top;
      for (const block of mdBlocks) {
        const rect = block.getBoundingClientRect();
        if (rect.bottom > viewportTop) {
          return { blockIndex: parseInt(block.dataset.blockIndex, 10), offsetInView: rect.top - viewportTop };
        }
      }
      return null;
    }
    function restoreScrollAnchor(anchor) {
      if (!anchor) return;
      const docContent = document.getElementById("documentContent");
      const targetBlock = docContent.querySelector(`.md-block[data-block-index="${anchor.blockIndex}"]`);
      if (!targetBlock) return;
      const containerRect = docContent.getBoundingClientRect();
      const blockRect = targetBlock.getBoundingClientRect();
      docContent.scrollTop += blockRect.top - containerRect.top - anchor.offsetInView;
    }
    async function switchMode(mode) {
      if (mode === "edit" || mode === "rich") return;
      if (mode === "preview" && globalThis.EditMode && EditMode.isAnyEditorActive()) {
        if (EditMode.isRichActive()) EditMode.exitRich();
      }
    }
    function updateEditStatus(className, text) {
      const el = document.getElementById("editStatus");
      el.className = "edit-status" + (className ? " " + className : "");
      el.textContent = text;
    }
    const _toolbarMarkMap = { bold: "strong", italic: "em", strikethrough: "strikethrough" };
    const _toolbarBlockMap = { h1: { type: "heading", level: 1 }, h2: { type: "heading", level: 2 }, h3: { type: "heading", level: 3 } };
    function updateEditorToolbarState(state) {
      const toolbar = document.getElementById("editorToolbar");
      if (!toolbar) return;
      const { activeMarks, blockType, blockAttrs } = state;
      const btns = toolbar.querySelectorAll(".editor-toolbar-btn");
      for (const btn of btns) {
        const cmd = btn.getAttribute("data-cmd");
        if (!cmd) continue;
        let isActive = false;
        if (_toolbarMarkMap[cmd]) {
          isActive = activeMarks.includes(_toolbarMarkMap[cmd]);
        }
        if (_toolbarBlockMap[cmd]) {
          const expected = _toolbarBlockMap[cmd];
          isActive = blockType === expected.type && blockAttrs.level === expected.level;
        }
        btn.classList.toggle("active", isActive);
      }
    }
    function clearEditorToolbarState() {
      const toolbar = document.getElementById("editorToolbar");
      if (!toolbar) return;
      const btns = toolbar.querySelectorAll(".editor-toolbar-btn");
      for (const btn of btns) {
        btn.classList.remove("active");
      }
    }
    function updateThemeButtonLabel(theme) {
      const btn = document.getElementById("btnToggleTheme");
      if (!btn) return;
      const labels = { light: t("theme.light"), dark: t("theme.dark") };
      const icons = {
        light: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        dark: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 9.2A6.5 6.5 0 016.8 2 6 6 0 1014 9.2z" stroke="currentColor" stroke-width="1.3"/></svg>'
      };
      let displayTheme = theme;
      if (theme === "auto") {
        displayTheme = document.body.classList.contains("theme-dark") ? "dark" : "light";
      }
      btn.innerHTML = icons[displayTheme] || icons.light;
    }
    function updateZenButtonLabel() {
      const zenBtn = document.getElementById("btnZenMode");
      if (!zenBtn) return;
      if (zenMode) {
        zenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.3"/><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="0.7" opacity="0.5"/></svg>';
        zenBtn.title = t("toolbar.exit_zen");
      } else {
        zenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2"/></svg>';
        zenBtn.title = t("toolbar.zen_title");
      }
    }
    function scheduleAutoSave() {
      clearAutoSaveTimer();
      autoSaveTimer = setTimeout(() => {
        if (currentMode === "rich" && editorDirty) handleSaveMd();
        else if (globalThis.EditMode && EditMode.isRichActive()) handleSaveMd();
      }, AUTO_SAVE_DELAY);
    }
    function clearAutoSaveTimer() {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
    }
    async function handleSaveMd() {
      if (globalThis.EditMode && EditMode.isRichActive()) {
        const dataPm = Store.getData();
        if (!dataPm.fileName) {
          showNotification(t("notification.no_open_file"));
          return;
        }
        try {
          const filePath = dataPm.sourceFilePath || dataPm.fileName;
          const result = await callHost("saveFile", { filePath, content: dataPm.rawMarkdown });
          if (result && result.success) {
            editorDirty = false;
            updateEditStatus("saved", t("notification.saved"));
            setTimeout(() => updateEditStatus("", ""), 1500);
          } else {
            console.error("[rich-mode] save failed:", result && result.error);
            updateEditStatus("error", t("notification.save_failed") || "Save failed");
          }
        } catch (e) {
          console.error("[rich-mode] save failed", e);
          updateEditStatus("error", t("notification.save_failed") || "Save failed");
        }
        return;
      }
    }
    const PANEL_MIN_WIDTH = 160;
    const PANEL_MAX_WIDTH_RATIO = 0.45;
    function initPanelResize() {
      setupResize("tocResizeHandle", "tocPanel");
      setupResize("annotationsResizeHandle", "annotationsPanel");
    }
    function setupResize(handleId, panelId) {
      const handle = document.getElementById(handleId);
      const panel = document.getElementById(panelId);
      if (!handle || !panel) return;
      let startX = 0;
      let startWidth = 0;
      let dragging = false;
      function getResizeSide() {
        const panelRect = panel.getBoundingClientRect();
        const handleRect = handle.getBoundingClientRect();
        return handleRect.left > panelRect.left + panelRect.width / 2 ? "right" : "left";
      }
      function onMouseDown(e) {
        if (panel.classList.contains("collapsed")) return;
        e.preventDefault();
        dragging = true;
        startX = e.clientX;
        startWidth = panel.getBoundingClientRect().width;
        handle.classList.add("dragging");
        panel.classList.add("resizing");
        document.body.classList.add("resizing-panel");
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      }
      function onMouseMove(e) {
        if (!dragging) return;
        const maxWidth = window.innerWidth * PANEL_MAX_WIDTH_RATIO;
        const side = getResizeSide();
        let delta;
        if (side === "right") {
          delta = e.clientX - startX;
        } else {
          delta = startX - e.clientX;
        }
        const newWidth = Math.min(Math.max(startWidth + delta, PANEL_MIN_WIDTH), maxWidth);
        panel.style.width = newWidth + "px";
      }
      function onMouseUp() {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove("dragging");
        panel.classList.remove("resizing");
        document.body.classList.remove("resizing-panel");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
      handle.addEventListener("mousedown", onMouseDown);
    }
    let searchMatches = [];
    let searchCurrentIndex = -1;
    let searchDebounceTimer = null;
    function initContentSearch() {
      const searchInput = document.getElementById("searchInput");
      const searchPrev = document.getElementById("searchPrev");
      const searchNext = document.getElementById("searchNext");
      const searchClose = document.getElementById("searchClose");
      searchInput.addEventListener("input", () => {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => performContentSearch(), 300);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) {
            navigateSearch(-1);
          } else {
            navigateSearch(1);
          }
        }
      });
      searchPrev.addEventListener("click", () => navigateSearch(-1));
      searchNext.addEventListener("click", () => navigateSearch(1));
      searchClose.addEventListener("click", () => closeContentSearch());
    }
    function openContentSearch() {
      const searchBar = document.getElementById("searchBar");
      const searchInput = document.getElementById("searchInput");
      searchBar.style.display = "";
      searchInput.focus();
      searchInput.select();
    }
    function closeContentSearch() {
      const searchBar = document.getElementById("searchBar");
      searchBar.style.display = "none";
      document.getElementById("searchInput").value = "";
      clearSearchHighlights();
      searchMatches = [];
      searchCurrentIndex = -1;
      updateSearchCount();
    }
    function performContentSearch() {
      clearSearchHighlights();
      searchMatches = [];
      searchCurrentIndex = -1;
      const query = document.getElementById("searchInput").value.trim();
      if (!query) {
        updateSearchCount();
        document.getElementById("searchInput").classList.remove("no-match");
        return;
      }
      const docContent = document.getElementById("documentContent");
      const lowerQuery = query.toLowerCase();
      const walker = document.createTreeWalker(docContent, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        if (node.parentElement && (node.parentElement.tagName === "SCRIPT" || node.parentElement.tagName === "STYLE")) continue;
        if (node.textContent.toLowerCase().includes(lowerQuery)) {
          textNodes.push(node);
        }
      }
      textNodes.forEach((textNode) => {
        const text = textNode.textContent;
        const lowerText = text.toLowerCase();
        const parent = textNode.parentNode;
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        let matchIndex;
        while ((matchIndex = lowerText.indexOf(lowerQuery, lastIndex)) !== -1) {
          if (matchIndex > lastIndex) {
            frag.appendChild(document.createTextNode(text.substring(lastIndex, matchIndex)));
          }
          const mark = document.createElement("mark");
          mark.className = "search-highlight";
          mark.textContent = text.substring(matchIndex, matchIndex + query.length);
          frag.appendChild(mark);
          searchMatches.push(mark);
          lastIndex = matchIndex + query.length;
        }
        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        parent.replaceChild(frag, textNode);
      });
      if (searchMatches.length > 0) {
        searchCurrentIndex = 0;
        searchMatches[0].classList.add("search-current");
        searchMatches[0].scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("searchInput").classList.remove("no-match");
      } else {
        document.getElementById("searchInput").classList.add("no-match");
      }
      updateSearchCount();
    }
    function navigateSearch(direction) {
      if (searchMatches.length === 0) return;
      searchMatches[searchCurrentIndex].classList.remove("search-current");
      searchCurrentIndex = (searchCurrentIndex + direction + searchMatches.length) % searchMatches.length;
      searchMatches[searchCurrentIndex].classList.add("search-current");
      searchMatches[searchCurrentIndex].scrollIntoView({ behavior: "smooth", block: "center" });
      updateSearchCount();
    }
    function updateSearchCount() {
      const countEl = document.getElementById("searchCount");
      if (searchMatches.length === 0) {
        const query = document.getElementById("searchInput").value.trim();
        countEl.textContent = query ? "0/0" : "";
      } else {
        countEl.textContent = `${searchCurrentIndex + 1}/${searchMatches.length}`;
      }
    }
    function clearSearchHighlights() {
      const docContent = document.getElementById("documentContent");
      const marks = docContent.querySelectorAll("mark.search-highlight");
      marks.forEach((mark) => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      });
      searchMatches = [];
      searchCurrentIndex = -1;
    }
    let tocSearchDebounceTimer = null;
    let tocPreSearchCollapsedSet = null;
    function initTocSearch() {
      const tocSearchInput = document.getElementById("tocSearchInput");
      const tocSearchClear = document.getElementById("tocSearchClear");
      tocSearchInput.addEventListener("input", () => {
        const val = tocSearchInput.value.trim();
        tocSearchClear.style.display = val ? "" : "none";
        if (tocSearchDebounceTimer) clearTimeout(tocSearchDebounceTimer);
        tocSearchDebounceTimer = setTimeout(() => performTocSearch(val), 150);
      });
      tocSearchClear.addEventListener("click", () => {
        tocSearchInput.value = "";
        tocSearchClear.style.display = "none";
        clearTocSearch();
      });
    }
    function performTocSearch(query) {
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      const items = tocList.querySelectorAll(".toc-item");
      if (items.length === 0) return;
      const noResults = tocList.querySelector(".toc-no-results");
      if (noResults) noResults.remove();
      if (!query) {
        clearTocSearch();
        return;
      }
      const lowerQuery = query.toLowerCase();
      if (!tocPreSearchCollapsedSet) {
        tocPreSearchCollapsedSet = /* @__PURE__ */ new Set();
        items.forEach((item) => {
          if (item.classList.contains("toc-collapsed")) {
            tocPreSearchCollapsedSet.add(item.dataset.headingId);
          }
        });
      }
      const matchedIndices = /* @__PURE__ */ new Set();
      items.forEach((item, i) => {
        const textSpan = item.querySelector(".toc-item-text");
        const text = textSpan ? textSpan.textContent : "";
        if (text.toLowerCase().includes(lowerQuery)) {
          matchedIndices.add(i);
        }
      });
      const visibleIndices = new Set(matchedIndices);
      matchedIndices.forEach((idx) => {
        const level = parseInt(items[idx].dataset.level, 10);
        for (let j = idx - 1; j >= 0; j--) {
          const parentLevel = parseInt(items[j].dataset.level, 10);
          if (parentLevel < level) {
            visibleIndices.add(j);
          }
        }
      });
      const allVisible = new Set(visibleIndices);
      matchedIndices.forEach((idx) => {
        let currentLevel = parseInt(items[idx].dataset.level, 10);
        for (let j = idx - 1; j >= 0; j--) {
          const jLevel = parseInt(items[j].dataset.level, 10);
          if (jLevel < currentLevel) {
            allVisible.add(j);
            currentLevel = jLevel;
            if (currentLevel <= 1) break;
          }
        }
      });
      let hasVisible = false;
      items.forEach((item, i) => {
        const textSpan = item.querySelector(".toc-item-text");
        if (allVisible.has(i)) {
          item.style.display = "";
          hasVisible = true;
          item.classList.remove("toc-collapsed");
          if (matchedIndices.has(i) && textSpan) {
            const text = textSpan.textContent;
            const lowerText = text.toLowerCase();
            const matchStart = lowerText.indexOf(lowerQuery);
            if (matchStart !== -1) {
              textSpan.innerHTML = escapeHtmlForToc(text.substring(0, matchStart)) + "<mark>" + escapeHtmlForToc(text.substring(matchStart, matchStart + query.length)) + "</mark>" + escapeHtmlForToc(text.substring(matchStart + query.length));
            }
          } else if (textSpan) {
            textSpan.textContent = textSpan.textContent;
          }
        } else {
          item.style.display = "none";
          if (textSpan) textSpan.textContent = textSpan.textContent;
        }
      });
      if (!hasVisible) {
        const noResultsDiv = document.createElement("div");
        noResultsDiv.className = "toc-no-results";
        noResultsDiv.textContent = t("toc.no_results");
        tocList.appendChild(noResultsDiv);
      }
    }
    function clearTocSearch() {
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      const items = tocList.querySelectorAll(".toc-item");
      const noResults = tocList.querySelector(".toc-no-results");
      if (noResults) noResults.remove();
      items.forEach((item) => {
        item.style.display = "";
        const textSpan = item.querySelector(".toc-item-text");
        if (textSpan) textSpan.textContent = textSpan.textContent;
      });
      if (tocPreSearchCollapsedSet) {
        items.forEach((item) => {
          if (tocPreSearchCollapsedSet.has(item.dataset.headingId)) {
            item.classList.add("toc-collapsed");
          } else {
            item.classList.remove("toc-collapsed");
          }
        });
        const tocData = getTocDataFromItems(items);
        applyTocCollapseState(tocList, tocData);
        tocPreSearchCollapsedSet = null;
      }
    }
    function escapeHtmlForToc(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function scheduleTocRefresh() {
      if (tocRefreshTimer) clearTimeout(tocRefreshTimer);
      tocRefreshTimer = setTimeout(() => {
        tocRefreshTimer = null;
        refreshToc();
      }, TOC_REFRESH_DELAY);
    }
    function toggleZenMode() {
      zenMode = !zenMode;
      const body = document.body;
      const zenBtn = document.getElementById("btnZenMode");
      if (zenMode) {
        zenBtn._prevTocCollapsed = tocCollapsed;
        zenBtn._prevAnnotationsCollapsed = document.getElementById("annotationsPanel").classList.contains("collapsed");
        body.classList.add("zen-mode");
        zenBtn.classList.add("zen-active");
        zenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.3"/><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="0.7" opacity="0.5"/></svg>';
        zenBtn.title = t("toolbar.exit_zen");
        vscode.postMessage({ type: "zenModeChanged", payload: { entering: true } });
      } else {
        body.classList.remove("zen-mode");
        zenBtn.classList.remove("zen-active");
        zenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2"/></svg>';
        zenBtn.title = t("toolbar.zen_title");
        vscode.postMessage({ type: "zenModeChanged", payload: { entering: false } });
        if (!zenBtn._prevTocCollapsed) {
          toggleTocPanel(true);
        }
        if (!zenBtn._prevAnnotationsCollapsed) {
          toggleAnnotationsPanel(true);
        }
      }
    }
    function toggleTocPanel(show) {
      const tocPanel = document.getElementById("tocPanel");
      const tocToolbarBtn = document.getElementById("btnToggleToc");
      if (show) {
        tocPanel.classList.remove("collapsed");
        tocCollapsed = false;
      } else {
        tocPanel.style.width = "";
        tocPanel.classList.add("collapsed");
        tocCollapsed = true;
      }
      if (tocToolbarBtn) {
        tocToolbarBtn.classList.toggle("toc-active", show);
        tocToolbarBtn.classList.toggle("toc-inactive", !show);
      }
      const settings = Settings.getSettings();
      if (settings.showToc !== show) {
        Settings.applySettings({ ...settings, showToc: show });
        vscode.postMessage({ type: "saveSettings", payload: { ...settings, showToc: show } });
      }
    }
    function refreshToc() {
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      const docContent = document.getElementById("documentContent");
      const headings = docContent.querySelectorAll("h1, h2, h3, h4, h5, h6");
      if (headings.length === 0) {
        tocList.innerHTML = '<div class="toc-empty">\u5F53\u524D\u6587\u6863\u6CA1\u6709\u6807\u9898</div>';
        return;
      }
      const prevCollapsedSet = /* @__PURE__ */ new Set();
      tocList.querySelectorAll(".toc-item.toc-collapsed").forEach((item) => {
        prevCollapsedSet.add(item.dataset.headingId);
      });
      tocList.innerHTML = "";
      const tocData = [];
      headings.forEach((heading, idx) => {
        const level = parseInt(heading.tagName.charAt(1), 10);
        const text = heading.textContent.trim();
        if (!text) return;
        if (!heading.id) heading.id = "toc-heading-" + idx;
        tocData.push({ level, text, id: heading.id });
      });
      tocData.forEach((item, idx) => {
        const hasChildren = idx < tocData.length - 1 && tocData[idx + 1].level > item.level;
        item.hasChildren = hasChildren;
      });
      tocData.forEach((item, idx) => {
        const tocItem = document.createElement("div");
        tocItem.className = "toc-item";
        tocItem.dataset.level = item.level;
        tocItem.dataset.headingId = item.id;
        tocItem.dataset.index = idx;
        if (item.hasChildren) {
          const arrow = document.createElement("span");
          arrow.className = "toc-arrow";
          arrow.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 2l4 3-4 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          arrow.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleTocItemCollapse(tocItem, idx, tocData);
          });
          tocItem.appendChild(arrow);
        } else {
          const spacer = document.createElement("span");
          spacer.className = "toc-arrow-spacer";
          tocItem.appendChild(spacer);
        }
        const textSpan = document.createElement("span");
        textSpan.className = "toc-item-text";
        textSpan.textContent = item.text;
        textSpan.title = item.text;
        tocItem.appendChild(textSpan);
        if (prevCollapsedSet.has(item.id)) {
          tocItem.classList.add("toc-collapsed");
        }
        tocItem.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetHeading = document.getElementById(item.id);
          if (!targetHeading) return;
          const container = document.getElementById("documentContent");
          const containerRect = container.getBoundingClientRect();
          const headingRect = targetHeading.getBoundingClientRect();
          container.scrollTo({ top: headingRect.top - containerRect.top + container.scrollTop - 16, behavior: "smooth" });
          setTocActive(tocItem);
        });
        tocList.appendChild(tocItem);
      });
      applyTocCollapseState(tocList, tocData);
      updateTocActiveItem();
    }
    function toggleTocItemCollapse(tocItem, idx, tocData) {
      const isCollapsed = tocItem.classList.contains("toc-collapsed");
      if (isCollapsed) {
        tocItem.classList.remove("toc-collapsed");
      } else {
        tocItem.classList.add("toc-collapsed");
      }
      const tocList = document.getElementById("tocList");
      applyTocCollapseState(tocList, tocData);
    }
    function applyTocCollapseState(tocList, tocData) {
      const items = tocList.querySelectorAll(".toc-item");
      items.forEach((item) => {
        item.style.display = "";
      });
      const collapsedIndices = [];
      items.forEach((item, i) => {
        if (item.classList.contains("toc-collapsed")) {
          collapsedIndices.push(i);
        }
      });
      collapsedIndices.forEach((ci) => {
        const parentLevel = tocData[ci].level;
        for (let j = ci + 1; j < tocData.length; j++) {
          if (tocData[j].level <= parentLevel) break;
          items[j].style.display = "none";
        }
      });
    }
    function tocCollapseAll() {
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      const items = tocList.querySelectorAll(".toc-item");
      const tocData = getTocDataFromItems(items);
      items.forEach((item, i) => {
        if (tocData[i] && tocData[i].hasChildren) {
          item.classList.add("toc-collapsed");
        }
      });
      applyTocCollapseState(tocList, tocData);
    }
    function tocExpandAll() {
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      const items = tocList.querySelectorAll(".toc-item");
      const tocData = getTocDataFromItems(items);
      items.forEach((item) => {
        item.classList.remove("toc-collapsed");
      });
      applyTocCollapseState(tocList, tocData);
    }
    function getTocDataFromItems(items) {
      const tocData = [];
      items.forEach((item, i) => {
        const level = parseInt(item.dataset.level, 10);
        const hasChildren = i < items.length - 1 && parseInt(items[i + 1].dataset.level, 10) > level;
        tocData.push({ level, hasChildren, id: item.dataset.headingId });
      });
      return tocData;
    }
    function setTocActive(activeTocItem) {
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      tocList.querySelectorAll(".toc-item").forEach((item) => item.classList.remove("active"));
      if (activeTocItem) {
        activeTocItem.classList.add("active");
        tocScrollToItem(activeTocItem);
      }
    }
    function updateTocActiveItem() {
      if (tocCollapsed) return;
      const tocList = document.getElementById("tocList");
      if (!tocList) return;
      const tocItems = tocList.querySelectorAll(".toc-item");
      if (tocItems.length === 0) return;
      const docContent = document.getElementById("documentContent");
      const containerRect = docContent.getBoundingClientRect();
      const topThreshold = containerRect.top + 20;
      let activeItem = null;
      for (let i = tocItems.length - 1; i >= 0; i--) {
        const heading = document.getElementById(tocItems[i].dataset.headingId);
        if (!heading) continue;
        if (heading.getBoundingClientRect().top <= topThreshold) {
          activeItem = tocItems[i];
          break;
        }
      }
      if (!activeItem && tocItems.length > 0) activeItem = tocItems[0];
      setTocActive(activeItem);
    }
    function tocScrollToItem(tocItem) {
      const tocList = document.getElementById("tocList");
      if (!tocList || !tocItem) return;
      const listRect = tocList.getBoundingClientRect();
      const itemRect = tocItem.getBoundingClientRect();
      if (itemRect.top < listRect.top) tocList.scrollTop -= listRect.top - itemRect.top + 10;
      else if (itemRect.bottom > listRect.bottom) tocList.scrollTop += itemRect.bottom - listRect.bottom + 10;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  // webview/src/entries/main.entry.js
  globalThis.I18n = I18n;
  globalThis.t = t2;
  globalThis.Store = Store2;
  globalThis.Renderer = Renderer2;
  globalThis.Annotations = Annotations2;
  globalThis.Exporter = Exporter2;
  globalThis.Settings = Settings2;
  globalThis.EditMode = EditMode2;
  initApp();
})();
