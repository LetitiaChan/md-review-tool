/**
 * slash-command-plugin.js — Slash Command ProseMirror Plugin
 *
 * 监听 "/" 输入，在行首时激活命令面板。
 * 支持模糊搜索、键盘导航（↑↓/Enter/Esc）、鼠标点击。
 *
 * Change: add-inputrules-and-slash-command
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { getSlashCommands } from './slash-commands.js';

export const slashCommandKey = new PluginKey('slashCommand');

/**
 * 创建 Slash Command Plugin
 * @param {Object} options
 * @param {Object} options.commandMap - PM commandMap（来自 pm.entry.js）
 * @param {Function} options.getI18n - i18n 翻译函数
 * @returns {Plugin}
 */
export function createSlashCommandPlugin({ commandMap, getI18n }) {
    let menuEl = null;       // 命令面板 DOM 元素
    let activeView = null;   // 当前 EditorView 引用
    let lastMenuKey = null;  // 上次渲染的过滤结果签名（避免重复重绘）

    return new Plugin({
        key: slashCommandKey,

        state: {
            init() {
                return { active: false, filterText: '', selectedIndex: 0, triggerPos: -1 };
            },
            apply(tr, prev, oldState, newState) {
                const meta = tr.getMeta(slashCommandKey);
                if (meta) return meta;
                // 如果文档变化且面板打开，更新 filterText
                // 注意：Transaction 没有 state 属性，必须用 apply 的 newState 参数
                if (prev.active && tr.docChanged) {
                    const $from = newState.selection.$from;
                    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
                    if (textBefore.startsWith('/')) {
                        return { ...prev, filterText: textBefore.slice(1), selectedIndex: 0 };
                    } else {
                        // "/" 被删除了，关闭面板
                        return { active: false, filterText: '', selectedIndex: 0, triggerPos: -1 };
                    }
                }
                return prev;
            },
        },

        props: {
            handleTextInput(view, from, to, text) {
                if (text === '/') {
                    const $from = view.state.selection.$from;
                    const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
                    // 仅在行首（段落开头或前面只有空白）时触发
                    if (textBefore.trim() === '') {
                        // 延迟到文本插入后再激活
                        setTimeout(() => {
                            const tr = view.state.tr.setMeta(slashCommandKey, {
                                active: true,
                                filterText: '',
                                selectedIndex: 0,
                                triggerPos: from,
                            });
                            view.dispatch(tr);
                            showMenu(view);
                        }, 0);
                    }
                }
                return false; // 不阻止默认输入
            },

            handleKeyDown(view, event) {
                const pluginState = slashCommandKey.getState(view.state);
                if (!pluginState || !pluginState.active) return false;

                const commands = getFilteredCommands(pluginState.filterText, getI18n);

                switch (event.key) {
                    case 'ArrowDown': {
                        event.preventDefault();
                        const newIndex = (pluginState.selectedIndex + 1) % Math.max(commands.length, 1);
                        const tr = view.state.tr.setMeta(slashCommandKey, { ...pluginState, selectedIndex: newIndex });
                        view.dispatch(tr);
                        updateMenuHighlight(newIndex);
                        return true;
                    }
                    case 'ArrowUp': {
                        event.preventDefault();
                        const len = Math.max(commands.length, 1);
                        const newIndex = (pluginState.selectedIndex - 1 + len) % len;
                        const tr = view.state.tr.setMeta(slashCommandKey, { ...pluginState, selectedIndex: newIndex });
                        view.dispatch(tr);
                        updateMenuHighlight(newIndex);
                        return true;
                    }
                    case 'Enter': {
                        event.preventDefault();
                        const cmd = commands[pluginState.selectedIndex] || commands[0];
                        if (cmd) {
                            executeCommand(view, cmd, pluginState, commandMap);
                        }
                        return true;
                    }
                    case 'Escape': {
                        event.preventDefault();
                        closeMenu(view);
                        return true;
                    }
                    case 'ArrowLeft': {
                        // 如果光标移到 "/" 之前，关闭面板
                        const $from = view.state.selection.$from;
                        if ($from.parentOffset <= 1) {
                            setTimeout(() => closeMenu(view), 0);
                        }
                        return false;
                    }
                    case 'Backspace': {
                        // 如果删除后 "/" 不存在了，关闭面板
                        const $from = view.state.selection.$from;
                        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
                        if (textBefore === '/') {
                            // 将要删除 "/"，关闭面板
                            setTimeout(() => closeMenu(view), 0);
                        }
                        return false;
                    }
                    default:
                        return false;
                }
            },
        },

        view(editorView) {
            activeView = editorView;
            return {
                update(view, prevState) {
                    activeView = view;
                    const pluginState = slashCommandKey.getState(view.state);
                    if (pluginState && pluginState.active) {
                        renderMenu(view, pluginState);
                    } else {
                        hideMenu();
                    }
                },
                destroy() {
                    hideMenu();
                    if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
                    menuEl = null;
                    lastMenuKey = null;
                    activeView = null;
                },
            };
        },
    });

    // ===== 内部函数 =====

    function getFilteredCommands(filterText, i18nFn) {
        const commands = getSlashCommands(i18nFn);
        if (!filterText) return commands;
        const lower = filterText.toLowerCase();
        return commands.filter(cmd =>
            cmd.label.toLowerCase().includes(lower) ||
            cmd.id.toLowerCase().includes(lower) ||
            cmd.labelKey.toLowerCase().includes(lower)
        );
    }

    function showMenu(view) {
        if (!menuEl) {
            menuEl = document.createElement('div');
            menuEl.className = 'slash-command-menu';
            menuEl.setAttribute('role', 'listbox');
            document.body.appendChild(menuEl);
        }
        renderMenu(view, slashCommandKey.getState(view.state));
    }

    function hideMenu() {
        if (menuEl) {
            menuEl.style.display = 'none';
        }
    }

    function closeMenu(view) {
        const tr = view.state.tr.setMeta(slashCommandKey, {
            active: false, filterText: '', selectedIndex: 0, triggerPos: -1,
        });
        view.dispatch(tr);
        hideMenu();
        lastMenuKey = null;
    }

    function renderMenu(view, pluginState) {
        if (!menuEl || !pluginState || !pluginState.active) return;

        const commands = getFilteredCommands(pluginState.filterText, getI18n);

        // 定位面板
        const coords = view.coordsAtPos(view.state.selection.from);
        const editorRect = view.dom.getBoundingClientRect();
        menuEl.style.display = 'block';
        menuEl.style.position = 'absolute';
        menuEl.style.left = `${coords.left}px`;
        menuEl.style.top = `${coords.bottom + 4}px`;
        menuEl.style.zIndex = '9999';

        // 只在过滤结果变化时重建列表；方向键/同结果输入不再重绘 DOM
        const menuKey = commands.length === 0 ? 'empty' : commands.map((c) => c.id).join(',');
        if (menuKey !== lastMenuKey) {
            lastMenuKey = menuKey;
            if (commands.length === 0) {
                menuEl.innerHTML = `<div class="slash-command-empty">${getI18n ? getI18n('slash.no_results') : 'No results'}</div>`;
            } else {
                menuEl.innerHTML = commands.map((cmd, i) => {
                    const activeClass = i === pluginState.selectedIndex ? ' slash-command-item-active' : '';
                    return `<div class="slash-command-item${activeClass}" data-index="${i}" role="option">
                    <span class="slash-command-icon">${cmd.icon}</span>
                    <span class="slash-command-label">${cmd.label}</span>
                </div>`;
                }).join('');

                // 鼠标点击事件（列表重建时才重新绑定）
                menuEl.querySelectorAll('.slash-command-item').forEach(item => {
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const index = parseInt(item.dataset.index, 10);
                        executeCommand(view, commands[index], pluginState, commandMap);
                    });
                    item.addEventListener('mouseenter', () => {
                        const index = parseInt(item.dataset.index, 10);
                        updateMenuHighlight(index);
                        const tr = view.state.tr.setMeta(slashCommandKey, { ...pluginState, selectedIndex: index });
                        view.dispatch(tr);
                    });
                });
            }
        } else if (commands.length > 0) {
            // 结果未变，只更新高亮
            updateMenuHighlight(pluginState.selectedIndex);
        }

        // 确保面板不超出视口
        const menuRect = menuEl.getBoundingClientRect();
        if (menuRect.bottom > window.innerHeight) {
            menuEl.style.top = `${coords.top - menuRect.height - 4}px`;
        }
        if (menuRect.right > window.innerWidth) {
            menuEl.style.left = `${window.innerWidth - menuRect.width - 8}px`;
        }
    }

    function updateMenuHighlight(index) {
        if (!menuEl) return;
        menuEl.querySelectorAll('.slash-command-item').forEach((item, i) => {
            item.classList.toggle('slash-command-item-active', i === index);
        });
        // 滚动到可见
        const activeItem = menuEl.querySelector('.slash-command-item-active');
        if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
    }

    function executeCommand(view, cmd, pluginState, cmdMap) {
        if (!cmd) return;

        // 先关闭面板
        closeMenu(view);

        // 删除 "/" 及 filterText
        const $from = view.state.selection.$from;
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        const slashStart = $from.pos - textBefore.length;
        const slashEnd = $from.pos;

        // 删除 slash 文本
        let tr = view.state.tr.delete(slashStart, slashEnd);
        view.dispatch(tr);

        // 执行命令
        const cmdFn = cmdMap[cmd.id];
        if (cmdFn) {
            // 对于 insertImage，需要提供默认 attrs
            if (cmd.id === 'insertImage') {
                cmdFn(view.state, view.dispatch, view, { src: '', alt: '' });
            } else if (cmd.id === 'alertBlock') {
                cmdFn(view.state, view.dispatch, view, { type: 'NOTE' });
            } else if (cmd.id === 'codeBlock') {
                cmdFn(view.state, view.dispatch, view, { language: '' });
            } else if (cmd.id === 'insertTable') {
                cmdFn(view.state, view.dispatch, view, { rows: 3, cols: 3 });
            } else {
                cmdFn(view.state, view.dispatch, view);
            }
        }

        view.focus();
    }
}
