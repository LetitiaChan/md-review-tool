import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { readAppSource } from './helpers/module-source';

/**
 * GitHub issue #3–#6 源码级回归守卫
 *
 * 行为级用例见 test/ui/specs/issue-regressions.spec.ts；这里守住容易被
 * 后续重构改回去的关键调用关系。
 */
suite('Issues #3-#6 Regression Guards', () => {
    let extPath: string;

    function read(...segments: string[]): string {
        if (!extPath) return '';
        return fs.readFileSync(path.join(extPath, ...segments), 'utf-8');
    }

    suiteSetup(() => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        extPath = ext?.extensionPath || '';
    });

    test('BT-issue3.guard store.save 仅在已有记录/有批注/版本变化时触发自动保存', () => {
        const source = read('webview', 'js', 'store.js');
        if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        assert.ok(source.includes('hasReviewRecord'), 'Store 应维护 hasReviewRecord 状态');
        assert.ok(
            /if\s*\(hasAnnotations\s*\|\|\s*versionBumped\s*\|\|\s*data\.hasReviewRecord\)/.test(source),
            'save() 应在无批注、无记录且版本未变化时跳过自动保存'
        );
        assert.ok(source.includes('data.hasReviewRecord = false'), '切换文件/清空批注后应重置 hasReviewRecord');
    });

    test('BT-issue4.guard 手动保存成功后同步批阅记录快照', () => {
        const exportSource = read('webview', 'js', 'export.js');
        assert.ok(sourceHas(exportSource, 'function doAutoSaveNow('), 'export.js 应导出 doAutoSaveNow');
        assert.ok(sourceHas(exportSource, 'doAutoSaveNow'), 'doAutoSaveNow 应被导出');

        const appSource = readAppSource(extPath);
        assert.ok(
            /Exporter\.doAutoSaveNow\s*\(/.test(appSource),
            'handleSaveMd 保存成功后应调用 Exporter.doAutoSaveNow()'
        );
    });

    test('BT-issue5.guard 导出模板使用 i18n key，不再硬编码中文', () => {        const source = read('webview', 'js', 'export.js');
        if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }
        for (const key of [
            'export.instruction_num',
            'export.label_modify',
            'export.op_modify',
            'export.field_separator',
            'export.section_json',
            'export.json_hint',
            'export.image_note',
            'notification.export_saved',
            'notification.auto_saved',
        ]) {
            assert.ok(source.includes(`t('${key}'`), `export.js 应使用 t('${key}')`);
        }
        assert.ok(!source.includes('## 原始数据（JSON）'), '不应再硬编码中文标题');
        assert.ok(!source.includes('根据评论修改内容'), '不应再硬编码中文操作说明');
    });

    test('BT-issue6.guard 批注快捷键已接入 app.js', () => {
        const annotations = read('webview', 'js', 'annotations.js');
        const app = readAppSource(extPath);
        if (!annotations || !app) { assert.ok(true, '测试环境中扩展路径不可用'); return; }

        for (const fn of [
            'openCommentForSelection',
            'markDeleteForSelection',
            'openInsertForSelection',
            'navigateAnnotation',
            'submitActiveModal',
            'isModalOpen',
        ]) {
            assert.ok(annotations.includes(fn), `annotations.js 应提供 ${fn}`);
            assert.ok(app.includes(fn), `app.js 应调用 ${fn}`);
        }
        assert.ok(annotations.includes('captureSelectionFromDOM'), '键盘快捷键应复用 DOM 选区解析');
        assert.ok(app.includes("key === 'd'"), '应绑定 Ctrl+Shift+D');
        assert.ok(app.includes("key === 'a'"), '应绑定 Ctrl+Shift+A');
        assert.ok(app.includes("key === 'b'"), '应绑定 Ctrl+Shift+B');
        assert.ok(app.includes("key === 'j'"), '应绑定 Ctrl+Shift+J');
        assert.ok(app.includes("key === 'k'"), '应绑定 Ctrl+Shift+K');
    });

    test('BT-issue5-6.guard 新增 i18n key 在中英字典中都存在', () => {
        const source = read('webview', 'js', 'i18n.js');
        if (!source) { assert.ok(true, '测试环境中扩展路径不可用'); return; }

        const exportKeys = [
            'export.field_separator',
            'export.image_alt',
            'export.field_locate_status',
            'export.orphaned_note',
        ];
        const helpKeys = [
            'help.shortcut_comment',
            'help.shortcut_delete',
            'help.shortcut_insert_after',
            'help.shortcut_insert_before',
            'help.shortcut_next_annotation',
            'help.shortcut_prev_annotation',
            'help.shortcut_toggle_toc',
        ];

        for (const key of [...exportKeys, ...helpKeys]) {
            const occurrences = (source.match(new RegExp(`'${key}':`, 'g')) || []).length;
            assert.strictEqual(occurrences, 2, `i18n key ${key} 应在中英字典中各出现一次`);
        }
    });
});

function sourceHas(source: string, token: string): boolean {
    return !!source && source.includes(token);
}
