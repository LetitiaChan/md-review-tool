/**
 * input-rules.js — ProseMirror 输入规则（Markdown 快捷语法）
 */

import { TextSelection } from 'prosemirror-state';
import { inputRules, wrappingInputRule, textblockTypeInputRule } from 'prosemirror-inputrules';
import { schema } from '../../js/pm-schema.js';

function buildInputRules() {
    const rules = [
        // # → heading
        textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, match => ({ level: match[1].length })),
        // > → blockquote
        wrappingInputRule(/^\s*>\s$/, schema.nodes.blockquote),
        // ``` → code_block
        textblockTypeInputRule(/^```(\w*)\s$/, schema.nodes.code_block, match => ({ language: match[1] || '' })),
        // --- → horizontal_rule
        {
            match: /^(---|___|\*\*\*)\s*$/,
            handler(state, match, start, end) {
                const tr = state.tr.replaceRangeWith(start, end, schema.nodes.horizontal_rule.create());
                return tr;
            },
        },
        // - [ ] → task list item (unchecked)
        {
            match: /^\s*[-+*]\s\[\s?\]\s$/,
            handler(state, match, start, end) {
                const listItem = schema.nodes.list_item.create({ checked: false }, schema.nodes.paragraph.create());
                const bulletList = schema.nodes.bullet_list.create(null, listItem);
                const tr = state.tr.replaceRangeWith(start, end, bulletList);
                // 将光标放到 list_item 内的 paragraph 中
                const resolvedPos = tr.doc.resolve(start + 3); // bullet_list > list_item > paragraph
                tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos));
                return tr;
            },
        },
        // - [x] / - [X] → task list item (checked)
        {
            match: /^\s*[-+*]\s\[[xX]\]\s$/,
            handler(state, match, start, end) {
                const listItem = schema.nodes.list_item.create({ checked: true }, schema.nodes.paragraph.create());
                const bulletList = schema.nodes.bullet_list.create(null, listItem);
                const tr = state.tr.replaceRangeWith(start, end, bulletList);
                const resolvedPos = tr.doc.resolve(start + 3);
                tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos));
                return tr;
            },
        },
        // - → bullet_list
        wrappingInputRule(/^\s*[-+*]\s$/, schema.nodes.bullet_list),
        // 1. → ordered_list
        wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, match => ({ start: +match[1] })),
    ];
    return inputRules({ rules });
}

export { buildInputRules };
