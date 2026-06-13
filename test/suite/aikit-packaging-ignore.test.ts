import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

suite('AIKit packaging ignore rules', () => {
    const extPath = vscode.extensions.getExtension('letitia.md-human-review')!.extensionPath;

    function readRootFile(fileName: string): string {
        return fs.readFileSync(path.join(extPath, fileName), 'utf-8').replace(/\r\n/g, '\n');
    }

    suite('Tier 1 — 存在性断言', () => {
        test('gitignore 应追踪 CodeBuddy 共享 aikit 子目录', () => {
            const gitignore = readRootFile('.gitignore');
            const requiredPatterns = [
                '.codebuddy/*',
                '!.codebuddy/agents/',
                '!.codebuddy/agents/**',
                '!.codebuddy/commands/',
                '!.codebuddy/commands/**',
                '!.codebuddy/rules/',
                '!.codebuddy/rules/**',
                '!.codebuddy/skills/',
                '!.codebuddy/skills/**'
            ];

            for (const pattern of requiredPatterns) {
                assert.ok(gitignore.includes(pattern), `.gitignore should include ${pattern}`);
            }
        });

        test('gitignore 应追踪 Cursor aikit shim 子目录', () => {
            const gitignore = readRootFile('.gitignore');
            const requiredPatterns = [
                '.cursor/*',
                '!.cursor/agents',
                '!.cursor/agents/**',
                '!.cursor/commands',
                '!.cursor/commands/**',
                '!.cursor/rules/',
                '!.cursor/rules/**',
                '!.cursor/skills',
                '!.cursor/skills/**'
            ];

            for (const pattern of requiredPatterns) {
                assert.ok(gitignore.includes(pattern), `.gitignore should include ${pattern}`);
            }
        });
    });

    suite('Tier 3 — 任务特定断言（BT-AikitPackaging.*）', () => {
        test('BT-AikitPackaging.1 VSIX package should exclude AI tool workflow directories', () => {
            const vscodeignore = readRootFile('.vscodeignore');
            const requiredExcludes = [
                '.claude/**',
                '.codebuddy/**',
                '.cursor/**',
                'AGENT-PROGRESS.md',
                'todo.md',
                '.review/**'
            ];

            for (const pattern of requiredExcludes) {
                assert.ok(vscodeignore.includes(pattern), `.vscodeignore should include ${pattern}`);
            }
        });
    });
});
