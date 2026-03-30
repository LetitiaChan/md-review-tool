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

        // 读取源文件内容并按空行分割为块，用于生成文本锚点指纹
        let blocks: string[] = [];
        try {
            const absSourcePath = sourceFile ? (path.isAbsolute(sourceFile) ? sourceFile : path.join(this.workspaceRoot, sourceFile)) : '';
            if (absSourcePath && fs.existsSync(absSourcePath)) {
                const sourceContent = fs.readFileSync(absSourcePath, 'utf-8');
                blocks = this.splitMarkdownToBlocks(sourceContent);
            }
        } catch (e) {
            // 读取失败时 blocks 为空，不影响指令生成
        }

        // 按 blockIndex 倒序排列（从文档末尾到开头），同一块内按 startOffset 倒序
        // 这样 AI 从后往前执行修改时，不会影响前面块的序号和偏移
        const sortedAnnotations = [...validAnnotations].sort((a: any, b: any) => {
            if (a.blockIndex !== b.blockIndex) { return b.blockIndex - a.blockIndex; }
            return (b.startOffset || 0) - (a.startOffset || 0);
        });

        const lines: string[] = [];
        lines.push('# AI 修改指令');
        lines.push('');
        lines.push(`> 以下批注需要 AI 按指令逐条修改源文件 \`${safeName}\``);
        lines.push(`> 源文件路径：${sourceFilePath}`);
        lines.push('');
        lines.push('> ⚠️ 指令已按**从后往前**排列（倒序），请严格按照顺序从上到下逐条执行。');
        lines.push('> 每条指令提供了「文本锚点」用于精确定位，请优先通过锚点文本匹配来确认目标位置，blockIndex 仅作辅助参考。');
        lines.push('');

        sortedAnnotations.forEach((ann: any, i: number) => {
            const blockContent = (ann.blockIndex != null && blocks[ann.blockIndex]) ? blocks[ann.blockIndex] : '';
            const blockFingerprint = blockContent.substring(0, 80).replace(/\n/g, ' ');

            const insertLabel = ann.type === 'insert' ? (ann.insertPosition === 'before' ? '（前插）' : '（后插）') : '';
            lines.push(`## 指令 ${i + 1}${ann.type === 'comment' ? '（修改）' : ann.type === 'delete' ? '（删除）' : insertLabel}`);
            lines.push('');
            if (ann.type === 'delete') {
                lines.push('- **操作**：删除以下文本');
                if (ann.blockIndex != null) {
                    lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                }
                if (blockFingerprint) {
                    lines.push(`- **文本锚点**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **块内偏移**：第 ${ann.startOffset} 个字符处（startOffset=${ann.startOffset}）`);
                }
                lines.push('- **要删除的文本**：');
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
            } else if (ann.type === 'insert') {
                const isBefore = ann.insertPosition === 'before';
                lines.push(`- **操作**：在指定位置${isBefore ? '前' : '后'}插入新内容`);
                if (ann.blockIndex != null) {
                    lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                }
                if (blockFingerprint) {
                    lines.push(`- **文本锚点**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **块内偏移**：第 ${ann.startOffset} 个字符处（startOffset=${ann.startOffset}）`);
                }
                lines.push(`- **插入位置（在此文本之${isBefore ? '前' : '后'}）**：`);
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
                if (ann.blockIndex != null) {
                    lines.push(`- **定位块**：第 ${ann.blockIndex + 1} 块`);
                }
                if (blockFingerprint) {
                    lines.push(`- **文本锚点**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **块内偏移**：第 ${ann.startOffset} 个字符处（startOffset=${ann.startOffset}）`);
                }
                lines.push('- **目标文本**：');
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
                lines.push(`- **评论内容**：${ann.comment || ''}`);
                if (ann.images && ann.images.length > 0) {
                    lines.push(`- **附图**：共 ${ann.images.length} 张`);
                    ann.images.forEach((img: string, j: number) => {
                        lines.push(`  - 图片${j + 1}：`);
                        // 路径引用的图片使用相对路径，Base64 图片保持原样
                        if (img.startsWith('data:image/')) {
                            lines.push(`  ![附图${j + 1}](${img})`);
                        } else {
                            lines.push(`  ![附图${j + 1}](${img})`);
                        }
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
     * 获取批注图片目录
     */
    private get imageDir(): string {
        return path.join(this.reviewDir, 'images');
    }

    /**
     * 确保图片目录存在
     */
    private ensureImageDir(): void {
        this.ensureReviewDir();
        if (!fs.existsSync(this.imageDir)) {
            fs.mkdirSync(this.imageDir, { recursive: true });
        }
    }

    /**
     * 保存批注图片到文件
     * @param base64Data Base64 编码的图片数据（含 data:image/xxx;base64, 前缀）
     * @param fileName 可选的文件名，不传则自动生成
     * @param sourceDir 当前 MD 文件所在目录，传入时会将图片同步复制到该目录的 images 子目录
     * @returns 相对于批阅文件目录的图片路径
     */
    saveAnnotationImage(base64Data: string, fileName?: string, sourceDir?: string): { success: boolean; imagePath: string } {
        this.ensureImageDir();

        // 解析 Base64 数据
        const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!match) {
            throw new Error('无效的图片数据格式');
        }

        let ext = match[1];
        if (ext === 'jpeg') { ext = 'jpg'; }
        const buffer = Buffer.from(match[2], 'base64');

        // 生成唯一文件名
        const imgFileName = fileName || `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
        const imgPath = path.join(this.imageDir, imgFileName);

        fs.writeFileSync(imgPath, buffer);

        // 同步复制图片到当前 MD 文件所在目录的 images 子目录
        if (sourceDir) {
            try {
                const targetImagesDir = path.join(sourceDir, 'images');
                if (!fs.existsSync(targetImagesDir)) {
                    fs.mkdirSync(targetImagesDir, { recursive: true });
                }
                const targetImgPath = path.join(targetImagesDir, imgFileName);
                fs.copyFileSync(imgPath, targetImgPath);
            } catch (e) {
                console.error('复制图片到 MD 文件目录失败:', e);
            }
        }

        // 返回相对路径：images/xxx.png
        const relativePath = `images/${imgFileName}`;
        return { success: true, imagePath: relativePath };
    }

    /**
     * 将批注图片路径解析为 webview URI
     * @param imagePaths 相对于批阅文件目录的图片路径数组
     * @param webview Webview 实例
     * @returns 路径到 URI 的映射
     */
    resolveAnnotationImageUris(imagePaths: string[], webview: vscode.Webview): Record<string, string> {
        const result: Record<string, string> = {};
        for (const imgPath of imagePaths) {
            try {
                const absolutePath = path.join(this.reviewDir, imgPath);
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

    /**
     * 删除批注图片文件
     */
    deleteAnnotationImage(imagePath: string): boolean {
        try {
            const absolutePath = path.join(this.reviewDir, imagePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
                return true;
            }
        } catch (e) {
            console.error('删除批注图片失败:', imagePath, e);
        }
        return false;
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

    /**
     * 简化版 Markdown 块分割（按空行分割）
     * 用于生成 AI 修改指令时提取块的文本锚点指纹
     * 注意：此方法与 webview 端 Renderer.parseMarkdown 保持一致的分割逻辑
     */
    private splitMarkdownToBlocks(markdown: string): string[] {
        // 剥离 YAML frontmatter
        let processedMarkdown = markdown;
        const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        const blocks: string[] = [];
        if (frontmatterMatch) {
            blocks.push('```yaml\n' + frontmatterMatch[0].trimEnd() + '\n```');
            processedMarkdown = markdown.slice(frontmatterMatch[0].length);
        }

        const lines = processedMarkdown.split('\n');
        let current: string[] = [];
        let inCodeBlock = false;
        let inHtmlBlock = false;
        let htmlBlockTag = '';
        let htmlBlockDepth = 0;
        let inList = false;
        let inListCodeBlock = false;
        let inBlockquote = false;
        let inFootnote = false;

        const listItemRegex = /^(\s*)([-*+]|\d+[.)]) /;
        const listContinuationRegex = /^([ ]{2,}|\t)/;
        const blockquoteLineRegex = /^\s{0,3}>/;
        const footnoteDefLineRegex = /^\s{0,3}\[\^([^\]\n]+)\]:\s*/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 引用块上下文
            if (inBlockquote) {
                if (blockquoteLineRegex.test(line)) {
                    current.push(line);
                    continue;
                } else if (line.trim() === '') {
                    let nextNonEmpty = -1;
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].trim() !== '') { nextNonEmpty = j; break; }
                    }
                    if (nextNonEmpty !== -1 && blockquoteLineRegex.test(lines[nextNonEmpty])) {
                        current.push(line);
                    } else {
                        if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                        inBlockquote = false;
                    }
                    continue;
                } else {
                    inBlockquote = false;
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                }
            }

            // 脚注续行
            if (inFootnote && line.trim() !== '') {
                if (/^(?:[ ]{4}|\t)/.test(line)) {
                    current.push(line);
                    continue;
                } else {
                    inFootnote = false;
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                }
            }

            // 代码块围栏
            if (line.trim().startsWith('```') && !inHtmlBlock) {
                const isIndentedFence = /^\s+```/.test(line);
                if (inListCodeBlock) { current.push(line); inListCodeBlock = false; continue; }
                if (inList && isIndentedFence) { current.push(line); inListCodeBlock = true; continue; }
                if (inCodeBlock) {
                    current.push(line); blocks.push(current.join('\n')); current = [];
                    inCodeBlock = false; inList = false; continue;
                } else {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                    inCodeBlock = true; inList = false; current.push(line); continue;
                }
            }
            if (inCodeBlock) { current.push(line); continue; }
            if (inListCodeBlock) { current.push(line); continue; }

            // HTML 块
            if (!inHtmlBlock) {
                const htmlBlockMatch = /^\s*<(details|div)[\s>]/i.exec(line);
                if (htmlBlockMatch) {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                    inHtmlBlock = true; inList = false;
                    htmlBlockTag = htmlBlockMatch[1].toLowerCase();
                    htmlBlockDepth = 1; current.push(line);
                    const openCount = (line.match(new RegExp(`<${htmlBlockTag}[\\s>]`, 'gi')) || []).length;
                    const closeCount = (line.match(new RegExp(`</${htmlBlockTag}\\s*>`, 'gi')) || []).length;
                    htmlBlockDepth = openCount - closeCount;
                    if (htmlBlockDepth <= 0) {
                        blocks.push(current.join('\n')); current = [];
                        inHtmlBlock = false; htmlBlockTag = ''; htmlBlockDepth = 0;
                    }
                    continue;
                }
            }
            if (inHtmlBlock) {
                current.push(line);
                const openCount = (line.match(new RegExp(`<${htmlBlockTag}[\\s>]`, 'gi')) || []).length;
                const closeCount = (line.match(new RegExp(`</${htmlBlockTag}\\s*>`, 'gi')) || []).length;
                htmlBlockDepth += openCount - closeCount;
                if (htmlBlockDepth <= 0) {
                    blocks.push(current.join('\n')); current = [];
                    inHtmlBlock = false; htmlBlockTag = ''; htmlBlockDepth = 0;
                }
                continue;
            }

            // 空行处理
            if (line.trim() === '') {
                if (inFootnote) {
                    let nextNonEmpty = -1;
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].trim() !== '') { nextNonEmpty = j; break; }
                    }
                    if (nextNonEmpty !== -1 && /^(?:[ ]{4}|\t)/.test(lines[nextNonEmpty])) {
                        current.push(line);
                    } else {
                        if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                        inFootnote = false;
                    }
                } else if (inList) {
                    let nextNonEmpty = -1;
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].trim() !== '') { nextNonEmpty = j; break; }
                    }
                    if (nextNonEmpty !== -1 &&
                        (listContinuationRegex.test(lines[nextNonEmpty]) || listItemRegex.test(lines[nextNonEmpty]))) {
                        current.push(line);
                    } else {
                        if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                        inList = false;
                    }
                } else {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                }
            } else {
                if (!inList && !inBlockquote && !inFootnote && footnoteDefLineRegex.test(line)) {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                    inFootnote = true; current.push(line);
                } else if (!inList && !inBlockquote && blockquoteLineRegex.test(line)) {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                    inBlockquote = true; inList = false; current.push(line);
                } else if (!inList && !inBlockquote && listItemRegex.test(line)) {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                    inList = true; current.push(line);
                } else {
                    current.push(line);
                }
            }
        }
        if (current.length > 0) { blocks.push(current.join('\n')); }

        return blocks.filter(b => b.trim().length > 0);
    }

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
