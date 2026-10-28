import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 脚注评论接线测试
 *
 * 这些断言保护宿主端已由 fileService.test.ts 覆盖、但跨文件接线容易被改动破坏的部分：
 * 弹窗勾选框、i18n 文案、submitComment 调用宿主、打开文档时恢复脚注、Store 导出接口。
 */
suite('Footnote Comment Wiring — 脚注评论接线', () => {
    const extension = vscode.extensions.getExtension('letitia.md-human-review');
    const projectRoot = extension ? extension.extensionPath : path.resolve(__dirname, '../../..');

    function read(relativePath: string): string {
        return fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8');
    }

    test('BT-footnote-wiring.1 index.html 评论弹窗应提供脚注勾选框', () => {
        const html = read('webview/index.html');
        assert.ok(/id="commentAsFootnote"/.test(html), '评论弹窗应包含 id="commentAsFootnote"');
        assert.ok(
            /data-i18n="modal\.comment\.as_footnote"/.test(html),
            '勾选框文案应走 i18n'
        );
    });

    test('BT-footnote-wiring.2 i18n 应包含中英文脚注与未定位文案', () => {
        const i18n = read('webview/js/i18n.js');
        assert.strictEqual(
            (i18n.match(/'modal\.comment\.as_footnote'/g) || []).length,
            2,
            'modal.comment.as_footnote 应有中英文两条'
        );
        assert.strictEqual(
            (i18n.match(/'annotation\.unresolved'/g) || []).length,
            2,
            'annotation.unresolved 应有中英文两条'
        );
    });

    test('BT-footnote-wiring.3 submitComment 应调用 addFootnoteComment 并记录 footnoteId', () => {
        const source = read('webview/js/annotations.js');
        assert.ok(source.includes("_callHost('addFootnoteComment'"), 'submitComment 应调用宿主 addFootnoteComment');
        assert.ok(/comment:\s*comment,\s*footnoteId,/.test(source), '新批注应携带 footnoteId');
        assert.ok(/source:\s*footnoteId\s*\?\s*'footnote'/.test(source), '脚注批注应标记 source=footnote');
        assert.ok(source.includes('Store.setRawMarkdown'), '应把宿主返回的新内容同步到 rawMarkdown');
    });

    test('BT-footnote-wiring.4 打开文档的各条路径都应恢复脚注评论', () => {
        const app = read('webview/js/app.js');
        const restoreCalls = app.match(/Store\.restoreFootnoteComments\(/g) || [];
        assert.ok(restoreCalls.length >= 3, '过期恢复、记录恢复、无记录三条路径都应调用 restoreFootnoteComments');
        assert.ok(/Store\.reanchorAnnotations\(/.test(app), '恢复后应重新定位批注');
    });

    test('BT-footnote-wiring.5 Store 应导出脚注恢复与批注重定位接口', () => {
        const store = read('webview/js/store.js');
        assert.ok(/function\s+restoreFootnoteComments\s*\(/.test(store));
        assert.ok(/function\s+reanchorAnnotations\s*\(/.test(store));

        const exportBlock = store.slice(store.lastIndexOf('return {'));
        assert.ok(/\brestoreFootnoteComments\b/.test(exportBlock), 'restoreFootnoteComments 必须导出');
        assert.ok(/\breanchorAnnotations\b/.test(exportBlock), 'reanchorAnnotations 必须导出');
    });

    test('BT-footnote-wiring.6 宿主 readFile 应向 webview 返回 footnoteComments', () => {
        const source = read('src/fileService.ts');
        assert.ok(/footnoteComments:\s*this\.extractFootnoteComments\(content\)/.test(source));
    });
});
