/**
 * serializer-state.js — O(n) 的 Markdown 序列化状态
 *
 * prosemirror-markdown 默认的 MarkdownSerializerState 用 `this.out += ...`
 * 累积输出，并在 atBlank/ensureNewLine/text 中反复读取整个字符串
 * （V8 需要不断扁平化 rope），大文档下退化为 O(n²)：
 *   106KB 26ms / 302KB 264ms / 507KB 1478ms。
 *
 * 这里继承基类，仅覆盖所有直接读写 out 的方法（flushClose / atBlank /
 * ensureNewLine / write / text），改为追加到 chunks 数组，最后一次性 join。
 * 其余方法（renderContent / renderInline / renderList / wrapBlock 等）原样复用，
 * 保证输出与基类逐字节一致。
 */

import { MarkdownSerializer, MarkdownSerializerState } from 'prosemirror-markdown';

class ChunkedMarkdownSerializerState extends MarkdownSerializerState {
    constructor(nodes, marks, options) {
        super(nodes, marks, options);
        this._chunks = [];
        // 基类构造时会设置 this.out = ''，这里保持为空字符串以兼容读取方
        this.out = '';
    }

    /** 已输出内容的末尾 count 个字符（跨 chunk 安全） */
    _tail(count) {
        let s = '';
        for (let i = this._chunks.length - 1; i >= 0 && s.length < count; i--) {
            s = this._chunks[i] + s;
        }
        // 上面的循环会带上整个尾块，必须再裁剪，否则 atBlank 判断会失效
        // （例如 write('```python\n') 之后尾块是整个字符串而不是 '\n'）
        return s.slice(-count);
    }

    _append(str) {
        if (str) this._chunks.push(str);
    }

    _popLastChar() {
        for (let i = this._chunks.length - 1; i >= 0; i--) {
            const chunk = this._chunks[i];
            if (chunk.length > 0) {
                this._chunks[i] = chunk.slice(0, -1);
                if (this._chunks[i] === '') this._chunks.pop();
                return;
            }
        }
    }

    atBlank() {
        const tail = this._tail(1);
        return tail === '' || tail === '\n';
    }

    ensureNewLine() {
        if (!this.atBlank()) this._append('\n');
    }

    flushClose(size = 2) {
        if (this.closed) {
            if (!this.atBlank()) this._append('\n');
            if (size > 1) {
                let delimMin = this.delim;
                const trim = /\s+$/.exec(delimMin);
                if (trim) delimMin = delimMin.slice(0, delimMin.length - trim[0].length);
                for (let i = 1; i < size; i++) this._append(delimMin + '\n');
            }
            this.closed = null;
        }
    }

    write(content) {
        this.flushClose();
        if (this.delim && this.atBlank()) this._append(this.delim);
        if (content) this._append(content);
    }

    text(text, escape = true) {
        const lines = String(text).split('\n');
        for (let i = 0; i < lines.length; i++) {
            // 与基类一致：每行开始先 write()（内部 flushClose + 行首 delim），
            // 再处理 "[" 前的 "!" 转义与正文
            this.write();
            if (!escape && lines[i][0] === '[' && /(^|[^\\])!$/.test(this._tail(2))) {
                this._popLastChar();
                this._append('\\!');
            }
            this._append(escape ? this.esc(lines[i], this.atBlockStart) : lines[i]);
            if (i !== lines.length - 1) this._append('\n');
        }
    }

    /** 取出完整输出 */
    toString() {
        return this._chunks.join('');
    }
}

class ChunkedMarkdownSerializer extends MarkdownSerializer {
    serialize(content, options = {}) {
        // 与基类保持一致：合并实例默认 options，避免 options 为 undefined
        const opts = Object.assign({}, this.options, options);
        const state = new ChunkedMarkdownSerializerState(this.nodes, this.marks, opts);
        state.renderContent(content);
        return state.toString();
    }
}

export { ChunkedMarkdownSerializer, ChunkedMarkdownSerializerState };
