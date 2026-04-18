import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';

// 直接 require 脚本导出的内部函数做单元测试
// 脚本本身在 require 时不会执行 main()（因为 require.main === module 判定）
// eslint-disable-next-line @typescript-eslint/no-var-requires
const syncModule = require(path.resolve(__dirname, '../../../scripts/sync-aikit-shims.js'));

const REPO_ROOT = path.resolve(__dirname, '../../..');
const AIKP_ROOT = path.join(REPO_ROOT, '.aikp');
const SYNC_SCRIPT = path.join(REPO_ROOT, 'scripts/sync-aikit-shims.js');

suite('aikit-shim-bridge Suite', () => {
    // ========================================================================
    // Tier 1 — 存在性断言
    // ========================================================================
    suite('Tier 1: Existence', () => {
        test('BT-aikitShim.1 .aikp 真源存在', () => {
            assert.ok(fs.existsSync(AIKP_ROOT), '.aikp/ 目录应存在');
            assert.ok(fs.existsSync(path.join(AIKP_ROOT, 'agents')), '.aikp/agents/ 应存在');
            assert.ok(fs.existsSync(path.join(AIKP_ROOT, 'commands')), '.aikp/commands/ 应存在');
            assert.ok(fs.existsSync(path.join(AIKP_ROOT, 'rules')), '.aikp/rules/ 应存在');
            assert.ok(fs.existsSync(path.join(AIKP_ROOT, 'skills')), '.aikp/skills/ 应存在');
        });

        test('.aikp/ 关键真源文件存在', () => {
            assert.ok(
                fs.existsSync(path.join(AIKP_ROOT, 'agents/auto-test.md')),
                '.aikp/agents/auto-test.md 应存在'
            );
            assert.ok(
                fs.existsSync(path.join(AIKP_ROOT, 'rules/project-continuity.mdc')),
                '.aikp/rules/project-continuity.mdc 应存在'
            );
            assert.ok(
                fs.existsSync(path.join(AIKP_ROOT, 'skills/openspec-propose/SKILL.md')),
                '.aikp/skills/openspec-propose/SKILL.md 应存在'
            );
            assert.ok(
                fs.existsSync(path.join(AIKP_ROOT, 'commands/opsx/apply.md')),
                '.aikp/commands/opsx/apply.md 应存在'
            );
        });

        test('sync-aikit-shims.js 脚本存在且可 require', () => {
            assert.ok(fs.existsSync(SYNC_SCRIPT), 'scripts/sync-aikit-shims.js 应存在');
            assert.strictEqual(typeof syncModule.listSourceFiles, 'function');
            assert.strictEqual(typeof syncModule.buildStubContent, 'function');
            assert.strictEqual(typeof syncModule.runDefaultMode, 'function');
            assert.strictEqual(typeof syncModule.runCheckMode, 'function');
            assert.strictEqual(typeof syncModule.runCleanMode, 'function');
        });

        test('package.json 含三个 sync-aikit* scripts', () => {
            const pkg = JSON.parse(
                fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
            );
            assert.strictEqual(
                pkg.scripts['sync-aikit'],
                'node scripts/sync-aikit-shims.js',
                'sync-aikit 应指向同步脚本'
            );
            assert.strictEqual(
                pkg.scripts['sync-aikit:check'],
                'node scripts/sync-aikit-shims.js --check',
                'sync-aikit:check 应带 --check 参数'
            );
            assert.strictEqual(
                pkg.scripts['sync-aikit:clean'],
                'node scripts/sync-aikit-shims.js --clean',
                'sync-aikit:clean 应带 --clean 参数'
            );
        });
    });

    // ========================================================================
    // Tier 2 — 行为级断言（直接使用仓库现有 .aikp/ 和三个工具目录）
    // ========================================================================
    suite('Tier 2: Behavior', () => {
        test('BT-aikitShim.2 三工具目录 Stub 数量与 .aikp 源一致', () => {
            const sources = syncModule.listSourceFiles(AIKP_ROOT);
            assert.ok(sources.length > 0, '.aikp/ 下应至少有一个源文件');

            for (const target of syncModule.TARGETS) {
                const targetAbs = path.join(REPO_ROOT, target);
                const existing = syncModule.listExistingShims(targetAbs);
                // 所有 sources 应等于 existing（忽略顺序）
                const srcSorted = [...sources].sort();
                const existSorted = [...existing].sort();
                assert.deepStrictEqual(
                    existSorted,
                    srcSorted,
                    `目标 ${target} 下 Shim 列表应与 .aikp/ 源一致`
                );
            }
        });

        test('BT-aikitShim.3 Stub 正确指向 .aikp 真源路径', () => {
            const sources = syncModule.listSourceFiles(AIKP_ROOT);
            // 抽取 3 个样本
            const samples = [
                sources.find((r: string) => r === 'rules/project-continuity.mdc'),
                sources.find((r: string) => r === 'skills/openspec-propose/SKILL.md'),
                sources.find((r: string) => r === 'commands/opsx/apply.md'),
            ].filter(Boolean) as string[];

            assert.strictEqual(samples.length, 3, '应找到 3 个样本源文件');

            for (const rel of samples) {
                for (const target of syncModule.TARGETS) {
                    const shimAbs = path.join(REPO_ROOT, target, rel);
                    assert.ok(fs.existsSync(shimAbs), `Shim 应存在: ${target}/${rel}`);
                    const content = fs.readFileSync(shimAbs, 'utf8');

                    // 要素 1：SHIM 警告头
                    assert.match(
                        content,
                        /<!-- SHIM: this file is a bridge to the aikit source of truth -->/,
                        `${target}/${rel} 应有 SHIM 警告头`
                    );
                    // 要素 2：DO NOT EDIT 提示 + 相对路径
                    assert.ok(
                        content.includes(`Edit the source at .aikp/${rel}`),
                        `${target}/${rel} 应包含 "Edit the source at .aikp/${rel}" 提示`
                    );
                    // 要素 3：AI 指令段
                    assert.match(
                        content,
                        /For AI tools reading this file/,
                        `${target}/${rel} 应有 AI 指令段`
                    );
                    // 要素 4：Markdown 标题包含目标路径
                    assert.ok(
                        content.includes('🔗 Shim → `.aikp/' + rel + '`'),
                        `${target}/${rel} 应有 Shim 标题指向真源`
                    );
                }
            }
        });

        test('BT-aikitShim.4 同步脚本幂等性（在仓库上下文）', () => {
            // 以现有 .aikp 和三个目标目录为数据源，调用 runDefaultMode 两次
            const sources = syncModule.listSourceFiles(AIKP_ROOT);
            const first = syncModule.runDefaultMode({ aikpAbs: AIKP_ROOT, sources });
            const second = syncModule.runDefaultMode({ aikpAbs: AIKP_ROOT, sources });

            // 第二次调用不应有新建或更新
            assert.strictEqual(second.created, 0, '第二次运行不应新建文件');
            assert.strictEqual(second.updated, 0, '第二次运行不应更新文件');
            assert.ok(second.skipped > 0, '第二次运行应全部跳过');
            // 跳过数应 = 源数 × 目标数
            assert.strictEqual(
                second.skipped,
                sources.length * syncModule.TARGETS.length,
                '第二次应跳过全部 Shim'
            );
        });

        test('Stub 文件大小合理（每个 < 2KB）', () => {
            const target = syncModule.TARGETS[0];
            const shimAbs = path.join(REPO_ROOT, target, 'rules/project-continuity.mdc');
            const stat = fs.statSync(shimAbs);
            assert.ok(stat.size < 2048, `Shim 文件应小于 2KB，实际 ${stat.size} bytes`);
            assert.ok(stat.size > 200, `Shim 文件应大于 200 字节（至少包含模板头）`);
        });
    });

    // ========================================================================
    // Tier 3 — 任务特定断言（在临时目录中跑脚本以完整闭环验证）
    // ========================================================================
    suite('Tier 3: Task-specific (BT-aikitShim)', () => {
        test('BT-aikitShim.5 --check 模式能检测漂移', () => {
            // 使用临时 repo 目录构造 mini aikit，走全流程
            const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aikit-shim-test-'));
            try {
                // 1. 构造 mini .aikp/
                const tmpAikp = path.join(tmpRoot, '.aikp');
                fs.mkdirSync(path.join(tmpAikp, 'skills/foo'), { recursive: true });
                fs.mkdirSync(path.join(tmpAikp, 'rules'), { recursive: true });
                fs.mkdirSync(path.join(tmpAikp, 'agents'), { recursive: true });
                fs.mkdirSync(path.join(tmpAikp, 'commands'), { recursive: true });
                fs.writeFileSync(
                    path.join(tmpAikp, 'skills/foo/SKILL.md'),
                    '# Foo Skill\nreal content',
                    'utf8'
                );
                fs.writeFileSync(
                    path.join(tmpAikp, 'rules/r1.mdc'),
                    '# Rule 1',
                    'utf8'
                );

                // 2. 拷贝同步脚本到临时目录（保持相对路径结构）
                const tmpScriptsDir = path.join(tmpRoot, 'scripts');
                fs.mkdirSync(tmpScriptsDir, { recursive: true });
                fs.copyFileSync(SYNC_SCRIPT, path.join(tmpScriptsDir, 'sync-aikit-shims.js'));

                // 3. 运行同步（默认模式）
                const runResult = cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js')],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );
                assert.strictEqual(runResult.status, 0, `首次同步应成功: ${runResult.stderr}`);

                // 4. check 模式：应通过
                const check1 = cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js'), '--check'],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );
                assert.strictEqual(check1.status, 0, `同步后 check 应通过: ${check1.stderr}`);

                // 5. 篡改一个 Stub 文件 → check 应失败
                const victimShim = path.join(tmpRoot, '.codebuddy/rules/r1.mdc');
                fs.writeFileSync(victimShim, '# 手动篡改内容', 'utf8');
                const check2 = cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js'), '--check'],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );
                assert.strictEqual(check2.status, 1, 'Stub 被篡改后 check 应退出码 1');
                assert.match(
                    check2.stderr + check2.stdout,
                    /content/,
                    'check 输出应说明 content 漂移'
                );

                // 6. 再次运行同步，恢复；check 通过
                cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js')],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );
                const check3 = cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js'), '--check'],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );
                assert.strictEqual(check3.status, 0, '修复后 check 应再次通过');
            } finally {
                fs.rmSync(tmpRoot, { recursive: true, force: true });
            }
        });

        test('BT-aikitShim.6 --clean 模式删除孤儿 Stub', () => {
            const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aikit-shim-test-'));
            try {
                // 1. 构造只有一个 skill 的 mini .aikp/
                const tmpAikp = path.join(tmpRoot, '.aikp');
                fs.mkdirSync(path.join(tmpAikp, 'skills/kept'), { recursive: true });
                fs.writeFileSync(
                    path.join(tmpAikp, 'skills/kept/SKILL.md'),
                    '# Kept',
                    'utf8'
                );

                // 2. 拷贝脚本
                const tmpScriptsDir = path.join(tmpRoot, 'scripts');
                fs.mkdirSync(tmpScriptsDir, { recursive: true });
                fs.copyFileSync(SYNC_SCRIPT, path.join(tmpScriptsDir, 'sync-aikit-shims.js'));

                // 3. 首次同步生成 Stub
                cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js')],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );

                // 4. 手工在 .codebuddy 下创建孤儿 Shim + 一个非 Shim 工具级文件
                const orphanShim = path.join(tmpRoot, '.codebuddy/skills/orphan/SKILL.md');
                fs.mkdirSync(path.dirname(orphanShim), { recursive: true });
                fs.writeFileSync(orphanShim, '# I am orphan', 'utf8');

                const nonShimFile = path.join(tmpRoot, '.codebuddy/settings.local.json');
                fs.writeFileSync(nonShimFile, '{"user": "foo"}', 'utf8');

                // 5. 运行 --clean
                const cleanResult = cp.spawnSync(
                    process.execPath,
                    [path.join(tmpScriptsDir, 'sync-aikit-shims.js'), '--clean'],
                    { cwd: tmpRoot, encoding: 'utf8' }
                );
                assert.strictEqual(cleanResult.status, 0, 'clean 应成功退出');

                // 6. 孤儿 Shim 应被删除；非 Shim 文件应保留
                assert.ok(!fs.existsSync(orphanShim), '孤儿 Shim 应被清理');
                assert.ok(fs.existsSync(nonShimFile), '非 Shim 工具级文件应保留');
                // 正常 Shim 仍在
                assert.ok(
                    fs.existsSync(path.join(tmpRoot, '.codebuddy/skills/kept/SKILL.md')),
                    '正常 Shim 应保留'
                );
            } finally {
                fs.rmSync(tmpRoot, { recursive: true, force: true });
            }
        });

        test('BT-aikitShim.7 computeRelLinkFromShim 生成正确的相对路径', () => {
            // 边界：不同层级深度
            assert.strictEqual(
                syncModule.computeRelLinkFromShim('.codebuddy', 'rules/r1.mdc'),
                '../../.aikp/rules/r1.mdc',
                '2 层深路径'
            );
            assert.strictEqual(
                syncModule.computeRelLinkFromShim('.cursor', 'skills/foo/SKILL.md'),
                '../../../.aikp/skills/foo/SKILL.md',
                '3 层深路径'
            );
            assert.strictEqual(
                syncModule.computeRelLinkFromShim('.claude', 'commands/opsx/apply.md'),
                '../../../.aikp/commands/opsx/apply.md',
                '3 层深命令路径'
            );
        });

        test('BT-aikitShim.8 非 .md/.mdc 文件不被包含为源', () => {
            const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aikit-shim-test-'));
            try {
                const tmpAikp = path.join(tmpRoot, '.aikp');
                fs.mkdirSync(path.join(tmpAikp, 'skills/foo'), { recursive: true });
                fs.writeFileSync(path.join(tmpAikp, 'skills/foo/SKILL.md'), '# foo', 'utf8');
                fs.writeFileSync(path.join(tmpAikp, 'skills/foo/data.json'), '{}', 'utf8');
                fs.writeFileSync(path.join(tmpAikp, 'skills/foo/run.sh'), '#!/bin/sh', 'utf8');
                fs.writeFileSync(path.join(tmpAikp, 'README.md'), '# root readme', 'utf8');

                const sources = syncModule.listSourceFiles(tmpAikp);
                assert.deepStrictEqual(
                    sources,
                    ['skills/foo/SKILL.md'],
                    '应仅包含 skills/foo/SKILL.md，排除 data.json/run.sh/根 README.md'
                );
            } finally {
                fs.rmSync(tmpRoot, { recursive: true, force: true });
            }
        });

        // ====================================================================
        // BT-aikitShim.9/.10/.11 —— CODEBUDDY.md 引用块校验（本次新增能力）
        // ====================================================================

        test('BT-aikitShim.9 CODEBUDDY.md 含 AIKP-RULES:START/END 引用块且与 .aikp/rules/ 实际清单一致', () => {
            const entryPath = path.join(REPO_ROOT, 'CODEBUDDY.md');
            assert.ok(fs.existsSync(entryPath), 'CODEBUDDY.md 应存在');
            const content = fs.readFileSync(entryPath, 'utf8');
            assert.ok(
                content.indexOf('<!-- AIKP-RULES:START') !== -1,
                'CODEBUDDY.md 应含 AIKP-RULES:START 标记'
            );
            assert.ok(
                content.indexOf('<!-- AIKP-RULES:END -->') !== -1,
                'CODEBUDDY.md 应含 AIKP-RULES:END 标记'
            );
            // 真实仓库下不应有 drift
            const sources = syncModule.listSourceFiles(AIKP_ROOT);
            const drifts = syncModule.checkCodebuddyEntry(sources);
            assert.deepStrictEqual(
                drifts,
                [],
                `CODEBUDDY.md 引用块应与 .aikp/rules/ 实际清单一致，发现漂移：${JSON.stringify(drifts)}`
            );
        });

        test('BT-aikitShim.10 extractReferencedRulesFromCodebuddy 正确解析引用路径', () => {
            const sample = [
                '# Doc',
                '<!-- AIKP-RULES:START (marker) -->',
                '- [`.aikp/rules/project-continuity.mdc`](.aikp/rules/project-continuity.mdc) — desc',
                '- see .aikp/rules/another.md for details',
                '<!-- AIKP-RULES:END -->',
                '## 不应被解析的区块外引用',
                '.aikp/rules/outside.mdc should NOT be picked',
            ].join('\n');
            const refs = syncModule.extractReferencedRulesFromCodebuddy(sample);
            assert.ok(
                refs.has('rules/project-continuity.mdc'),
                '应识别 rules/project-continuity.mdc'
            );
            assert.ok(refs.has('rules/another.md'), '应识别 rules/another.md');
            assert.ok(
                !refs.has('rules/outside.mdc'),
                '区块外的 .aikp/ 引用不应被计入'
            );
        });

        test('BT-aikitShim.11 checkCodebuddyEntry 能检测缺失引用与多余引用的漂移', () => {
            // 缺失场景：sources 里有但 CODEBUDDY.md 不引用 —— 通过伪造 sources 触发
            const fakeSources = [
                'rules/project-continuity.mdc',
                'rules/__fake_unreferenced_rule__.mdc',
            ];
            const driftsMissing = syncModule.checkCodebuddyEntry(fakeSources);
            assert.ok(
                driftsMissing.some((d: string) =>
                    d.indexOf('__fake_unreferenced_rule__') !== -1
                ),
                `应报告缺少对新真源的引用，实际 drifts=${JSON.stringify(driftsMissing)}`
            );

            // 多余场景：sources 里没有 rules/project-continuity.mdc
            // —— 但 CODEBUDDY.md 仍在引用它 —— 应报告 orphan
            const driftsOrphan = syncModule.checkCodebuddyEntry([]);
            assert.ok(
                driftsOrphan.some(
                    (d: string) =>
                        d.indexOf('引用了已不存在的真源') !== -1 &&
                        d.indexOf('project-continuity.mdc') !== -1
                ),
                `应报告 CODEBUDDY.md 引用了已不存在的真源，实际 drifts=${JSON.stringify(driftsOrphan)}`
            );
        });
    });
});
