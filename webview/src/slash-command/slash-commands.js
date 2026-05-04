/**
 * slash-commands.js — Slash Command 命令集定义
 *
 * 定义所有可通过 "/" 触发的块级命令。
 * 每个命令包含 id、labelKey（i18n 键）、icon、category 和 execute 函数。
 *
 * Change: add-inputrules-and-slash-command
 */

/**
 * 获取 Slash Command 命令列表
 * @param {Function} getI18n - i18n 翻译函数 (key => string)
 * @returns {Array<{id: string, labelKey: string, label: string, icon: string, category: string}>}
 */
export function getSlashCommands(getI18n) {
    const t = getI18n || (k => k);
    return [
        { id: 'h1', labelKey: 'slash.heading1', label: t('slash.heading1'), icon: 'H1', category: 'heading' },
        { id: 'h2', labelKey: 'slash.heading2', label: t('slash.heading2'), icon: 'H2', category: 'heading' },
        { id: 'h3', labelKey: 'slash.heading3', label: t('slash.heading3'), icon: 'H3', category: 'heading' },
        { id: 'blockquote', labelKey: 'slash.blockquote', label: t('slash.blockquote'), icon: '❝', category: 'block' },
        { id: 'codeBlock', labelKey: 'slash.code_block', label: t('slash.code_block'), icon: '⌨', category: 'block' },
        { id: 'hr', labelKey: 'slash.horizontal_rule', label: t('slash.horizontal_rule'), icon: '─', category: 'block' },
        { id: 'table', labelKey: 'slash.table', label: t('slash.table'), icon: '▦', category: 'block' },
        { id: 'ul', labelKey: 'slash.bullet_list', label: t('slash.bullet_list'), icon: '•', category: 'list' },
        { id: 'ol', labelKey: 'slash.ordered_list', label: t('slash.ordered_list'), icon: '1.', category: 'list' },
        { id: 'taskList', labelKey: 'slash.task_list', label: t('slash.task_list'), icon: '☑', category: 'list' },
        { id: 'alertBlock', labelKey: 'slash.alert_block', label: t('slash.alert_block'), icon: 'ℹ', category: 'block' },
        { id: 'insertImage', labelKey: 'slash.image', label: t('slash.image'), icon: '🖼', category: 'media' },
    ];
}
