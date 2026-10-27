/**
 * keymap.js — Rich Mode 快捷键
 */

import { keymap } from 'prosemirror-keymap';
import { toggleMark } from 'prosemirror-commands';
import { undo, redo } from 'prosemirror-history';
import { splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { goToNextCell } from 'prosemirror-tables';
import { schema } from '../../js/pm-schema.js';

function buildKeymap(onSave) {
    const keys = {};

    // G1 黑名单让路
    keys['Ctrl-s'] = keys['Mod-s'] = () => { if (onSave) onSave(); return true; };
    keys['Ctrl-f'] = keys['Mod-f'] = () => false;
    keys['Ctrl-e'] = keys['Mod-e'] = () => false;
    keys['Alt-z'] = () => false;
    keys['F5'] = () => false;

    // 基础编辑命令
    keys['Mod-z'] = undo;
    keys['Mod-y'] = redo;
    keys['Shift-Mod-z'] = redo;

    // 格式化
    keys['Mod-b'] = toggleMark(schema.marks.strong);
    keys['Mod-i'] = toggleMark(schema.marks.em);
    keys['Mod-`'] = toggleMark(schema.marks.code);

    // 列表
    keys['Enter'] = splitListItem(schema.nodes.list_item);
    keys['Mod-['] = liftListItem(schema.nodes.list_item);
    keys['Mod-]'] = sinkListItem(schema.nodes.list_item);
    keys['Tab'] = goToNextCell(1);
    keys['Shift-Tab'] = goToNextCell(-1);

    return keymap(keys);
}

export { buildKeymap };
