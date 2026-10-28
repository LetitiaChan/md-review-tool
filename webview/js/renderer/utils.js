/**
 * utils.js — 渲染层通用工具
 */


// ===== HTML 转义辅助 =====
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export { escapeHtml };
