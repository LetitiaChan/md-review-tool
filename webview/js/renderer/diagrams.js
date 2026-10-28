/**
 * diagrams.js — Mermaid / PlantUML / Graphviz 渲染与主题处理
 */

import { RenderContext as ctx } from './context.js';
import { escapeHtml } from './utils.js';

function preprocessMermaidCode(code) {
    const lines = code.split('\n');
    const trimmedFirst = lines.find(l => l.trim().length > 0);
    if (!trimmedFirst) return code;

    const firstLine = trimmedFirst.trim();

    // 根据图表类型分发到不同的预处理逻辑
    if (firstLine.startsWith('sequenceDiagram')) {
        return preprocessSequenceDiagram(lines);
    }
    if (firstLine.startsWith('classDiagram')) {
        return preprocessClassDiagram(lines);
    }
    if (firstLine.startsWith('stateDiagram')) {
        return preprocessStateDiagram(lines);
    }

    // 其他图表类型暂不需要预处理
    return code;
}

/**
 * 预处理 sequenceDiagram：修复含 ++/--/# 的 participant 名称
 * Mermaid 的 sequenceDiagram 语法中 ++ 和 -- 是激活/停用操作符，
 * 导致 `participant C++` 被误解析。
 */
function preprocessSequenceDiagram(lines) {
    const unsafePattern = /\+\+|--|#/;
    const idMap = new Map();
    let safeCounter = 0;

    // 第一遍：扫描 participant/actor 声明，建立映射
    const participantRegex = /^(\s*)(participant|actor)\s+(.+)$/i;
    for (const line of lines) {
        const match = line.match(participantRegex);
        if (!match) continue;

        const rest = match[3].trim();
        let rawId, displayName;
        const asMatch = rest.match(/^(.+?)\s+as\s+(.+)$/i);
        if (asMatch) {
            rawId = asMatch[1].trim();
            displayName = asMatch[2].trim();
        } else {
            rawId = rest;
            displayName = rest;
        }

        const unquotedId = rawId.replace(/^["']|["']$/g, '');
        const unquotedDisplay = displayName.replace(/^["']|["']$/g, '');

        if (unsafePattern.test(unquotedId) || unsafePattern.test(unquotedDisplay)) {
            const safeId = '_safe_' + (safeCounter++);
            idMap.set(unquotedId, safeId);
        }
    }

    if (idMap.size === 0) return lines.join('\n');

    // 第二遍：替换所有行中的不安全 ID
    const result = lines.map(line => {
        const pMatch = line.match(participantRegex);
        if (pMatch) {
            const indent = pMatch[1];
            const keyword = pMatch[2];
            const rest = pMatch[3].trim();

            let rawId, displayName;
            const asMatch = rest.match(/^(.+?)\s+as\s+(.+)$/i);
            if (asMatch) {
                rawId = asMatch[1].trim().replace(/^["']|["']$/g, '');
                displayName = asMatch[2].trim().replace(/^["']|["']$/g, '');
            } else {
                rawId = rest.replace(/^["']|["']$/g, '');
                displayName = null;
            }

            if (idMap.has(rawId)) {
                const safeId = idMap.get(rawId);
                const display = displayName || rawId;
                return `${indent}${keyword} ${safeId} as "${display}"`;
            }
            return line;
        }

        let newLine = line;
        for (const [originalId, safeId] of idMap) {
            if (newLine.includes(originalId)) {
                const escaped = originalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newLine = newLine.replace(new RegExp(escaped, 'g'), safeId);
            }
        }
        return newLine;
    });

    return result.join('\n');
}

/**
 * 预处理 classDiagram：修复含特殊字符的类名
 * Mermaid classDiagram 中 +/-/#/~ 是可见性修饰符，
 * 类名含 C++ 等特殊字符时可能导致解析器混淆。
 * 
 * 策略：将含特殊字符的类名替换为安全 ID，并添加 label 注解。
 * 例如：class C++ → class _safe_0["C++"]
 */
function preprocessClassDiagram(lines) {
    // 特殊字符模式：类名中不应出现的字符
    const unsafePattern = /[+#~<>{}|\[\]]/;
    const classNameMap = new Map(); // originalName → safeId
    let safeCounter = 0;

    // 第一遍：扫描类声明，找出含特殊字符的类名
    for (const line of lines) {
        const trimmed = line.trim();
        // 匹配 "class ClassName" 或 "class ClassName {" 格式
        const classMatch = trimmed.match(/^class\s+([^\s{:"]+)/i);
        if (classMatch) {
            const className = classMatch[1].replace(/^`|`$/g, '');
            if (unsafePattern.test(className) && !classNameMap.has(className)) {
                classNameMap.set(className, '_cls_' + (safeCounter++));
            }
        }
        // 匹配关系行中的类名：ClassName1 <|-- ClassName2 等
        // 关系操作符：<|--, *--, o--, ..|>, -->, --*, --o, ..>
        const relationMatch = trimmed.match(/^([^\s:"]+)\s+(?:<\||\*|o|\.|--|\.\.)[|<>*o-]+\s+([^\s:"]+)/);
        if (relationMatch) {
            for (const name of [relationMatch[1], relationMatch[2]]) {
                const cleanName = name.replace(/^`|`$/g, '');
                if (unsafePattern.test(cleanName) && !classNameMap.has(cleanName)) {
                    classNameMap.set(cleanName, '_cls_' + (safeCounter++));
                }
            }
        }
    }

    if (classNameMap.size === 0) return lines.join('\n');

    // 第二遍：替换类名并添加注解
    const result = [];
    let addedLabels = false;
    for (const line of lines) {
        let newLine = line;
        for (const [originalName, safeId] of classNameMap) {
            if (newLine.includes(originalName)) {
                const escaped = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newLine = newLine.replace(new RegExp(escaped, 'g'), safeId);
            }
        }
        result.push(newLine);

        // 在 classDiagram 声明行后面插入类名标签注解
        if (!addedLabels && line.trim().startsWith('classDiagram')) {
            for (const [originalName, safeId] of classNameMap) {
                result.push(`    ${safeId} : "${originalName}"`);
            }
            addedLabels = true;
        }
    }

    return result.join('\n');
}

/**
 * 预处理 stateDiagram：修复含特殊字符的状态名
 * Mermaid stateDiagram 中 --> 是转换箭头，
 * 状态名含 ++ 或 -- 可能与箭头语法冲突。
 * 
 * 策略：将含特殊字符的状态名替换为安全 ID，
 * 并用 state "display" as safeId 语法声明。
 */
function preprocessStateDiagram(lines) {
    const unsafePattern = /\+\+|--|#|[<>{}|\[\]]/;
    const stateNameMap = new Map();
    let safeCounter = 0;

    // 第一遍：扫描所有行，找出含特殊字符的状态名
    for (const line of lines) {
        const trimmed = line.trim();
        // 跳过图表类型声明行和注释行
        if (trimmed.startsWith('stateDiagram') || trimmed.startsWith('%%')) continue;

        // 匹配 state "描述" as id 格式（已经安全，跳过）
        if (/^state\s+"/.test(trimmed)) continue;

        // 匹配 state 声明：state StateName
        const stateMatch = trimmed.match(/^state\s+([^\s{"]+)/i);
        if (stateMatch) {
            const stateName = stateMatch[1];
            if (unsafePattern.test(stateName) && !stateNameMap.has(stateName)) {
                stateNameMap.set(stateName, '_st_' + (safeCounter++));
            }
        }

        // 匹配转换行：StateA --> StateB 或 StateA --> StateB : 描述
        const transMatch = trimmed.match(/^([^\s:]+)\s*-->\s*([^\s:]+)/);
        if (transMatch) {
            for (const name of [transMatch[1], transMatch[2]]) {
                if (name === '[*]') continue; // 起止状态
                if (unsafePattern.test(name) && !stateNameMap.has(name)) {
                    stateNameMap.set(name, '_st_' + (safeCounter++));
                }
            }
        }
    }

    if (stateNameMap.size === 0) return lines.join('\n');

    // 第二遍：替换状态名并添加 state 声明
    const result = [];
    let addedDeclarations = false;
    for (const line of lines) {
        let newLine = line;
        for (const [originalName, safeId] of stateNameMap) {
            if (newLine.includes(originalName)) {
                const escaped = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                newLine = newLine.replace(new RegExp(escaped, 'g'), safeId);
            }
        }
        result.push(newLine);

        // 在 stateDiagram 声明行后面插入 state 声明
        if (!addedDeclarations && line.trim().startsWith('stateDiagram')) {
            for (const [originalName, safeId] of stateNameMap) {
                result.push(`    state "${originalName}" as ${safeId}`);
            }
            addedDeclarations = true;
        }
    }

    return result.join('\n');
}

/**
 * 解析任意 CSS 颜色字符串为 {r,g,b,a}
 * 支持 #rgb / #rrggbb / #rrggbbaa / rgb() / rgba() / 命名色
 * 解析失败返回 null
 */
function parseCssColor(str) {
    if (!str || typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    if (s === 'none' || s === 'transparent') return null;

    // #rgb / #rgba / #rrggbb / #rrggbbaa
    if (s[0] === '#') {
        let hex = s.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            hex = hex.split('').map(c => c + c).join('');
        }
        if (hex.length === 6 || hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
            if ([r, g, b].every(n => !isNaN(n))) return { r, g, b, a };
        }
        return null;
    }

    // rgb(...) / rgba(...)
    const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
    if (m) {
        const r = Math.round(parseFloat(m[1]));
        const g = Math.round(parseFloat(m[2]));
        const b = Math.round(parseFloat(m[3]));
        let a = 1;
        if (m[4] != null) {
            a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        }
        return { r, g, b, a };
    }

    // 借用浏览器解析命名色（e.g. "orange"）
    try {
        const probe = document.createElement('span');
        probe.style.color = 'rgba(0,0,0,0)';
        probe.style.color = s;
        if (!probe.style.color) return null;
        document.body.appendChild(probe);
        const rgb = getComputedStyle(probe).color;
        document.body.removeChild(probe);
        const mm = rgb.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/);
        if (mm) {
            return {
                r: Math.round(parseFloat(mm[1])),
                g: Math.round(parseFloat(mm[2])),
                b: Math.round(parseFloat(mm[3])),
                a: mm[4] != null ? parseFloat(mm[4]) : 1,
            };
        }
    } catch (e) { /* noop */ }

    return null;
}

/**
 * 计算颜色的 WCAG 相对亮度 [0,1]
 * 参见 https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(rgb) {
    const toLin = (c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

/**
 * Mermaid 渲染后对节点文字做对比度修正：
 * - 暗色主题：若节点填充色是浅色（亮度 > 0.5），把文字改深色 #1a202c
 * - 亮色主题：若节点填充色是深色（亮度 <= 0.5），把文字改浅色 #f7fafc
 * 处理对象：.node / .cluster 中的形状元素（rect/circle/polygon/path/ellipse）及其标签文字
 */
function fixMermaidNodeTextContrast(container, isDark) {
    const svg = container.querySelector('svg');
    if (!svg) return;

    const LUMA_THRESHOLD = 0.5;
    const DARK_TEXT = '#1a202c';
    const LIGHT_TEXT = '#f7fafc';

    // 同时处理普通节点和 subgraph 集群
    const targets = svg.querySelectorAll('g.node, g.cluster, .node, .cluster');

    targets.forEach(nodeG => {
        // 取节点的形状元素，优先读其 fill
        const shapes = nodeG.querySelectorAll(':scope > rect, :scope > circle, :scope > ellipse, :scope > polygon, :scope > path');
        let fill = null;
        for (const sh of shapes) {
            const f = sh.getAttribute('fill') || sh.style.fill || getComputedStyle(sh).fill;
            const parsed = parseCssColor(f);
            if (parsed && parsed.a > 0) { fill = parsed; break; }
        }
        if (!fill) return;

        const luma = relativeLuminance(fill);
        let newColor = null;
        if (isDark && luma > LUMA_THRESHOLD) {
            // 暗色主题下遇到浅色填充 → 文字改深色
            newColor = DARK_TEXT;
        } else if (!isDark && luma <= LUMA_THRESHOLD) {
            // 亮色主题下遇到深色填充 → 文字改浅色
            newColor = LIGHT_TEXT;
        }
        if (!newColor) return;

        // 应用到所有文字：SVG <text>/<tspan> 以及 foreignObject 内部的 HTML 标签
        nodeG.querySelectorAll('text, tspan').forEach(t => {
            t.setAttribute('fill', newColor);
            t.style.fill = newColor;
        });
        nodeG.querySelectorAll('foreignObject *').forEach(el => {
            // 仅设置 color，不动背景；用 important 压过 mermaid inline style
            el.style.setProperty('color', newColor, 'important');
        });
        // 部分 mermaid 版本把 label 放在 nodeG 直接子元素 span/div 上
        const directLabel = nodeG.querySelector(':scope > .nodeLabel, :scope > .label');
        if (directLabel) {
            directLabel.style.setProperty('color', newColor, 'important');
        }
    });
}

/**
 * 渲染所有 Mermaid 图表占位容器
 * 在 renderBlocks 之后调用；传入 root 时只渲染该子树（增量渲染）
 */
async function renderMermaid(root) {
    if (typeof mermaid === 'undefined') {
        const loader = globalThis.AssetLoader;
        if (loader) {
            const ok = await loader.ensure('mermaid');
            if (ok && typeof mermaid !== 'undefined') return renderMermaid(root);
        }
        return;
    }

    const scope = root || document;
    const containers = scope.querySelectorAll('.mermaid-container');
    if (containers.length === 0) return;

    // 清理 mermaid 在 DOM 中残留的临时渲染容器（仅全量渲染时）
    // mermaid v10 的 render() 会在 body 中创建临时 <div id="d${id}"> 和 <svg id="${id}">，
    // 如果未被正确清理，再次渲染时可能导致 D3 选择器选中旧元素，产生错误的渲染结果
    // 注意：必须清理所有 mermaid 相关的临时元素，不仅是 "dmermaid-" 前缀的
    if (!root) {
        document.querySelectorAll('div[id^="dmermaid-"]').forEach(el => el.remove());
        document.querySelectorAll('svg[id^="mermaid-"]').forEach(el => {
            // 只清理不在 .mermaid-container 内的（即 mermaid 渲染时创建的临时 SVG）
            if (!el.closest('.mermaid-container')) el.remove();
        });
        // 清理 mermaid 可能残留的 iframe 沙箱容器
        document.querySelectorAll('iframe[id^="imermaid-"]').forEach(el => el.remove());
    }

    // 主题未变化时无需重复 initialize
    const isDark = document.body.classList.contains('theme-dark');
    const themeKey = isDark ? 'dark' : 'default';
    if (!ctx.mermaidInitialized || ctx.mermaidTheme !== themeKey) {
        mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        // 使用 'loose' 而非 'strict'：
        // 'strict' 会强制将 htmlLabels 设为 false，导致节点文本中的特殊字符
        // （如 C++ 中的 +、C# 中的 #）被 Mermaid 解析器误解为语法符号，渲染失败。
        // VS Code webview 本身已是沙箱环境，安全性由宿主保证，'loose' 不会引入额外风险。
        securityLevel: 'loose',
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis',
        },
        sequence: {
            useMaxWidth: false,
            diagramMarginX: 8,
            diagramMarginY: 8,
        },
        gantt: {
            useMaxWidth: false,
        },
        themeVariables: isDark ? {
            darkMode: true,
            background: '#1e1e2e',
            primaryColor: '#4fc3f7',
            primaryTextColor: '#e0e0e0',
            primaryBorderColor: '#4a5568',
            lineColor: '#718096',
            secondaryColor: '#2d3748',
            tertiaryColor: '#374151',
            textColor: '#e2e8f0',
            mainBkg: '#2d3748',
            nodeBorder: '#4a5568',
            clusterBkg: 'rgba(30, 41, 59, 0.5)',
            clusterBorder: '#475569',
            titleColor: '#e2e8f0',
            edgeLabelBackground: '#1e293b',
            nodeTextColor: '#e2e8f0',
        } : {},
    });
        ctx.mermaidInitialized = true;
        ctx.mermaidTheme = themeKey;
    }

    for (const container of containers) {
        // 优先使用 base64 编码的源码（避免 HTML 转义问题）
        const sourceDataEl = container.querySelector('.mermaid-source-data');
        const sourceEl = container.querySelector('.mermaid-source');
        let code = '';
        if (sourceDataEl && sourceDataEl.dataset.source) {
            try {
                code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
            } catch (e) {
                code = sourceEl ? sourceEl.textContent : '';
            }
        } else if (sourceEl) {
            code = sourceEl.textContent;
        }
        if (!code) continue;

        // 使用唯一 ID（加入时间戳），避免 mermaid 内部 D3 缓存导致的渲染错误
        // mermaid v10 在同一页面中多次渲染时，如果复用了之前的 ID，
        // 内部的 D3.js 选择器可能选中旧的 DOM 元素，导致 SVG 内容不正确
        const id = 'mermaid-' + Date.now() + '-' + (++ctx.mermaidCounter);

        // 注意：不在循环内做全局 querySelectorAll 清理（O(n²) 性能问题）
        // 每次渲染后通过精确的 getElementById 清理当前临时元素（O(1)），
        // 所有图表渲染完成后再统一做一次全局兜底清理

        // 预处理：修复各图表类型中含特殊字符的标识符
        // - sequenceDiagram: ++ 和 -- 是激活/停用操作符
        // - classDiagram: +/-/#/~ 是可见性修饰符
        // - stateDiagram: --> 箭头语法可能与状态名冲突
        code = preprocessMermaidCode(code);

        try {
            // 传递 container 作为第三个参数，确保 Mermaid 将临时 SVG 插入到可见的 DOM 中
            // gitGraph 等图表类型在渲染时需要通过 getBBox() 计算文本尺寸，
            // 如果临时 SVG 不在可见的渲染树中会抛出 "svg element not in render tree" 错误
            const { svg } = await mermaid.render(id, code, container);
            // 渲染完成后立即清理 mermaid 创建的临时 DOM 元素
            // 防止残留元素影响后续图表的渲染（特别是类图的 D3 选择器缓存问题）
            const tempDiv = document.getElementById('d' + id);
            if (tempDiv) tempDiv.remove();
            const tempSvg = document.getElementById(id);
            if (tempSvg && !tempSvg.closest('.mermaid-container')) tempSvg.remove();
            const tempIframe = document.getElementById('i' + id);
            if (tempIframe) tempIframe.remove();
            // 渲染后用最新的源码更新 data-source（确保编辑后的内容被正确保存）
            const latestBase64 = btoa(unescape(encodeURIComponent(code)));
            container.innerHTML = `<div class="mermaid-rendered" data-source="${latestBase64}">${svg}</div>`;

            // 对自定义填充节点做文字亮度反色修正（自定义 style fill 常导致文字与背景对比度不足）
            try { fixMermaidNodeTextContrast(container, isDark); } catch (e) { /* noop */ }

            // 使 SVG 自适应容器宽度
            const svgEl = container.querySelector('svg');
            if (svgEl) {
                const rawW = parseFloat(svgEl.getAttribute('width')) || svgEl.getBoundingClientRect().width;
                const rawH = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
                // 确保 viewBox 存在（用于缩放计算和弹窗预览）
                if (!svgEl.getAttribute('viewBox') && rawW && rawH) {
                    svgEl.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
                }
                // 移除固定的内联 style 和宽高属性，改为 CSS 自适应
                svgEl.removeAttribute('style');
                svgEl.removeAttribute('width');
                svgEl.removeAttribute('height');
                svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

                // 根据宽高比智能设置显示尺寸
                const containerW = container.clientWidth - 32 || 800;
                const aspect = rawW / rawH;

                if (aspect > 2.5) {
                    // 非常宽的横向图表（如甘特图）：宽度撑满，高度按比例计算
                    const calcH = Math.max(containerW / aspect, 300);
                    svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
                } else if (aspect > 1.5) {
                    // 中等宽度横向图表：宽度撑满，设合理最小高度
                    const calcH = Math.max(containerW / aspect, 250);
                    svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
                } else {
                    // 方正或纵向图表（流程图等）：宽度撑满，高度自动
                    svgEl.style.cssText = `width:100%;height:auto;max-width:100%;`;
                    if (rawH > 100) {
                        svgEl.style.minHeight = Math.min(rawH, 600) + 'px';
                    }
                }
            }
        } catch (e) {
            console.warn('[Renderer] Mermaid 渲染失败（将在布局完成后重试）:', e);
            // 标记为待重试，保留源码数据以便重试时使用
            container.dataset.mermaidRetry = code;
        }
    }

    // 收集首次渲染失败的图表，延迟重试一次
    // ER 图和 Git 图在渲染时需要 getBBox() 计算文本尺寸，
    // 首次加载时浏览器可能还未完成布局（display 刚从 none 变为 flex），
    // 导致 getBBox() 返回零值或抛出异常。等待一帧后布局完成即可正常渲染。
    const retryContainers = document.querySelectorAll('.mermaid-container[data-mermaid-retry]');
    if (retryContainers.length > 0) {
        requestAnimationFrame(() => {
            setTimeout(async () => {
                for (const container of retryContainers) {
                    const code = container.dataset.mermaidRetry;
                    delete container.dataset.mermaidRetry;
                    if (!code || !container.isConnected) continue;

                    const retryId = 'mermaid-' + Date.now() + '-' + (++ctx.mermaidCounter);
                    try {
                        const { svg } = await mermaid.render(retryId, code, container);
                        // 清理临时元素
                        const tempDiv = document.getElementById('d' + retryId);
                        if (tempDiv) tempDiv.remove();
                        const tempSvg = document.getElementById(retryId);
                        if (tempSvg && !tempSvg.closest('.mermaid-container')) tempSvg.remove();
                        const tempIframe = document.getElementById('i' + retryId);
                        if (tempIframe) tempIframe.remove();

                        const latestBase64 = btoa(unescape(encodeURIComponent(code)));
                        container.innerHTML = `<div class="mermaid-rendered" data-source="${latestBase64}">${svg}</div>`;

                        // 文字对比度修正
                        try { fixMermaidNodeTextContrast(container, isDark); } catch (ex) { /* noop */ }

                        // SVG 自适应
                        const svgEl = container.querySelector('svg');
                        if (svgEl) {
                            const rawW = parseFloat(svgEl.getAttribute('width')) || svgEl.getBoundingClientRect().width;
                            const rawH = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
                            if (!svgEl.getAttribute('viewBox') && rawW && rawH) {
                                svgEl.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
                            }
                            svgEl.removeAttribute('style');
                            svgEl.removeAttribute('width');
                            svgEl.removeAttribute('height');
                            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                            const containerW = container.clientWidth - 32 || 800;
                            const aspect = rawW / rawH;
                            if (aspect > 2.5) {
                                const calcH = Math.max(containerW / aspect, 300);
                                svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
                            } else if (aspect > 1.5) {
                                const calcH = Math.max(containerW / aspect, 250);
                                svgEl.style.cssText = `width:100%;height:${calcH}px;max-width:100%;`;
                            } else {
                                svgEl.style.cssText = `width:100%;height:auto;max-width:100%;`;
                                if (rawH > 100) {
                                    svgEl.style.minHeight = Math.min(rawH, 600) + 'px';
                                }
                            }
                        }
                        console.info('[Renderer] Mermaid 重试渲染成功:', retryId);
                    } catch (retryErr) {
                        console.warn('[Renderer] Mermaid 重试渲染仍失败:', retryErr);
                        container.innerHTML = `<div class="mermaid-error"><span class="mermaid-error-icon">⚠️</span> Mermaid 图表渲染失败<pre>${escapeHtml(code)}</pre></div>`;
                    }
                }
                // 重试完成后清理临时元素
                document.querySelectorAll('div[id^="dmermaid-"]').forEach(el => el.remove());
                document.querySelectorAll('svg[id^="mermaid-"]').forEach(el => {
                    if (!el.closest('.mermaid-container')) el.remove();
                });
                document.querySelectorAll('iframe[id^="imermaid-"]').forEach(el => el.remove());
            }, 50);
        });
    }

    // 所有图表渲染完成后，统一清理可能遗漏的临时 DOM 元素（安全网）
    // 这替代了之前在循环内每次渲染前的全局 querySelectorAll 清理，
    // 将 O(n²) 降为 O(n)，对包含 10+ 图表的文档性能提升显著
    document.querySelectorAll('div[id^="dmermaid-"]').forEach(el => el.remove());
    document.querySelectorAll('svg[id^="mermaid-"]').forEach(el => {
        if (!el.closest('.mermaid-container')) el.remove();
    });
    document.querySelectorAll('iframe[id^="imermaid-"]').forEach(el => el.remove());
}

/**
 * 重新初始化 Mermaid（主题切换时调用）
 * 将已渲染的图表恢复为源码状态，强制重新渲染
 */
function reinitMermaid() {
    ctx.mermaidInitialized = false;
    // 将已渲染的图表恢复为源码占位容器，以便重新渲染
    document.querySelectorAll('.mermaid-container').forEach(container => {
        container.removeAttribute('data-mermaid-id');
        const rendered = container.querySelector('.mermaid-rendered');
        if (rendered && rendered.dataset.source) {
            // 从 data-source 恢复 base64 编码的源码
            let code = '';
            try {
                code = decodeURIComponent(escape(atob(rendered.dataset.source)));
            } catch (e) {
                code = '';
            }
            if (code) {
                container.innerHTML = `<div class="mermaid-source-data" data-source="${rendered.dataset.source}" style="display:none"></div><pre class="mermaid-source">${escapeHtml(code)}</pre>`;
            }
        }
    });
    // 重置计数器
    ctx.mermaidCounter = 0;
}

/**
 * PlantUML hex 编码：将源码转为 UTF-8 字节的十六进制表示
 * PlantUML 服务器 ~h 模式要求 UTF-8 字节 hex，而非 Unicode 码点 hex
 */
function plantumlHexEncode(text) {
    // 先将文本编码为 UTF-8 字节序列
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * 渲染 PlantUML 图表（通过在线服务器，延迟渲染）
 * 从 data-source 中解码源码，动态构建 <img> 标签
 * 只在 enablePlantUML 开关打开时由 app.js 调用
 */
function renderPlantUML(root) {
    const containers = (root || document).querySelectorAll('.plantuml-container');
    if (containers.length === 0) return;

    containers.forEach(container => {
        // 已渲染则跳过（只绑定 lightbox）
        if (container.querySelector('.plantuml-rendered')) {
            const img = container.querySelector('.plantuml-rendered');
            if (img && !img.dataset.lightboxBound) {
                img.dataset.lightboxBound = 'true';
                img.title = '点击查看大图';
                img.style.cursor = 'pointer';
            }
            return;
        }

        const sourceDataEl = container.querySelector('.plantuml-source-data');
        if (!sourceDataEl || !sourceDataEl.dataset.source) return;

        let code = '';
        try {
            code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
        } catch (e) {
            const sourceEl = container.querySelector('.plantuml-source');
            code = sourceEl ? sourceEl.textContent : '';
        }
        if (!code) return;

        const maxLen = 4000;
        if (code.length > maxLen) {
            container.innerHTML = `<div class="plantuml-error"><span class="plantuml-error-icon">⚠️</span> 图表源码过长（${code.length} 字符），无法在线渲染</div><pre class="plantuml-source">${escapeHtml(code)}</pre>`;
            container.classList.add('plantuml-too-long');
            return;
        }

        const hexCode = plantumlHexEncode(code);
        const svgUrl = 'https://www.plantuml.com/plantuml/svg/~h' + hexCode;

        // 动态构建 <img>，保留 source-data 用于主题切换时重渲染
        // 失败兜底由下方 JS 绑定（CSP 禁止内联 onerror）
        container.innerHTML = `<img class="plantuml-rendered" src="${svgUrl}" alt="PlantUML Diagram" /><div class="plantuml-fallback" style="display:none"><div class="plantuml-error"><span class="plantuml-error-icon">⚠️</span> PlantUML 图表渲染失败（请检查网络连接）</div><pre class="plantuml-source">${escapeHtml(code)}</pre></div><pre class="plantuml-source-data" data-source="${sourceDataEl.dataset.source}" style="display:none"></pre>`;

        const img = container.querySelector('.plantuml-rendered');
        if (img) {
            img.dataset.lightboxBound = 'true';
            img.title = '点击查看大图';
            img.style.cursor = 'pointer';
            const showFallback = () => {
                img.style.display = 'none';
                const fallback = container.querySelector('.plantuml-fallback');
                if (fallback) fallback.style.display = 'block';
            };
            img.addEventListener('error', showFallback);
            // error 事件可能在绑定前就已触发
            if (img.complete && img.naturalWidth === 0) showFallback();
        }
    });
}

/**
 * 渲染 Graphviz DOT 图表（使用 Viz.js）
 */
async function renderGraphviz(root) {
    if (typeof Viz === 'undefined') {
        // 按需加载 Viz.js 后重入
        const loader = globalThis.AssetLoader;
        if (loader) {
            const ok = await loader.ensure('viz');
            if (ok && typeof Viz !== 'undefined') return renderGraphviz(root);
        }
        if ((root || document).querySelectorAll('.graphviz-container').length > 0) {
            console.warn('[Renderer] Viz.js 未加载');
        }
        return;
    }

    const containers = (root || document).querySelectorAll('.graphviz-container');
    if (containers.length === 0) return;

    let vizInstance;
    try {
        vizInstance = await Viz.instance();
    } catch (e) {
        console.warn('[Renderer] Viz.js 初始化失败:', e);
        return;
    }

    for (const container of containers) {
        if (container.querySelector('.graphviz-rendered')) continue;

        const sourceDataEl = container.querySelector('.graphviz-source-data');
        const sourceEl = container.querySelector('.graphviz-source');
        let code = '';
        if (sourceDataEl && sourceDataEl.dataset.source) {
            try {
                code = decodeURIComponent(escape(atob(sourceDataEl.dataset.source)));
            } catch (e) {
                code = sourceEl ? sourceEl.textContent : '';
            }
        } else if (sourceEl) {
            code = sourceEl.textContent;
        }
        if (!code) continue;

        try {
            const svg = vizInstance.renderSVGElement(code);
            const wrapper = document.createElement('div');
            wrapper.className = 'graphviz-rendered';
            wrapper.dataset.source = sourceDataEl ? sourceDataEl.dataset.source : '';
            wrapper.appendChild(svg);
            container.innerHTML = '';
            container.appendChild(wrapper);

            // 确保 viewBox 存在（Lightbox 大图弹窗需要用 viewBox 来计算原始尺寸）
            const rawW = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
            const rawH = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
            if (!svg.getAttribute('viewBox') && rawW && rawH) {
                svg.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
            }

            // SVG 自适应
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.style.cssText = 'width:100%;height:auto;max-width:100%;';
        } catch (e) {
            console.warn('[Renderer] Graphviz 渲染失败:', e);
            container.innerHTML = `<div class="graphviz-error"><span class="graphviz-error-icon">⚠️</span> Graphviz 图表渲染失败: ${escapeHtml(e.message || '')}<pre>${escapeHtml(code)}</pre></div>`;
        }
    }
}

/**
 * 重新初始化 Graphviz（主题切换时调用）
 */
function reinitGraphviz() {
    document.querySelectorAll('.graphviz-container').forEach(container => {
        const rendered = container.querySelector('.graphviz-rendered');
        if (rendered && rendered.dataset.source) {
            let code = '';
            try {
                code = decodeURIComponent(escape(atob(rendered.dataset.source)));
            } catch (e) { code = ''; }
            if (code) {
                container.innerHTML = `<div class="graphviz-source-data" data-source="${rendered.dataset.source}" style="display:none"></div><pre class="graphviz-source">${escapeHtml(code)}</pre>`;
            }
        }
    });
}

export {
    preprocessMermaidCode, preprocessSequenceDiagram, preprocessClassDiagram, preprocessStateDiagram,
    parseCssColor, relativeLuminance, fixMermaidNodeTextContrast,
    renderMermaid, reinitMermaid, plantumlHexEncode, renderPlantUML, renderGraphviz, reinitGraphviz,
};
