/**
 * position-map.js — 预览 blockIndex → ProseMirror 位置映射
 *
 * 预览侧按空行切分顶层块，PM doc 的顶层节点与之一一对应（纯脚注定义块除外）。
 */

/**
 * 收集一个块内所有叶子文本块（段落/标题/代码块等）及其内容起始位置。
 * 用于把预览侧的「块内文本偏移」映射到 PM doc 坐标。
 */
function collectTextblocks(node, pos, out) {
    if (node.isTextblock) {
        out.push({ node, start: pos + 1 });
        return;
    }
    // 叶子节点（图片/分隔线等）没有文本，直接跳过；
    // 其余容器（列表、引用块、表格等）都继续下钻，不能只看 isBlock，
    // 因为 table_cell 这类节点没有 block 分组
    if (node.isLeaf) return;
    let childPos = pos + 1;
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        collectTextblocks(child, childPos, out);
        childPos += child.nodeSize;
    }
}

/**
 * 构建顶层块位置索引：{ starts: [{node, start}], textblocks: Map<blockIndex, []> }
 * 一次 O(块数) 遍历，供所有批注复用。
 */
function buildBlockPositionIndex(doc) {
    const starts = [];
    let pos = 0;
    for (let i = 0; i < doc.childCount; i++) {
        const child = doc.child(i);
        // 预览侧会把「纯脚注定义块」从块列表中移除，PM 里的 footnote_def
        // 不占 blockIndex，索引时必须跳过。
        if (child.type.name !== 'footnote_def') {
            starts.push({ node: child, start: pos });
        }
        pos += child.nodeSize;
    }
    return { starts, textblocks: new Map() };
}

/**
 * 将 blockIndex + offset 映射为 PM doc 中的绝对位置。
 *
 * 注意：blockIndex 来自预览侧按空行切分的「顶层块」序号，
 * 因此这里只能统计 doc 的顶层子节点，不能把 list_item / table_cell
 * 等嵌套块也计入（否则列表之后的批注会整体错位）。
 *
 * @param {object} [index] 可选的 buildBlockPositionIndex 结果（批量构建 decoration 时复用）
 */
function blockIndexToPos(doc, blockIndex, offset, index) {
    if (blockIndex == null || blockIndex < 0) return null;

    const idx = index || buildBlockPositionIndex(doc);
    const entry = idx.starts[blockIndex];
    if (!entry) return null;

    let textblocks = idx.textblocks.get(blockIndex);
    if (!textblocks) {
        textblocks = [];
        collectTextblocks(entry.node, entry.start, textblocks);
        idx.textblocks.set(blockIndex, textblocks);
    }
    if (textblocks.length === 0) return entry.start + 1;

    // 在块内的文本块之间摊平累加偏移，与预览侧拼接文本节点的顺序一致
    let remaining = Math.max(0, offset || 0);
    for (const tb of textblocks) {
        const size = tb.node.content.size;
        if (remaining <= size) return tb.start + remaining;
        remaining -= size;
    }
    const last = textblocks[textblocks.length - 1];
    return last.start + last.node.content.size;
}

export { collectTextblocks, buildBlockPositionIndex, blockIndexToPos };
