import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class FileService {
    private workspaceRoot: string;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        this.workspaceRoot = folders && folders.length > 0 ? folders[0].uri.fsPath : '';
    }

    private get reviewDir(): string {
        return path.join(this.workspaceRoot, '批阅文件');
    }

    private ensureReviewDir(): void {
        if (!fs.existsSync(this.reviewDir)) {
            fs.mkdirSync(this.reviewDir, { recursive: true });
        }
    }

    /**
     * 列出工作区所有 .md / .mdc 文件（递归搜索），排除批阅文件目录
     */
    async listMdFiles(): Promise<string[]> {
        if (!this.workspaceRoot) { return []; }
        const uris = await vscode.workspace.findFiles('**/*.{md,mdc}', '{**/node_modules/**,**/批阅文件/**}');
        return uris
            .map(u => vscode.workspace.asRelativePath(u))
            .filter(p => !p.startsWith('批阅文件/') && !p.startsWith('批阅文件\\'))
            .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    /**
     * 读取文件内容
     */
    readFile(filePath: string): { name: string; content: string; docVersion: string | null; sourceFilePath: string; sourceDir: string } {
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
        if (!fs.existsSync(absPath)) {
            throw new Error('文件不存在: ' + absPath);
        }
        const content = fs.readFileSync(absPath, 'utf-8');
        const docVersion = this.extractDocVersion(content);
        return {
            name: path.basename(absPath),
            content,
            docVersion,
            sourceFilePath: absPath.replace(/\\/g, '/'),
            sourceDir: path.dirname(absPath).replace(/\\/g, '/')
        };
    }

    /**
     * 保存编辑后的文件（含备份）
     */
    saveFile(filePath: string, content: string): { success: boolean; changed: boolean; backupFile?: string; docVersion?: string | null } {
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
        if (!fs.existsSync(absPath)) {
            throw new Error('文件不存在: ' + absPath);
        }

        const oldContent = fs.readFileSync(absPath, 'utf-8');
        if (oldContent === content) {
            return { success: true, changed: false };
        }

        this.ensureReviewDir();
        const safeName = path.basename(absPath);
        const ext = path.extname(safeName);
        const baseName = safeName.replace(ext, '');
        const backupName = `${baseName}_编辑前备份_${Date.now()}${ext}`;
        const backupPath = path.join(this.reviewDir, backupName);
        fs.writeFileSync(backupPath, oldContent, 'utf-8');
        fs.writeFileSync(absPath, content, 'utf-8');

        const docVersion = this.extractDocVersion(content);
        return { success: true, changed: true, backupFile: backupName, docVersion };
    }

    /**
     * 保存批阅记录
     */
    saveReview(fileName: string, content: string): { success: boolean; path: string } {
        this.ensureReviewDir();
        const safeName = path.basename(fileName);
        const filePath = path.join(this.reviewDir, safeName);
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true, path: safeName };
    }

    /**
     * 生成 AI 修改指令文件
     */
    applyReview(annotations: any[], sourceFile: string, fileName: string): { success: boolean; needsAi: number; aiInstructionFile?: string; aiInstructionFilePath?: string; sourceFilePath: string; message: string } {
        this.ensureReviewDir();
        const safeName = path.basename(fileName);
        const sourceFilePath = sourceFile ? sourceFile.replace(/\\/g, '/') : '';

        const validAnnotations = annotations.filter((a: any) =>
            (a.type === 'comment') ||
            (a.type === 'delete' && a.selectedText) ||
            (a.type === 'insert' && a.insertContent && a.selectedText)
        );

        if (validAnnotations.length === 0) {
            return { success: true, needsAi: 0, sourceFilePath, message: '无有效指令' };
        }

        const lines: string[] = [];
        lines.push('# AI 修改指令');
        lines.push('');
        lines.push(`> 以下批注需要 AI 按指令逐条修改源文件 \`${safeName}\``);
        lines.push(`> 源文件路径：${sourceFilePath}`);
        lines.push('');
        lines.push('> ⚠️ 请严格按照顺序从上到下执行，每条指令独立定位。');
        lines.push('');

        validAnnotations.forEach((ann: any, i: number) => {
            lines.push(`## 指令 ${i + 1}${ann.type === 'comment' ? '（修改）' : ann.type === 'delete' ? '（删除）' : '（插入）'}`);
            lines.push('');
            if (ann.type === 'delete') {
                lines.push('- **操作**：删除以下文本');
                lines.push('- **要删除的文本**：');
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
            } else if (ann.type === 'insert') {
                lines.push('- **操作**：在指定位置后插入新内容');
                lines.push('- **插入位置（在此文本之后）**：');
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
                lines.push('- **要插入的内容**：');
                lines.push('```');
                lines.push(ann.insertContent || '');
                lines.push('```');
                if (ann.comment) {
                    lines.push(`- **插入说明**：${ann.comment}`);
                }
            } else if (ann.type === 'comment') {
                lines.push('- **操作**：根据评论修改内容');
                lines.push('- **目标文本**：');
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
                lines.push(`- **评论内容**：${ann.comment || ''}`);
                if (ann.images && ann.images.length > 0) {
                    lines.push(`- **附图**：共 ${ann.images.length} 张`);
                    ann.images.forEach((img: string, j: number) => {
                        lines.push(`  - 图片${j + 1}：`);
                        lines.push(`  ![附图${j + 1}](${img})`);
                    });
                }
            }
            lines.push('');
        });

        const aiFileName = `AI修改指令_${safeName.replace(/\.(md|mdc)$/, '')}_${Date.now()}.md`;
        const aiFilePath = path.join(this.reviewDir, aiFileName);
        fs.writeFileSync(aiFilePath, lines.join('\n'), 'utf-8');

        return {
            success: true,
            needsAi: validAnnotations.length,
            aiInstructionFile: aiFileName,
            aiInstructionFilePath: aiFilePath.replace(/\\/g, '/'),
            sourceFilePath,
            message: `共 ${validAnnotations.length} 条指令已生成 AI 修改文件`
        };
    }

    /**
     * 删除指定文件的所有批阅记录文件（批阅记录 + 批阅数据 JSON）
     */
    deleteReviewRecords(fileName: string): { success: boolean; deleted: string[] } {
        if (!fs.existsSync(this.reviewDir)) { return { success: true, deleted: [] }; }
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName).replace(ext, '');
        const allFiles = fs.readdirSync(this.reviewDir);
        const deleted: string[] = [];

        for (const f of allFiles) {
            if (f.startsWith(`批阅记录_${baseName}_v`) || f.startsWith(`批阅数据_${baseName}_v`)) {
                const fullPath = path.join(this.reviewDir, f);
                try {
                    fs.unlinkSync(fullPath);
                    deleted.push(f);
                } catch (e) {
                    console.error('删除批阅文件失败:', fullPath, e);
                }
            }
        }

        return { success: true, deleted };
    }

    /**
     * 读取批阅文件夹中的批阅记录
     */
    getReviewRecords(fileName: string): any[] {
        if (!fs.existsSync(this.reviewDir)) { return []; }
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName).replace(ext, '');
        const allFiles = fs.readdirSync(this.reviewDir).filter(f => f.endsWith('.md') || f.endsWith('.mdc'));
        const records: any[] = [];

        for (const f of allFiles) {
            if (f.startsWith(`批阅记录_${baseName}_v`)) {
                const fullPath = path.join(this.reviewDir, f);
                const content = fs.readFileSync(fullPath, 'utf-8');
                const reviewVersion = this.extractReviewVersion(f);
                const docVersionInRecord = this.extractDocVersionFromReview(content);
                const annotationData = this.extractAnnotationsFromReview(content);
                records.push({
                    fileName: f,
                    reviewVersion,
                    docVersion: docVersionInRecord,
                    annotationCount: annotationData ? annotationData.annotationCount : 0,
                    annotations: annotationData ? annotationData.annotations : [],
                    rawContent: content
                });
            }
        }

        records.sort((a, b) => b.reviewVersion - a.reviewVersion);
        return records;
    }

    /**
     * 批量解析图片 URI
     */
    resolveImageUris(imagePaths: string[], basePath: string, webview: vscode.Webview): Record<string, string> {
        const result: Record<string, string> = {};
        for (const imgPath of imagePaths) {
            try {
                const absolutePath = path.resolve(basePath, imgPath);
                if (fs.existsSync(absolutePath)) {
                    const uri = vscode.Uri.file(absolutePath);
                    result[imgPath] = webview.asWebviewUri(uri).toString();
                }
            } catch (e) {
                // skip invalid paths
            }
        }
        return result;
    }

    // ===== 辅助函数 =====

    private extractDocVersion(content: string): string | null {
        const patterns = [
            /\*\*文档版本\*\*[：:]\s*(v[\d.]+)/i,
            /\*\*版本\*\*[：:]\s*(v[\d.]+)/i,
            /文档版本[：:]\s*(v[\d.]+)/i,
            /版本[：:]\s*(v[\d.]+)/i,
        ];
        for (const pat of patterns) {
            const match = content.match(pat);
            if (match) { return match[1]; }
        }
        return null;
    }

    private extractReviewVersion(fileName: string): number {
        const match = fileName.match(/_v(\d+)(?:_|\.md$)/);
        return match ? parseInt(match[1]) : 1;
    }

    private extractDocVersionFromReview(content: string): string | null {
        const match = content.match(/\*\*源文件版本\*\*[：:]\s*(v[\d.]+)/i);
        return match ? match[1] : null;
    }

    private extractAnnotationsFromReview(content: string): { annotationCount: number; annotations: any[] } | null {
        const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
        if (!jsonMatch) { return null; }
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            return {
                annotationCount: parsed.annotationCount || (parsed.annotations ? parsed.annotations.length : 0),
                annotations: parsed.annotations || []
            };
        } catch (e) {
            return null;
        }
    }
}
