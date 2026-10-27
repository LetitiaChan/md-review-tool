/**
 * paste.js — Rich Mode 智能粘贴（图片 / HTML）
 */

import { parseMarkdown } from '../../js/pm-markdown-bridge.js';

let _turndown = null;

function getTurndown() {
    if (_turndown || typeof TurndownService === 'undefined') return _turndown;
    const ts = new TurndownService({
        headingStyle: 'atx', hr: '---', bulletListMarker: '-',
        codeBlockStyle: 'fenced', emDelimiter: '*', strongDelimiter: '**',
    });
    ts.escape = s => s;
    ts.keep(['kbd']);
    _turndown = ts;
    return _turndown;
}

function handlePaste(view, event, slice) {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return false;

    // 图片粘贴检测：优先处理图片文件
    const files = clipboardData.files;
    if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                // 5MB 大小限制
                if (file.size > 5 * 1024 * 1024) {
                    if (globalThis.__vscodeApi) {
                        globalThis.__vscodeApi.postMessage({ type: 'showWarning', payload: { message: 'Image too large (max 5MB)' } });
                    }
                    return true;
                }
                // 读取为 base64 DataURL
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    const ext = file.type.split('/')[1] || 'png';
                    const now = new Date();
                    const timestamp = now.getFullYear().toString() +
                        String(now.getMonth() + 1).padStart(2, '0') +
                        String(now.getDate()).padStart(2, '0') + '-' +
                        String(now.getHours()).padStart(2, '0') +
                        String(now.getMinutes()).padStart(2, '0') +
                        String(now.getSeconds()).padStart(2, '0');
                    const random = Math.random().toString(36).slice(2, 6);
                    const filename = `image-${timestamp}-${random}.${ext}`;
                    if (globalThis.__vscodeApi) {
                        globalThis.__vscodeApi.postMessage({
                            type: 'saveImage',
                            payload: { dataUrl, filename, requestId: `img-${Date.now()}` },
                        });
                    }
                };
                reader.readAsDataURL(file);
                return true; // 阻止默认粘贴行为
            }
        }
    }

    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html && html.trim()) {
        // HTML → markdown → PM doc
        try {
            // 使用 turndown 将 HTML 转为 markdown（复用现有安全配置）
            let markdown = text; // 降级：使用纯文本
            const ts = getTurndown();
            if (ts) {
                markdown = ts.turndown(html);
            }

            const doc = parseMarkdown(markdown);
            if (doc && doc.content.size > 0) {
                const tr = view.state.tr.replaceSelection(doc.slice(0, doc.content.size));
                view.dispatch(tr);
                return true;
            }
        } catch (e) {
            console.warn('[pm] paste HTML→markdown failed, falling back to plain text', e);
        }
    }

    // 纯文本粘贴：走默认处理
    return false;
}

export { handlePaste };
