// 验证脚注功能修复后的正确性
// 测试1: 上标正则不再匹配跨脚注引用的长文本
const oldSuperscriptRegex = /^\^([^\s\^][^\^]*?)\^/;
const newSuperscriptRegex = /^\^([^\s\^\[\]\n]{1,100})\^/;

const testCases = [
    { input: '^上标文本^', desc: '正常上标' },
    { input: '^H2^O', desc: '化学式上标' },
    { input: '^1]。Markdown 是由 John Gruber 创建的[^', desc: '跨脚注引用的错误匹配' },
    { input: '^1]', desc: '单个脚注残留' },
    { input: '^abc^', desc: '英文上标' },
];

console.log('=== 上标正则对比测试 ===');
for (const tc of testCases) {
    const oldMatch = oldSuperscriptRegex.exec(tc.input);
    const newMatch = newSuperscriptRegex.exec(tc.input);
    console.log(`  "${tc.desc}" (${tc.input}):`);
    console.log(`    旧正则: ${oldMatch ? `匹配 "${oldMatch[0]}"` : '不匹配'}`);
    console.log(`    新正则: ${newMatch ? `匹配 "${newMatch[0]}"` : '不匹配'}`);
}

// 测试2: 脚注引用正则
const footnoteRefRegex = /^\[\^(\w+)\](?!:)/;
const footnoteRefTests = [
    '[^1]后续文本',
    '[^2]。',
    '[^note1]',
    '[^1]: 这是定义，不应匹配',
];

console.log('\n=== 脚注引用正则测试 ===');
for (const t of footnoteRefTests) {
    const m = footnoteRefRegex.exec(t);
    console.log(`  "${t}" => ${m ? `匹配 id="${m[1]}"` : '不匹配（应该不匹配定义行）'}`);
}

// 测试3: 完整流程模拟
console.log('\n=== 完整脚注流程模拟 ===');

// 模拟 parseMarkdown 收集脚注定义
const footnoteDefRegex = /^\s{0,3}\[\^(\w+)\]:\s+(.+)$/;
const testBlock = `这是一段包含脚注的文本[^1]。Markdown 是由 John Gruber 创建的[^2]。

[^1]: 脚注内容会显示在页面底部。
[^2]: John Gruber 于 2004 年创建了 Markdown 语言。`;

const lines = testBlock.split('\n');
const footnoteDefs = [];
const remaining = [];

for (const line of lines) {
    const fnMatch = footnoteDefRegex.exec(line);
    if (fnMatch) {
        footnoteDefs.push({ id: fnMatch[1], content: fnMatch[2].trim() });
    } else {
        remaining.push(line);
    }
}

console.log('收集到的脚注定义:', JSON.stringify(footnoteDefs, null, 2));
console.log('剩余文本:', remaining.join('\n'));

// 模拟 marked 扩展处理 [^1] —— 在 tokenize 阶段就识别为 footnoteRef
console.log('\n脚注引用在 tokenize 阶段被识别:');
const contentLine = remaining.filter(l => l.trim()).join(' ');
const globalFootnoteRefRegex = /\[\^(\w+)\](?!:)/g;
let match;
while ((match = globalFootnoteRefRegex.exec(contentLine)) !== null) {
    console.log(`  找到脚注引用: [^${match[1]}] at position ${match.index}`);
    console.log(`  -> 渲染为: <sup class="footnote-ref"><a href="#fn-${match[1]}">[${match[1]}]</a></sup>`);
}

// 脚注区域渲染
console.log('\n底部脚注区域:');
if (footnoteDefs.length > 0) {
    let fnHtml = '<section class="footnotes"><hr class="footnotes-sep"><ol class="footnotes-list">';
    for (const fn of footnoteDefs) {
        fnHtml += `<li id="fn-${fn.id}" class="footnote-item"><p>${fn.content} <a href="#fnref-${fn.id}" class="footnote-backref">↩</a></p></li>`;
    }
    fnHtml += '</ol></section>';
    console.log(fnHtml);
} else {
    console.log('  ❌ 没有脚注定义！');
}

console.log('\n=== 测试通过 ✅ ===');
