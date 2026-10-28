/**
 * context.js — Renderer 的共享可变状态
 *
 * renderer.js 原先是一个带 20 个闭包变量的 IIFE，导致无法拆分为模块。
 * 这里把状态集中到一个单例对象，各 renderer/* 模块按需读写。
 */

const RenderContext = {
    // 图片 URI 缓存：原始相对路径 -> webview URI
    imageUriCache: {},
    // 渲染过程中收集到的相对图片路径（替代 requestImageUris 里的全文 marked.parse）
    collectedImagePaths: new Set(),

    // Mermaid 渲染状态
    mermaidCounter: 0,
    mermaidInitialized: false,
    mermaidTheme: null,

    // 标题 slug 去重计数（每次整篇渲染重置）
    slugCounts: Object.create(null),

    // YAML Front Matter 卡片展开状态
    frontmatterExpanded: false,
    frontmatterKey: null,

    // 增量渲染：每块「无批注」HTML、原始块文本、上次批注快照
    blockBaseHtml: [],
    blockRaw: [],
    lastAnnotations: [],

    // 数学公式（占位符与公式体一一对应）
    mathExpressions: [],

    // 解析阶段收集的跨块定义
    refLinkDefs: [],
    footnoteDefs: [],
    rawBlocksBeforeExtract: [],
    orphanedDefBlocks: [],
    inlineExtractedDefs: [],

    // marked 配置与代码高亮缓存
    highlightConfigured: false,
    highlightCache: new Map(),

    // renderBlocks 完成回调
    renderCompleteCallbacks: [],
};

export { RenderContext };
