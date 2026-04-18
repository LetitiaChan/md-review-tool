#!/usr/bin/env node
/**
 * sync-aikit-shims.js
 * ----------------------------------------------------------------------------
 * aikit 真源（.aikp/）到三个 AI 工具目录（.codebuddy/、.claude/、.cursor/）的
 * Shim 同步脚本。
 *
 * 用法：
 *   node scripts/sync-aikit-shims.js            默认模式：生成/更新 Shim
 *   node scripts/sync-aikit-shims.js --check    只读比对，发现漂移退出码 1
 *   node scripts/sync-aikit-shims.js --clean    生成 Shim + 清理孤儿
 *
 * 设计契约见：
 *   openspec/changes/aikit-shim-bridge/specs/aikit-shim-sync/spec.md
 *
 * 无外部依赖：仅使用 Node.js 标准库（fs / path）。
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- 配置 ----------

const REPO_ROOT = path.resolve(__dirname, '..');
const AIKP_ROOT = '.aikp';
const TARGETS = ['.codebuddy', '.claude', '.cursor'];
const SHIM_EXTENSIONS = new Set(['.md', '.mdc']);
// 根级排除文件（相对于 .aikp/ 根，不参与 Shim 生成）
const EXCLUDE_FILES_AT_ROOT = new Set(['README.md']);
// 允许的模式参数
const MODES = new Set(['default', 'check', 'clean']);

// CODEBUDDY.md 引用块校验配置
// CODEBUDDY.md 是 CBC 的规则入口文件。它采用"摘要 + 引用"模式：
// 流程规则的真源在 .aikp/rules/*.mdc，CODEBUDDY.md 中只列出指向真源的链接清单。
// 本脚本在 check/default/clean 三种模式下均校验该清单与 .aikp/rules/ 实际文件一致，
// 避免规则真源新增/删除/改名后，CODEBUDDY.md 的引用块出现漂移。
const CODEBUDDY_ENTRY_FILE = 'CODEBUDDY.md';
const CODEBUDDY_BLOCK_START = '<!-- AIKP-RULES:START';
const CODEBUDDY_BLOCK_END = '<!-- AIKP-RULES:END -->';
// 校验清单的来源目录（相对 .aikp/）——仅 rules/ 下的条目需要在 CODEBUDDY.md 中引用
const CODEBUDDY_REFERENCED_SUBDIR = 'rules';

// ---------- CODEBUDDY.md 引用块校验 ----------

/**
 * 从 .aikp/rules/ 下的 .mdc / .md 文件列表，生成期望的引用清单（排序后）。
 * 返回相对 .aikp/ 的 POSIX 路径数组，例如 ['rules/project-continuity.mdc']。
 */
function listCodebuddyReferencedRules(sources) {
    return sources
        .filter((rel) => rel.startsWith(`${CODEBUDDY_REFERENCED_SUBDIR}/`))
        .sort();
}

/**
 * 解析 CODEBUDDY.md 中 AIKP-RULES:START ... AIKP-RULES:END 区块内引用到的
 * .aikp/ 相对路径集合。容忍行前空白、反引号包裹与可选的 Markdown 链接语法。
 * 返回 Set<string>（relPath 相对 .aikp/）。
 */
function extractReferencedRulesFromCodebuddy(content) {
    const result = new Set();
    const startIdx = content.indexOf(CODEBUDDY_BLOCK_START);
    const endIdx = content.indexOf(CODEBUDDY_BLOCK_END);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return result;
    const block = content.slice(startIdx, endIdx);
    // 匹配 `.aikp/<rel>` 形式的引用（rel 必须以 .mdc 或 .md 结尾）
    const refRegex = /\.aikp\/([A-Za-z0-9_\-./]+\.(?:mdc|md))/g;
    let m;
    while ((m = refRegex.exec(block)) !== null) {
        result.add(m[1]);
    }
    return result;
}

/**
 * 校验 CODEBUDDY.md 的引用块与 .aikp/rules/ 实际清单是否一致。
 * 返回 drifts 数组；空数组表示一致。
 * 如果 CODEBUDDY.md 不存在 → 视为未启用该校验机制，直接返回空数组（静默跳过）。
 */
function checkCodebuddyEntry(sources) {
    const drifts = [];
    const entryAbs = path.join(REPO_ROOT, CODEBUDDY_ENTRY_FILE);
    const content = readIfExists(entryAbs);
    if (content === null) {
        // CODEBUDDY.md 不存在：项目未接入此校验机制，跳过而非报 drift
        return drifts;
    }
    if (content.indexOf(CODEBUDDY_BLOCK_START) === -1 || content.indexOf(CODEBUDDY_BLOCK_END) === -1) {
        drifts.push(
            `codebuddy-entry : ${CODEBUDDY_ENTRY_FILE} 缺少 AIKP-RULES:START/END 引用块（请参考仓库文档恢复）`
        );
        return drifts;
    }

    const expectedList = listCodebuddyReferencedRules(sources);
    const expectedSet = new Set(expectedList);
    const actualSet = extractReferencedRulesFromCodebuddy(content);

    // 缺少的引用
    for (const rel of expectedList) {
        if (!actualSet.has(rel)) {
            drifts.push(`codebuddy-entry : 缺少对 .aikp/${rel} 的引用`);
        }
    }
    // 多余的引用（真源已不存在但 CODEBUDDY.md 仍在引用）
    for (const rel of actualSet) {
        if (!expectedSet.has(rel)) {
            drifts.push(`codebuddy-entry : 引用了已不存在的真源 .aikp/${rel}`);
        }
    }
    return drifts;
}

// ---------- 工具函数 ----------

/**
 * 递归列出 .aikp/ 下所有需要生成 Shim 的源文件（相对 .aikp/ 的 POSIX 路径）。
 */
function listSourceFiles(aikpAbsRoot) {
    const results = [];

    function walk(absDir, relDir) {
        const entries = fs.readdirSync(absDir, { withFileTypes: true });
        for (const entry of entries) {
            // 排除隐藏条目
            if (entry.name.startsWith('.')) continue;

            const absPath = path.join(absDir, entry.name);
            const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                walk(absPath, relPath);
            } else if (entry.isFile()) {
                // 跳过根级排除文件
                if (!relDir && EXCLUDE_FILES_AT_ROOT.has(entry.name)) continue;
                // 仅 .md / .mdc
                const ext = path.extname(entry.name).toLowerCase();
                if (!SHIM_EXTENSIONS.has(ext)) continue;
                // 跳过 .openspec.yaml（ext 不是 .md/.mdc 已排除，这里兜底）
                results.push(relPath);
            }
        }
    }

    walk(aikpAbsRoot, '');
    return results.sort();
}

/**
 * 构造指向真源的 POSIX 相对路径（从目标 Shim 文件到 .aikp/<rel>）。
 * 例如 target="codebuddy"、rel="skills/foo/SKILL.md" → "../../../.aikp/skills/foo/SKILL.md"
 */
function computeRelLinkFromShim(targetDir, rel) {
    // Shim 所在目录是 `<targetDir>/<dirname(rel)>`；从它到仓库根需要回退的层数
    const shimParentRel = path.posix.join(targetDir, path.posix.dirname(rel));
    const depth = shimParentRel === '.' ? 0 : shimParentRel.split('/').length;
    const upSegments = depth === 0 ? '.' : '../'.repeat(depth).replace(/\/$/, '');
    return `${upSegments}/${AIKP_ROOT}/${rel}`;
}

/**
 * 生成 Stub 文件内容。使用纯 LF 换行保证跨平台一致。
 */
function buildStubContent(targetDir, rel) {
    const relLink = computeRelLinkFromShim(targetDir, rel);
    const lines = [
        `<!-- SHIM: this file is a bridge to the aikit source of truth -->`,
        `<!-- DO NOT EDIT THIS FILE. Edit the source at .aikp/${rel} and run: npm run sync-aikit -->`,
        ``,
        `# 🔗 Shim → \`.aikp/${rel}\``,
        ``,
        `This file is a **shim** that forwards to the actual source of truth in the`,
        `project's aikit directory.`,
        ``,
        `**Source of truth**: [\`.aikp/${rel}\`](${relLink})`,
        ``,
        `> **For AI tools reading this file**: Please read the source file above`,
        `> (\`.aikp/${rel}\`) as if its content were this file's content. This shim`,
        `> exists so the same aikit works across CodeBuddy, Claude Code, and Cursor`,
        `> without duplication.`,
        ``,
        `> **For humans**: To modify the content, edit \`.aikp/${rel}\` directly`,
        `> (never edit this shim file). After editing, run \`npm run sync-aikit\` to`,
        `> refresh all shims.`,
        ``,
    ];
    return lines.join('\n');
}

function ensureDirSync(absDir) {
    if (!fs.existsSync(absDir)) {
        fs.mkdirSync(absDir, { recursive: true });
    }
}

function readIfExists(absPath) {
    try {
        return fs.readFileSync(absPath, 'utf8');
    } catch (_) {
        return null;
    }
}

/**
 * 解析命令行参数；返回 'default' | 'check' | 'clean'；非法参数直接 exit(2)。
 */
function parseArgs(argv) {
    const args = argv.slice(2);
    if (args.length === 0) return 'default';
    if (args.length > 1) {
        console.error(`[sync-aikit-shims] Error: only one mode flag allowed, got: ${args.join(' ')}`);
        process.exit(2);
    }
    const flag = args[0];
    if (flag === '--check') return 'check';
    if (flag === '--clean') return 'clean';
    console.error(`[sync-aikit-shims] Error: unknown argument "${flag}". Use --check or --clean.`);
    process.exit(2);
    return 'default'; // unreachable
}

/**
 * 枚举目标目录下所有现存的 Shim 文件（按扩展名过滤，仅限 aikit 结构子目录内）。
 * 返回相对 targetDir 的 POSIX 路径数组。
 * 仅扫描 agents/ commands/ rules/ skills/ 四个子目录，避免触碰 settings.local.json 等工具级文件。
 */
function listExistingShims(targetAbsDir) {
    const results = [];
    const AIKIT_SUBDIRS = ['agents', 'commands', 'rules', 'skills'];
    for (const sub of AIKIT_SUBDIRS) {
        const subAbs = path.join(targetAbsDir, sub);
        if (!fs.existsSync(subAbs)) continue;
        walkAllFiles(subAbs, sub);
    }
    return results.sort();

    function walkAllFiles(absDir, relDir) {
        const entries = fs.readdirSync(absDir, { withFileTypes: true });
        for (const entry of entries) {
            const absPath = path.join(absDir, entry.name);
            const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                walkAllFiles(absPath, relPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (SHIM_EXTENSIONS.has(ext)) results.push(relPath);
            }
        }
    }
}

// ---------- 核心模式 ----------

function runDefaultMode(opts) {
    const { aikpAbs, sources } = opts;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const target of TARGETS) {
        const targetAbs = path.join(REPO_ROOT, target);
        ensureDirSync(targetAbs);
        for (const rel of sources) {
            const shimAbs = path.join(targetAbs, rel);
            const shimDir = path.dirname(shimAbs);
            ensureDirSync(shimDir);
            const expected = buildStubContent(target, rel);
            const existing = readIfExists(shimAbs);
            if (existing === null) {
                fs.writeFileSync(shimAbs, expected, 'utf8');
                created += 1;
            } else if (existing !== expected) {
                fs.writeFileSync(shimAbs, expected, 'utf8');
                updated += 1;
            } else {
                skipped += 1;
            }
        }
    }

    return { created, updated, skipped, cleaned: 0 };
}

function runCheckMode(opts) {
    const { aikpAbs, sources } = opts;
    const drifts = [];

    // 期望的相对路径（用于检测"多余"）
    const expectedSet = new Set(sources);

    for (const target of TARGETS) {
        const targetAbs = path.join(REPO_ROOT, target);
        // 1. 检查缺失 / 内容不符
        for (const rel of sources) {
            const shimAbs = path.join(targetAbs, rel);
            const expected = buildStubContent(target, rel);
            const existing = readIfExists(shimAbs);
            if (existing === null) {
                drifts.push(`missing : ${target}/${rel}`);
            } else if (existing !== expected) {
                drifts.push(`content : ${target}/${rel}`);
            }
        }
        // 2. 检查多余（目标目录下存在但 .aikp 没有对应源）
        if (fs.existsSync(targetAbs)) {
            const existing = listExistingShims(targetAbs);
            for (const rel of existing) {
                if (!expectedSet.has(rel)) {
                    drifts.push(`orphan  : ${target}/${rel}`);
                }
            }
        }
    }

    return { drifts };
}

function runCleanMode(opts) {
    const result = runDefaultMode(opts);
    const { sources } = opts;
    const expectedSet = new Set(sources);
    let cleaned = 0;

    for (const target of TARGETS) {
        const targetAbs = path.join(REPO_ROOT, target);
        if (!fs.existsSync(targetAbs)) continue;
        const existing = listExistingShims(targetAbs);
        for (const rel of existing) {
            if (!expectedSet.has(rel)) {
                fs.unlinkSync(path.join(targetAbs, rel));
                cleaned += 1;
            }
        }
        // 注意：这里不递归清理空目录，避免意外删除用户预期保留的空结构。
    }

    result.cleaned = cleaned;
    return result;
}

// ---------- 入口 ----------

function main() {
    const mode = parseArgs(process.argv);

    const aikpAbs = path.join(REPO_ROOT, AIKP_ROOT);
    if (!fs.existsSync(aikpAbs)) {
        console.error(`[sync-aikit-shims] Error: ${AIKP_ROOT}/ not found at ${aikpAbs}`);
        process.exit(1);
    }

    const sources = listSourceFiles(aikpAbs);

    // CODEBUDDY.md 引用块校验（三种模式都执行，只读）
    const codebuddyDrifts = checkCodebuddyEntry(sources);

    if (mode === 'check') {
        const { drifts } = runCheckMode({ aikpAbs, sources });
        const allDrifts = drifts.concat(codebuddyDrifts);
        if (allDrifts.length === 0) {
            console.log(`[sync-aikit-shims] Shim 同步检查通过（${sources.length} 个源 × ${TARGETS.length} 个目标）+ CODEBUDDY.md 引用一致`);
            process.exit(0);
        } else {
            console.error(`[sync-aikit-shims] 检测到 ${allDrifts.length} 处漂移：`);
            for (const d of allDrifts) console.error(`  - ${d}`);
            console.error(`请运行 "npm run sync-aikit" 修复 shim 漂移；CODEBUDDY.md 引用块需手工同步到 .aikp/rules/ 实际清单。`);
            process.exit(1);
        }
    } else if (mode === 'clean') {
        const { created, updated, skipped, cleaned } = runCleanMode({ aikpAbs, sources });
        console.log(
            `[sync-aikit-shims] 同步完成：${created} 新建 / ${updated} 更新 / ${skipped} 跳过 / ${cleaned} 清理`
        );
        if (codebuddyDrifts.length > 0) {
            console.warn(`[sync-aikit-shims] ⚠ CODEBUDDY.md 引用块存在 ${codebuddyDrifts.length} 处漂移：`);
            for (const d of codebuddyDrifts) console.warn(`  - ${d}`);
            console.warn(`  （自动同步不会改写 CODEBUDDY.md，请手工更新引用块或运行 --check 确认）`);
        }
        process.exit(0);
    } else {
        const { created, updated, skipped } = runDefaultMode({ aikpAbs, sources });
        console.log(
            `[sync-aikit-shims] 同步完成：${created} 新建 / ${updated} 更新 / ${skipped} 跳过（${sources.length} 源 × ${TARGETS.length} 目标）`
        );
        if (codebuddyDrifts.length > 0) {
            console.warn(`[sync-aikit-shims] ⚠ CODEBUDDY.md 引用块存在 ${codebuddyDrifts.length} 处漂移：`);
            for (const d of codebuddyDrifts) console.warn(`  - ${d}`);
            console.warn(`  （自动同步不会改写 CODEBUDDY.md，请手工更新引用块或运行 --check 确认）`);
        }
        process.exit(0);
    }
}

// 允许在测试中 require() 而不触发 main()
if (require.main === module) {
    main();
}

module.exports = {
    REPO_ROOT,
    AIKP_ROOT,
    TARGETS,
    SHIM_EXTENSIONS,
    CODEBUDDY_ENTRY_FILE,
    CODEBUDDY_BLOCK_START,
    CODEBUDDY_BLOCK_END,
    listSourceFiles,
    computeRelLinkFromShim,
    buildStubContent,
    listExistingShims,
    parseArgs,
    runDefaultMode,
    runCheckMode,
    runCleanMode,
    listCodebuddyReferencedRules,
    extractReferencedRulesFromCodebuddy,
    checkCodebuddyEntry,
};
