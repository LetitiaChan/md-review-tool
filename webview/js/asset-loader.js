/**
 * asset-loader.js — 大体积依赖按需加载
 *
 * index.html 不再直接加载 KaTeX / Mermaid / Viz / ProseMirror，
 * 而是在首次需要时动态插入 <script>。URI 由宿主通过
 * window.__mdReviewAssets 注入（见 index.html 与 webviewHelper.ts）。
 *
 * CSP 的 script-src 已包含 ${cspSource}，因此这些扩展目录下的脚本可正常加载。
 */

const AssetLoader = (() => {
    const _pending = new Map();
    const _loaded = new Set();

    /**
     * 依赖是否已经可用（脚本已执行）
     */
    function isLoaded(name) {
        if (_loaded.has(name)) return true;
        switch (name) {
            case 'pm': return typeof globalThis.PM !== 'undefined';
            case 'mermaid': return typeof globalThis.mermaid !== 'undefined';
            case 'viz': return typeof globalThis.Viz !== 'undefined';
            case 'katex': return typeof globalThis.katex !== 'undefined';
            default: return false;
        }
    }

    /**
     * 确保依赖已加载；已加载时立即 resolve(true)。
     * 加载失败或超时 resolve(false)，调用方应降级（保留源码/纯文本）。
     */
    function ensure(name) {
        if (isLoaded(name)) return Promise.resolve(true);
        if (_pending.has(name)) return _pending.get(name);

        const uris = globalThis.__mdReviewAssets || {};
        const src = uris[name];
        if (!src) return Promise.resolve(false);

        const promise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;

            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                script.onload = null;
                script.onerror = null;
                _pending.delete(name);
                if (ok) _loaded.add(name);
                resolve(ok);
            };
            const timer = setTimeout(() => finish(false), 15000);

            script.onload = () => finish(true);
            script.onerror = () => finish(false);
            document.head.appendChild(script);
        });

        _pending.set(name, promise);
        return promise;
    }

    return { ensure, isLoaded };
})();

export { AssetLoader };
