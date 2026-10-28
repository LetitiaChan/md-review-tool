/**
 * renderer.js — Markdown 预览渲染（对外 facade）
 *
 * 实现已按职责拆分到 ./renderer/*：
 *   context.js         共享可变状态
 *   utils.js           通用工具
 *   parser.js          Markdown 分块与跨块定义提取
 *   marked-setup.js    marked 渲染器/扩展/标题 slug/高亮缓存
 *   block-renderer.js  全量渲染、增量批注更新
 *   highlight.js       批注选区匹配
 *   images.js          图片路径重写、URI 缓存、加载兜底
 *   math.js            KaTeX
 *   diagrams.js        Mermaid / PlantUML / Graphviz
 *
 * 对外 API 与拆分前保持一致。
 */

import { RenderContext as ctx } from './renderer/context.js';
import { parseMarkdown } from './renderer/parser.js';
import { renderBlocks, updateAnnotations, onRenderComplete } from './renderer/block-renderer.js';
import { getBlockIndex } from './renderer/highlight.js';
import {
    setImageUriCache,
    collectRelativeImagePaths,
    collectRelativeImagePathsFromMarkdown,
    takeCollectedImagePaths,
    patchImageUris,
} from './renderer/images.js';
import { configureHighlight, postprocessHTML } from './renderer/marked-setup.js';
import {
    renderMermaid,
    reinitMermaid,
    renderPlantUML,
    renderGraphviz,
    reinitGraphviz,
} from './renderer/diagrams.js';
import { preprocessMath, renderMath, restoreMathPlaceholders } from './renderer/math.js';

const Renderer = {
    parseMarkdown,
    renderBlocks,
    updateAnnotations,
    onRenderComplete,
    getBlockIndex,

    setImageUriCache,
    getImageUriCache: () => ctx.imageUriCache,
    collectRelativeImagePaths,
    collectRelativeImagePathsFromMarkdown,
    takeCollectedImagePaths,
    patchImageUris,

    configureHighlight,
    postprocessHTML,
    preprocessMath,

    renderMermaid,
    reinitMermaid,
    renderMath,
    restoreMathPlaceholders,
    renderPlantUML,
    renderGraphviz,
    reinitGraphviz,

    getRawBlocksBeforeExtract: () => ctx.rawBlocksBeforeExtract,
    getOrphanedDefBlocks: () => ctx.orphanedDefBlocks,
    getInlineExtractedDefs: () => ctx.inlineExtractedDefs,
};

export { Renderer };
