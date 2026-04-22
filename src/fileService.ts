import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const _aiLabels: Record<string, Record<string, string>> = {
    'zh-CN': {
        title: 'AI 修改指令',
        hint: '以下批注需要 AI 按指令逐条修改源文件',
        source_path: '源文件路径',
        order_hint: '⚠️ 指令已按**从后往前**排列（倒序），请严格按照顺序从上到下逐条执行。',
        anchor_hint: '每条指令提供了「文本锚点」用于精确定位，请优先通过锚点文本匹配来确认目标位置，blockIndex 仅作辅助参考。',
        instruction: '指令',
        label_modify: '（修改）', label_delete: '（删除）', label_insert_before: '（前插）', label_insert_after: '（后插）',
        op_delete: '删除以下文本', op_insert_before: '在指定位置前插入新内容', op_insert_after: '在指定位置后插入新内容', op_modify: '根据评论修改内容',
        field_op: '操作', field_block: '定位块', field_block_n: '第 {n} 块',
        field_anchor: '文本锚点', field_offset: '块内偏移', field_offset_n: '第 {n} 个字符处（startOffset={n}）',
        field_delete_text: '要删除的文本', field_insert_pos_before: '插入位置（在此文本之前）', field_insert_pos_after: '插入位置（在此文本之后）',
        field_insert_content: '要插入的内容', field_insert_reason: '插入说明',
        field_target: '目标文本', field_comment: '评论内容', field_images: '附图', field_images_n: '共 {n} 张', field_image_n: '图片{n}：', field_image_alt: '附图{n}',
        no_valid: '无有效指令', generated: '共 {n} 条指令已生成 AI 修改文件',
        file_not_found: '文件不存在: ', invalid_image: '无效的图片数据格式',
        refresh_hint: '✅ **完成所有修改后**，请提醒用户回到 **MD Human Review** 面板点击右上角的刷新按钮（🔄），以加载最新内容并创建新的批阅版本。',
    },
    'en': {
        title: 'AI Modification Instructions',
        hint: 'The following annotations require AI to modify the source file instruction by instruction',
        source_path: 'Source file path',
        order_hint: '⚠️ Instructions are listed in **reverse order** (bottom-up). Please execute them strictly from top to bottom.',
        anchor_hint: 'Each instruction provides a "Text Anchor" for precise positioning. Please match the anchor text first; blockIndex is for reference only.',
        instruction: 'Instruction',
        label_modify: ' (Modify)', label_delete: ' (Delete)', label_insert_before: ' (Insert Before)', label_insert_after: ' (Insert After)',
        op_delete: 'Delete the following text', op_insert_before: 'Insert new content before the specified position', op_insert_after: 'Insert new content after the specified position', op_modify: 'Modify content according to comment',
        field_op: 'Operation', field_block: 'Block', field_block_n: 'Block {n}',
        field_anchor: 'Text Anchor', field_offset: 'Block Offset', field_offset_n: 'At character {n} (startOffset={n})',
        field_delete_text: 'Text to Delete', field_insert_pos_before: 'Insert Position (before this text)', field_insert_pos_after: 'Insert Position (after this text)',
        field_insert_content: 'Content to Insert', field_insert_reason: 'Insert Reason',
        field_target: 'Target Text', field_comment: 'Comment', field_images: 'Images', field_images_n: '{n} image(s)', field_image_n: 'Image {n}:', field_image_alt: 'Image {n}',
        no_valid: 'No valid instructions', generated: '{n} instructions generated for AI modification',
        file_not_found: 'File not found: ', invalid_image: 'Invalid image data format',
        refresh_hint: '✅ **After completing all modifications**, please remind the user to go back to the **MD Human Review** panel and click the refresh button (🔄) at the top right corner to reload the latest content and create a new review version.',
    }
};

function _aiT(key: string, params?: Record<string, any>): string {
    const lang = vscode.workspace.getConfiguration('mdReview').get<string>('language', 'zh-CN');
    const dict = _aiLabels[lang] || _aiLabels['zh-CN'];
    let text = dict[key] || _aiLabels['zh-CN'][key] || key;
    if (params) {
        Object.keys(params).forEach(k => {
            text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(params[k]));
        });
    }
    return text;
}

export class FileService {
    private workspaceRoot: string;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        this.workspaceRoot = folders && folders.length > 0 ? folders[0].uri.fsPath : '';
    }

    /**
     * 根据文件的相对路径生成 6 位短哈希，用于区分不同目录下的同名文件。
     * 仅对含子目录的路径生成哈希，根目录下的文件返回空字符串（向后兼容）。
     */
    private pathHash(relPath: string): string {
        const normalized = relPath.replace(/\\/g, '/');
        const dir = path.dirname(normalized);
        if (!dir || dir === '.') { return ''; }
        return crypto.createHash('md5').update(dir).digest('hex').substring(0, 6);
    }

    /**
     * 构建批阅文件名前缀。
     * 规则：根目录文件 → "README"；子目录文件 → "a3b2c1_README"（hash在前）
     */
    private reviewBaseName(fileName: string, relPath?: string): string {
        const ext = path.extname(fileName);
        const base = path.basename(fileName).replace(ext, '');
        if (!relPath) { return base; }
        const hash = this.pathHash(relPath);
        return hash ? `${hash}_${base}` : base;
    }

    /**
     * 获取文件相对于工作区的路径
     */
    private getRelPath(absPath: string): string {
        if (this.workspaceRoot) {
            return path.relative(this.workspaceRoot, absPath).replace(/\\/g, '/');
        }
        return path.basename(absPath);
    }

    private get reviewDir(): string {
        return path.join(this.workspaceRoot, '.review');
    }

    private ensureReviewDir(): void {
        if (!fs.existsSync(this.reviewDir)) {
            fs.mkdirSync(this.reviewDir, { recursive: true });
        }
    }

    /**
     * 列出工作区所有 .md / .mdc 文件（递归搜索），排除 .review 目录
     */
    async listMdFiles(): Promise<string[]> {
        if (!this.workspaceRoot) { return []; }
const uris = await vscode.workspace.findFiles('**/*.{md,mdc}', '{**/node_modules/**,**/.review/**}');
        return uris
            .map(u => vscode.workspace.asRelativePath(u))
.filter(p => !p.startsWith('.review/') && !p.startsWith('.review\\'))
            .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    /**
     * 读取文件内容
     */
    readFile(filePath: string): { name: string; content: string; docVersion: string | null; sourceFilePath: string; sourceDir: string; relPath: string; pathHash: string } {
        const absPath = path.isAbsolute(filePath) ? filePath : path.join(this.workspaceRoot, filePath);
        if (!fs.existsSync(absPath)) {
            throw new Error('文件不存在: ' + absPath);
        }
        const content = fs.readFileSync(absPath, 'utf-8');
        const docVersion = this.extractDocVersion(content);
        const relPath = this.getRelPath(absPath);
        return {
            name: path.basename(absPath),
            content,
            docVersion,
            sourceFilePath: absPath.replace(/\\/g, '/'),
            sourceDir: path.dirname(absPath).replace(/\\/g, '/'),
            relPath,
            pathHash: this.pathHash(relPath)
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
        const rbaseName = this.reviewBaseName(safeName, this.getRelPath(absPath));
        const backupName = `${rbaseName}_${Date.now()}_backup${ext}`;
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
    applyReview(annotations: any[], sourceFile: string, fileName: string, relPath?: string): { success: boolean; needsAi: number; aiInstructionFile?: string; aiInstructionFilePath?: string; sourceFilePath: string; message: string } {
        this.ensureReviewDir();
        const safeName = path.basename(fileName);
        const sourceFilePath = sourceFile ? sourceFile.replace(/\\/g, '/') : '';
        const rbaseName = this.reviewBaseName(safeName, relPath);

        const validAnnotations = annotations.filter((a: any) =>
            (a.type === 'comment') ||
            (a.type === 'delete' && a.selectedText) ||
            (a.type === 'insert' && a.insertContent && a.selectedText)
        );


        if (validAnnotations.length === 0) {
            return { success: true, needsAi: 0, sourceFilePath, message: _aiT('no_valid') };
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
        lines.push(`# ${_aiT('title')}`);
        lines.push('');
        lines.push(`> ${_aiT('hint')} \`${safeName}\``);
        lines.push(`> ${_aiT('source_path')}：${sourceFilePath}`);
        lines.push('');
        lines.push(`> ${_aiT('order_hint')}`);
        lines.push(`> ${_aiT('anchor_hint')}`);
        lines.push(`> ${_aiT('refresh_hint')}`);
        lines.push('');

        sortedAnnotations.forEach((ann: any, i: number) => {
            const blockContent = (ann.blockIndex != null && blocks[ann.blockIndex]) ? blocks[ann.blockIndex] : '';
            const blockFingerprint = blockContent.substring(0, 80).replace(/\n/g, ' ');

            const insertLabel = ann.type === 'insert' ? (ann.insertPosition === 'before' ? _aiT('label_insert_before') : _aiT('label_insert_after')) : '';
            lines.push(`## ${_aiT('instruction')} ${i + 1}${ann.type === 'comment' ? _aiT('label_modify') : ann.type === 'delete' ? _aiT('label_delete') : insertLabel}`);
            lines.push('');
            if (ann.type === 'delete') {
                lines.push(`- **${_aiT('field_op')}**：${_aiT('op_delete')}`);
                if (ann.blockIndex != null) {
                    lines.push(`- **${_aiT('field_block')}**：${_aiT('field_block_n', { n: ann.blockIndex + 1 })}`);
                }
                if (blockFingerprint) {
                    lines.push(`- **${_aiT('field_anchor')}**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **${_aiT('field_offset')}**：${_aiT('field_offset_n', { n: ann.startOffset })}`);
                }
                lines.push(`- **${_aiT('field_delete_text')}**：`);
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
            } else if (ann.type === 'insert') {
                const isBefore = ann.insertPosition === 'before';
                lines.push(`- **${_aiT('field_op')}**：${isBefore ? _aiT('op_insert_before') : _aiT('op_insert_after')}`);
                if (ann.blockIndex != null) {
                    lines.push(`- **${_aiT('field_block')}**：${_aiT('field_block_n', { n: ann.blockIndex + 1 })}`);
                }
                if (blockFingerprint) {
                    lines.push(`- **${_aiT('field_anchor')}**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **${_aiT('field_offset')}**：${_aiT('field_offset_n', { n: ann.startOffset })}`);
                }
                lines.push(`- **${isBefore ? _aiT('field_insert_pos_before') : _aiT('field_insert_pos_after')}**：`);
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
                lines.push(`- **${_aiT('field_insert_content')}**：`);
                lines.push('```');
                lines.push(ann.insertContent || '');
                lines.push('```');
                if (ann.comment) {
                    lines.push(`- **${_aiT('field_insert_reason')}**：${ann.comment}`);
                }
            } else if (ann.type === 'comment') {
                lines.push(`- **${_aiT('field_op')}**：${_aiT('op_modify')}`);
                if (ann.blockIndex != null) {
                    lines.push(`- **${_aiT('field_block')}**：${_aiT('field_block_n', { n: ann.blockIndex + 1 })}`);
                }
                if (blockFingerprint) {
                    lines.push(`- **${_aiT('field_anchor')}**：\`${blockFingerprint}\``);
                }
                if (ann.startOffset != null) {
                    lines.push(`- **${_aiT('field_offset')}**：${_aiT('field_offset_n', { n: ann.startOffset })}`);
                }
                lines.push(`- **${_aiT('field_target')}**：`);
                lines.push('```');
                lines.push(ann.selectedText || '');
                lines.push('```');
                lines.push(`- **${_aiT('field_comment')}**：${ann.comment || ''}`);
                if (ann.images && ann.images.length > 0) {
                    lines.push(`- **${_aiT('field_images')}**：${_aiT('field_images_n', { n: ann.images.length })}`);
                    ann.images.forEach((img: string, j: number) => {
                        lines.push(`  - ${_aiT('field_image_n', { n: j + 1 })}`);
                        if (img.startsWith('data:image/')) {
                            lines.push(`  ![${_aiT('field_image_alt', { n: j + 1 })}](${img})`);
                        } else {
                            lines.push(`  ![${_aiT('field_image_alt', { n: j + 1 })}](${img})`);
                        }
                    });
                }
            }
            lines.push('');
        });

        const aiFileName = `${rbaseName}_${Date.now()}_aicmd.md`;
        const aiFilePath = path.join(this.reviewDir, aiFileName);
        fs.writeFileSync(aiFilePath, lines.join('\n'), 'utf-8');

        return {
            success: true,
            needsAi: validAnnotations.length,
            aiInstructionFile: aiFileName,
            aiInstructionFilePath: aiFilePath.replace(/\\/g, '/'),
            sourceFilePath,
            message: _aiT('generated', { n: validAnnotations.length })
        };
    }

    /**
     * 删除指定文件的所有批阅记录文件（批阅记录 + 批阅数据 JSON）
     */
    deleteReviewRecords(fileName: string, relPath?: string): { success: boolean; deleted: string[] } {
        if (!fs.existsSync(this.reviewDir)) { return { success: true, deleted: [] }; }
        const rbaseName = this.reviewBaseName(fileName, relPath);
        const allFiles = fs.readdirSync(this.reviewDir);
        const deleted: string[] = [];

        // 同时匹配新格式（带哈希）和旧格式（无哈希），确保向后兼容
        const ext = path.extname(fileName);
        const plainBase = path.basename(fileName).replace(ext, '');

        for (const f of allFiles) {
            const matchesNew = f.startsWith(`${rbaseName}_v`) && (f.includes('_record.') || f.includes('_data.'));
            const matchesOld = rbaseName !== plainBase && (f.startsWith(`批阅记录_${plainBase}_v`) || f.startsWith(`批阅数据_${plainBase}_v`));
            // 也兼容上一版命名：批阅记录_{rbaseName}_v
            const matchesPrev = f.startsWith(`批阅记录_${rbaseName}_v`) || f.startsWith(`批阅数据_${rbaseName}_v`)
                || f.startsWith(`批阅记录_${plainBase}_v`) || f.startsWith(`批阅数据_${plainBase}_v`);

            if (matchesNew || matchesOld || matchesPrev) {
                const fullPath = path.join(this.reviewDir, f);
                try {
                    fs.unlinkSync(fullPath);
                    deleted.push(f);
                } catch (e) {
console.error('删除批阅记录失败:', fullPath, e);
                }
            }
        }

        return { success: true, deleted };
    }

    /**
     * 读取 .review 目录中的批阅记录
     */
    getReviewRecords(fileName: string, relPath?: string): any[] {
        if (!fs.existsSync(this.reviewDir)) { return []; }
        const rbaseName = this.reviewBaseName(fileName, relPath);
        const ext = path.extname(fileName);
        const plainBase = path.basename(fileName).replace(ext, '');
        const allFiles = fs.readdirSync(this.reviewDir).filter(f => f.endsWith('.md') || f.endsWith('.mdc'));
        const records: any[] = [];

        for (const f of allFiles) {
            // 新格式：{rbaseName}_v{N}_record.md
            const matchesNew = f.startsWith(`${rbaseName}_v`) && f.includes('_record.');
            // 旧格式向后兼容：批阅记录_{baseName}_v{N}.md
            const matchesOld = f.startsWith(`批阅记录_${rbaseName}_v`) || (rbaseName !== plainBase && f.startsWith(`批阅记录_${plainBase}_v`));
            if (matchesNew || matchesOld) {
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
                    // 批阅记录生成时的源文件内容快照（用于打开时比对是否在关闭期间被外部修改）
                    rawMarkdown: annotationData ? annotationData.rawMarkdown : '',
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
     * @returns 相对于 .review 目录的图片路径
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
     * @param imagePaths 相对于 .review 目录的图片路径数组
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
            if (!imagePath || !imagePath.trim()) {
                return false;
            }
            const absolutePath = path.join(this.reviewDir, imagePath);
            if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
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
            blocks.push('%%FRONTMATTER%%\n' + frontmatterMatch[0].trimEnd());
            processedMarkdown = markdown.slice(frontmatterMatch[0].length);
        }

        const lines = processedMarkdown.split('\n');
        let current: string[] = [];
        let inCodeBlock = false;
        let codeBlockFenceCount = 0;
        let inHtmlBlock = false;
        let htmlBlockTag = '';
        let htmlBlockDepth = 0;
        let inList = false;
        let inListCodeBlock = false;
        let listCodeBlockFenceCount = 0;
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

            // 代码块围栏（支持不同长度的反引号围栏，结束围栏的反引号数 ≥ 开始围栏）
            const fenceMatch = !inHtmlBlock && line.trim().match(/^(`{3,})/);
            if (fenceMatch) {
                const fenceCount = fenceMatch[1].length;
                const isIndentedFence = /^\s+`/.test(line);
                if (inListCodeBlock) {
                    if (fenceCount >= listCodeBlockFenceCount && /^`{3,}\s*$/.test(line.trim())) {
                        current.push(line); inListCodeBlock = false; listCodeBlockFenceCount = 0;
                    } else {
                        current.push(line);
                    }
                    continue;
                }
                if (inList && isIndentedFence) {
                    current.push(line); inListCodeBlock = true; listCodeBlockFenceCount = fenceCount; continue;
                }
                if (inCodeBlock) {
                    if (fenceCount >= codeBlockFenceCount && /^`{3,}\s*$/.test(line.trim())) {
                        current.push(line); blocks.push(current.join('\n')); current = [];
                        inCodeBlock = false; codeBlockFenceCount = 0; inList = false;
                    } else {
                        current.push(line);
                    }
                    continue;
                } else {
                    if (current.length > 0) { blocks.push(current.join('\n')); current = []; }
                    inCodeBlock = true; codeBlockFenceCount = fenceCount; inList = false; current.push(line); continue;
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
        const match = fileName.match(/_v(\d+)(?:_|\.\w+$)/);
        return match ? parseInt(match[1]) : 1;
    }

    private extractDocVersionFromReview(content: string): string | null {
        const match = content.match(/\*\*源文件版本\*\*[：:]\s*(v[\d.]+)/i);
        return match ? match[1] : null;
    }

    private extractAnnotationsFromReview(content: string): { annotationCount: number; annotations: any[]; rawMarkdown: string } | null {
        const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
        if (!jsonMatch) { return null; }
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            return {
                annotationCount: parsed.annotationCount || (parsed.annotations ? parsed.annotations.length : 0),
                annotations: parsed.annotations || [],
                // 返回批阅记录生成时的源文件内容快照，用于打开时比对源文件是否在关闭期间被修改（思路 A）
                // 旧格式的批阅记录没有此字段，返回空串（打开时视为无法比对，降级到思路 B 或放行恢复）
                rawMarkdown: typeof parsed.rawMarkdown === 'string' ? parsed.rawMarkdown : ''
            };
        } catch (e) {
            return null;
        }
    }
}
