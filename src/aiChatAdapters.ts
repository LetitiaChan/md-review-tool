/**
 * AI Chat 派发适配层
 *
 * 本模块负责将"一键 AI 修复"产生的指令文本派发到当前 IDE 的 AI Chat 对话框。
 * 支持的 IDE 类型（IdeKind）：
 *   - 'codebuddy' : CodeBuddy IDE（tencentcloud.codingcopilot.* 命令族）
 *   - 'cursor'    : Cursor（composer.newAgentChat / aichat.newchataction）
 *   - 'windsurf'  : Windsurf（windsurf.prioritizeCascadeView / triggerCascadeInput / cascade.newChat）
 *   - 'vscode'    : 默认分支（含工蜂 Copilot 探测），最终降级为"剪贴板 + 提示用户"
 *
 * 所有派发都保证"剪贴板已预先写入"——调用方必须在调用 dispatchAiChat 之前
 * 写入剪贴板，作为所有策略失败时的最终兜底。
 *
 * 诊断日志统一以 "[DIAG:aiChat]" 开头，便于在真机反馈时快速定位失败策略。
 */
import * as vscode from 'vscode';
import { exec } from 'child_process';

export type IdeKind = 'codebuddy' | 'cursor' | 'windsurf' | 'vscode';

export interface DispatchContext {
    /** 已写入剪贴板的 AI 指令原文 */
    instruction: string;
    /** 诊断日志回调（调用方通常指向 OutputChannel.appendLine） */
    log: (line: string) => void;
    /** 当前 IDE 暴露的命令集合（由 vscode.commands.getCommands 获取） */
    availableCommands: Set<string>;
}

export interface DispatchResult {
    /** 是否有任一策略成功执行（未抛异常） */
    succeeded: boolean;
    /** 成功的策略名 / 失败时最后尝试的策略 / 'none' 表示无任何策略可尝试 */
    strategy: string;
    /** 是否降级为"用户手动粘贴"路径 */
    fellBackToClipboard: boolean;
    /**
     * 是否已通过 OS 键盘模拟自动按下 Enter 完成"发送"动作。
     * 当前仅在 Windows 平台下 Cursor 策略成功且 SendKeys 未抛错时为 true；
     * 其它平台 / 其它 IDE 均为 false（用户仍需手动按 Enter）。
     */
    autoSubmitted: boolean;
}

/**
 * 单条策略定义。
 * requires: 策略执行所需的命令 ID。若不在 availableCommands 中则跳过该策略。
 *           某些策略（CodeBuddy 策略 1）内部会先后调用多条命令，requires 指代首条关键命令。
 * run:      返回 void 或 boolean。返回 true 表示该策略不仅打开并填入了指令，还额外完成了
 *           "自动发送"（即不需要用户再按 Enter），由 dispatchAiChat 映射为结果中的 autoSubmitted。
 */
interface Strategy {
    name: string;
    requires?: string;
    run: (ctx: DispatchContext) => Promise<boolean | void>;
}

/** 轻量 sleep 辅助 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 可被测试注入的命令执行器。默认使用 vscode.commands.executeCommand。
 * 测试时通过 __setExecuteCommandForTest 替换实现。
 */
let _executeCommand: (command: string, ...args: any[]) => Promise<any> =
    (command, ...args) => Promise.resolve(vscode.commands.executeCommand(command, ...args));

/** 测试用注入点：替换 executeCommand 实现 */
export function __setExecuteCommandForTest(fn: typeof _executeCommand): void {
    _executeCommand = fn;
}

/** 测试用重置点：恢复默认 executeCommand（vscode 宿主） */
export function __resetExecuteCommandForTest(): void {
    _executeCommand = (command, ...args) => Promise.resolve(vscode.commands.executeCommand(command, ...args));
}

/**
 * OS 级键盘模拟：向当前前台窗口发送一次 Enter。
 *
 * 仅 Windows 平台真实执行（通过 PowerShell 调用 System.Windows.Forms.SendKeys）。
 * 其它平台为 no-op（返回 false），由调用方根据返回值判断是否真的"发送"了指令。
 *
 * 设计取舍：
 *   - Cursor Composer 是自定义 webview，不接受 VS Code `type` 命令，故必须走 OS 键盘模拟
 *   - 依赖"Cursor 窗口当前为前台且输入框聚焦"，调用方必须在此之前完成 paste，
 *     并留足延迟让焦点稳定
 *   - 任何异常均被捕获并返回 false，不中断派发链
 */
let _sendEnterKey: () => Promise<boolean> = async () => {
    if (process.platform !== 'win32') { return false; }
    return new Promise<boolean>((resolve) => {
        // SendWait 同步返回，确保按键真的投递到前台窗口
        const cmd = 'powershell -NoProfile -WindowStyle Hidden -Command '
            + '"Add-Type -AssemblyName System.Windows.Forms; '
            + '[System.Windows.Forms.SendKeys]::SendWait(\'{ENTER}\')"';
        exec(cmd, { timeout: 3000 }, (err) => {
            resolve(!err);
        });
    });
};

/** 测试用注入点：替换 sendEnterKey 实现（返回 true 表示模拟成功发送） */
export function __setSendEnterKeyForTest(fn: () => Promise<boolean>): void {
    _sendEnterKey = fn;
}

/** 测试用重置点：恢复默认 sendEnterKey 实现 */
export function __resetSendEnterKeyForTest(): void {
    _sendEnterKey = async () => {
        if (process.platform !== 'win32') { return false; }
        return new Promise<boolean>((resolve) => {
            const cmd = 'powershell -NoProfile -WindowStyle Hidden -Command '
                + '"Add-Type -AssemblyName System.Windows.Forms; '
                + '[System.Windows.Forms.SendKeys]::SendWait(\'{ENTER}\')"';
            exec(cmd, { timeout: 3000 }, (err) => {
                resolve(!err);
            });
        });
    };
}

/**
 * 根据 appName 与可用命令集合识别当前 IDE 类型。
 *
 * 识别优先级（短路）：CodeBuddy > Cursor > Windsurf > VSCode
 * CodeBuddy 排最高优先级以确保既有用户在 VS Code 基础上安装 CodeBuddy 扩展时，
 * 行为与改动前完全一致（向下兼容）。
 */
export function detectIdeKind(appName: string, commands: Set<string>): IdeKind {
    // 1. CodeBuddy：命令可用性优先
    if (commands.has('tencentcloud.codingcopilot.chat.startNewChat')) {
        return 'codebuddy';
    }

    const lower = (appName || '').toLowerCase();

    // 2. Cursor：appName 包含 cursor 或存在 Cursor 特征命令
    if (lower.includes('cursor')
        || commands.has('composer.newAgentChat')
        || commands.has('aichat.newchataction')) {
        return 'cursor';
    }

    // 3. Windsurf：appName 包含 windsurf 或存在 Windsurf 特征命令
    if (lower.includes('windsurf')
        || commands.has('windsurf.prioritizeCascadeView')
        || commands.has('windsurf.triggerCascadeInput')
        || commands.has('cascade.newChat')) {
        return 'windsurf';
    }

    // 4. 默认 VSCode
    return 'vscode';
}

/**
 * 各 IDE 的策略链。每条策略按顺序尝试；首条成功即停止。
 * 策略不存在所需命令（requires 缺失）时跳过，不算失败。
 */
const STRATEGIES: Record<IdeKind, Strategy[]> = {
    codebuddy: [
        // 策略1：startNewChat + sendMessage 全自动（与改动前行为一致）
        {
            name: 'cb.startNewChat+sendMessage',
            requires: 'tencentcloud.codingcopilot.chat.startNewChat',
            run: async (ctx) => {
                await _executeCommand('tencentcloud.codingcopilot.chat.startNewChat');
                await sleep(800);
                await _executeCommand('tencentcloud.codingcopilot.chat.sendMessage', {
                    message: ctx.instruction
                });
            }
        },
        // 策略2：sendToChat
        {
            name: 'cb.sendToChat',
            requires: 'tencentcloud.codingcopilot.sendToChat',
            run: async (ctx) => {
                await _executeCommand('tencentcloud.codingcopilot.sendToChat', {
                    message: ctx.instruction
                });
            }
        },
        // 策略3：addToChat
        {
            name: 'cb.addToChat',
            requires: 'tencentcloud.codingcopilot.addToChat',
            run: async (ctx) => {
                await _executeCommand('tencentcloud.codingcopilot.addToChat', {
                    message: ctx.instruction
                });
            }
        },
        // 策略4：startNewChat + 聚焦面板（用户手动粘贴）
        {
            name: 'cb.startNewChat+focus',
            requires: 'tencentcloud.codingcopilot.chat.startNewChat',
            run: async () => {
                await _executeCommand('tencentcloud.codingcopilot.chat.startNewChat');
                await sleep(800);
                await _executeCommand('coding-copilot.webviews.chat.focus');
            }
        }
    ],
    cursor: [
        // 策略A：composer.newAgentChat（打开 Agent 新对话）+ 等待 + 自动粘贴 + （Windows）自动 Enter 发送
        {
            name: 'cursor.composer.newAgentChat+paste+enter',
            requires: 'composer.newAgentChat',
            run: async (ctx) => {
                await _executeCommand('composer.newAgentChat');
                await sleep(600);
                // 粘贴剪贴板内容。若当前焦点不在输入框，此命令可能 no-op，
                // 但不会 throw；后续若 Enter 也无效，用户可按兜底提示手动粘贴。
                await _executeCommand('editor.action.clipboardPasteAction');
                // 粘贴完成后给 UI 一点时间稳定焦点再发 Enter
                await sleep(250);
                const submitted = await _sendEnterKey();
                ctx.log(`[DIAG:aiChat] sendEnterKey(cursor.A) platform=${process.platform} result=${submitted}`);
                return submitted;
            }
        },
        // 策略B：aichat.newchataction（旧版命令 ID）+ 自动粘贴 + （Windows）自动 Enter 发送
        {
            name: 'cursor.aichat.newchataction+paste+enter',
            requires: 'aichat.newchataction',
            run: async (ctx) => {
                await _executeCommand('aichat.newchataction');
                await sleep(600);
                await _executeCommand('editor.action.clipboardPasteAction');
                await sleep(250);
                const submitted = await _sendEnterKey();
                ctx.log(`[DIAG:aiChat] sendEnterKey(cursor.B) platform=${process.platform} result=${submitted}`);
                return submitted;
            }
        }
    ],
    windsurf: [
        // 策略A：prioritizeCascadeView（聚焦 Cascade）+ 自动粘贴
        {
            name: 'windsurf.cascade.prioritize+paste',
            requires: 'windsurf.prioritizeCascadeView',
            run: async () => {
                await _executeCommand('windsurf.prioritizeCascadeView');
                await sleep(600);
                await _executeCommand('editor.action.clipboardPasteAction');
            }
        },
        // 策略B：triggerCascadeInput + 自动粘贴
        {
            name: 'windsurf.cascade.triggerInput+paste',
            requires: 'windsurf.triggerCascadeInput',
            run: async () => {
                await _executeCommand('windsurf.triggerCascadeInput');
                await sleep(600);
                await _executeCommand('editor.action.clipboardPasteAction');
            }
        },
        // 策略C：cascade.newChat + 自动粘贴
        {
            name: 'windsurf.cascade.newChat+paste',
            requires: 'cascade.newChat',
            run: async () => {
                await _executeCommand('cascade.newChat');
                await sleep(600);
                await _executeCommand('editor.action.clipboardPasteAction');
            }
        }
    ],
    vscode: [
        // 工蜂 Copilot 路径（保留原 VSCode 分支的工蜂探测行为）
        {
            name: 'vscode.gongfeng.openNewChat+focus',
            requires: 'gongfeng.gongfeng-copilot.chat.openNewChat',
            run: async () => {
                await _executeCommand('gongfeng.gongfeng-copilot.chat.openNewChat');
                await sleep(1000);
                // 聚焦工蜂对话面板（若命令存在）
                try {
                    await _executeCommand('gongfeng-copilot.webviews.chat.focus');
                    await sleep(300);
                } catch {
                    // 聚焦失败不影响总体成功（对话已打开）
                }
            }
        }
    ]
};

/**
 * 派发 AI 指令到当前 IDE 的 AI Chat。
 *
 * 执行流程：
 *   1. 写入首条诊断日志（ide、appName 由调用方先行记录）
 *   2. 遍历该 IDE 的策略链：
 *      - 若 requires 命令不在 availableCommands 中 → 记 skip 日志，跳过
 *      - 否则执行 run：begin 日志 → 尝试 → ok / error 日志
 *      - 首条 ok 策略即停止遍历
 *   3. 无论成败，写入最终 result 日志
 *
 * 该函数本身不会 throw。所有异常在策略内部被捕获并记录到日志。
 */
export async function dispatchAiChat(ide: IdeKind, ctx: DispatchContext): Promise<DispatchResult> {
    const chain = STRATEGIES[ide] || [];
    ctx.log(`[DIAG:aiChat] strategy chain length=${chain.length} for ide=${ide}`);

    let succeededStrategy = '';
    let lastAttempted = 'none';
    let autoSubmitted = false;

    for (const strat of chain) {
        // 检查 requires
        if (strat.requires) {
            const present = ctx.availableCommands.has(strat.requires);
            ctx.log(`[DIAG:aiChat] strategy=${strat.name} requires=${strat.requires} → ${present ? 'present' : 'absent'}`);
            if (!present) {
                continue;
            }
        } else {
            ctx.log(`[DIAG:aiChat] strategy=${strat.name} requires=<none>`);
        }

        lastAttempted = strat.name;
        ctx.log(`[DIAG:aiChat] strategy=${strat.name} begin`);
        try {
            const ret = await strat.run(ctx);
            autoSubmitted = ret === true;
            ctx.log(`[DIAG:aiChat] strategy=${strat.name} ok autoSubmitted=${autoSubmitted}`);
            succeededStrategy = strat.name;
            break;
        } catch (e: any) {
            const msg = (e && e.message) ? e.message : String(e);
            ctx.log(`[DIAG:aiChat] strategy=${strat.name} error=${msg}`);
            // 继续下一条策略
        }
    }

    const succeeded = !!succeededStrategy;
    const result: DispatchResult = {
        succeeded,
        strategy: succeeded ? succeededStrategy : lastAttempted,
        fellBackToClipboard: !succeeded,
        autoSubmitted: succeeded && autoSubmitted
    };
    ctx.log(`[DIAG:aiChat] dispatch result: succeeded=${result.succeeded} strategy=${result.strategy} fellBackToClipboard=${result.fellBackToClipboard} autoSubmitted=${result.autoSubmitted}`);
    return result;
}
