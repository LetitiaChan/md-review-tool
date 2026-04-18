# .aikp — AI Kit（Project-level）真源目录

> **⚠️ 这是本项目 AI 工作流资产的唯一真源。**
>
> `.codebuddy/`、`.claude/`、`.cursor/` 下的 `agents/` / `commands/` / `rules/` / `skills/` 均为 shim（桥接），它们的文件内容都会指向本目录下对应的真源文件。编辑时**请务必编辑本目录下的文件**，不要去编辑那三个工具目录里的 shim。

---

## 为什么有这个目录？

本项目使用多个 AI 工具协作开发（CodeBuddy、Claude Code、Cursor），它们都有各自的约定目录（分别是 `.codebuddy/`、`.claude/`、`.cursor/`）来存放 agents / commands / rules / skills。如果把这些内容分别维护 3 份：

- 容易出现内容漂移；
- Git 提交时改动分散，review 困难；
- 新增一个 skill 要在 3 个地方同步。

采用"单一真源 + shim"方案：
- 真实内容只存 `.aikp/` 这一份；
- 三个工具目录下只放"请读 `.aikp/...`"的 shim 占位文件；
- 所有 AI 工具都能通过自己的约定目录找到入口，入口指示 AI 去读真源。

## 目录结构

```
.aikp/
├── README.md                          ← 你正在看的这个文件
├── agents/                            ← 各 AI 工具可调用的 sub-agent 定义
├── commands/                          ← 工作流命令（按命名空间分子目录）
│   └── opsx/                          ← OpenSpec 命令空间
├── rules/                             ← 全局规则 / 纪律文档
└── skills/                            ← Skills（能力包），每个 skill 一个目录
    └── <skill-name>/
        ├── SKILL.md                   ← 必需入口
        ├── references/                ← 可选的参考文档
        └── scripts/                   ← 可选的辅助脚本
```

## Shim 同步机制

同步由 `scripts/sync-aikit-shims.js` 完成，接入了 npm scripts：

| 命令                         | 作用                                                              |
|------------------------------|-------------------------------------------------------------------|
| `npm run sync-aikit`         | 遍历本目录，为每个 `.md` / `.mdc` 文件在三个工具目录下生成 shim   |
| `npm run sync-aikit:check`   | 只检查不写盘；漂移退出码 1（CI 可用）                             |
| `npm run sync-aikit:clean`   | 额外清理三个工具目录下的孤儿 shim（真源已删但 shim 还在）         |

**脚本是幂等的**：重复运行不会改变内容也不会 bump mtime。

## 如何新增 / 修改 aikit

### 新增一个 skill

```powershell
New-Item -ItemType Directory -Path .aikp\skills\my-new-skill
# 编辑 .aikp\skills\my-new-skill\SKILL.md
npm run sync-aikit
git add .aikp\skills\my-new-skill .codebuddy .claude .cursor
```

### 修改现有内容

只改文件内容（不改路径/文件名）时，shim 不需要更新：

```powershell
# 直接编辑 .aikp/skills/openspec-propose/SKILL.md
git add .aikp\skills\openspec-propose\SKILL.md
```

如果改了路径或新增了 reference 文件：

```powershell
npm run sync-aikit
npm run sync-aikit:check      # 可选：确认无漂移
git add -A
```

### 删除一个 skill

```powershell
Remove-Item -Recurse .aikp\skills\obsolete-skill
npm run sync-aikit:clean      # 清理三个工具目录下的孤儿 shim
git add -A
```

## 哪些文件会生成 shim？

- **会**：`.md`、`.mdc` 文件（aikit 资产本体）
- **不会**：
  - 本 `README.md`（真源说明文档，不属于 aikit 资产）
  - 隐藏文件（`.openspec.yaml` 等）
  - 非 `.md` / `.mdc` 扩展名的文件（图片、json、脚本等）

## 哪些工具目录会同步？

目前脚本写死三个目标：

```js
const TARGETS = ['.codebuddy', '.claude', '.cursor'];
```

未来新增 AI 工具（例如 `.windsurf/`、`.continue/`、`.trae/`）时，只需修改上述常量并运行一次 `npm run sync-aikit` 即可。

## 相关文档

- [`../openspec/changes/aikit-shim-bridge/proposal.md`](../openspec/changes/aikit-shim-bridge/proposal.md) — 本机制的提案
- [`../openspec/changes/aikit-shim-bridge/design.md`](../openspec/changes/aikit-shim-bridge/design.md) — 详细设计决策
- [`../openspec/changes/aikit-shim-bridge/specs/aikit-source-layout/spec.md`](../openspec/changes/aikit-shim-bridge/specs/aikit-source-layout/spec.md) — 真源布局规格
- [`../openspec/changes/aikit-shim-bridge/specs/aikit-shim-sync/spec.md`](../openspec/changes/aikit-shim-bridge/specs/aikit-shim-sync/spec.md) — Shim 同步脚本规格
