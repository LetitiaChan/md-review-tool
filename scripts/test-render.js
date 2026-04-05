/**
 * 自动化 Webview JS 渲染测试
 * 模拟浏览器环境，检测 JS 文件是否可以正确加载和执行
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const webviewDir = path.join(__dirname, '..', 'webview');
const jsDir = path.join(webviewDir, 'js');

let allPassed = true;
const results = [];

function log(status, msg) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${msg}`);
    results.push({ status, msg });
    if (status === 'FAIL') allPassed = false;
}

// Test 1: 所有 JS 文件语法检查
console.log('\n=== Test 1: JS 语法检查 ===');
const jsFiles = ['store.js', 'renderer.js', 'annotations.js', 'export.js', 'settings.js', 'app.js'];
for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    if (!fs.existsSync(filePath)) {
        log('FAIL', `${file}: 文件不存在`);
        continue;
    }
    const code = fs.readFileSync(filePath, 'utf-8');
    try {
        new vm.Script(code, { filename: file });
        log('PASS', `${file}: 语法正确`);
    } catch (e) {
        log('FAIL', `${file}: 语法错误 - ${e.message}`);
    }
}

// Test 2: index.html 中的元素 ID 与 JS getElementById 匹配检查
console.log('\n=== Test 2: HTML 元素 ID 匹配检查 ===');
const htmlContent = fs.readFileSync(path.join(webviewDir, 'index.html'), 'utf-8');

// 提取 HTML 中所有 id="xxx" 的值
const htmlIds = new Set();
const idRegex = /\bid=["']([^"']+)["']/g;
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
    htmlIds.add(match[1]);
}

// 提取 JS 中所有 getElementById('xxx') 的调用
const appJs = fs.readFileSync(path.join(jsDir, 'app.js'), 'utf-8');
const settingsJs = fs.readFileSync(path.join(jsDir, 'settings.js'), 'utf-8');
const allJs = appJs + '\n' + settingsJs;

const getByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const jsIdCalls = new Map(); // id -> [files]

while ((match = getByIdRegex.exec(allJs)) !== null) {
    const id = match[1];
    const pos = match.index;
    // 检查是否在 app.js 范围内
    const inApp = pos < appJs.length;
    const file = inApp ? 'app.js' : 'settings.js';
    if (!jsIdCalls.has(id)) jsIdCalls.set(id, []);
    jsIdCalls.get(id).push(file);
}

// 找出 JS 引用但 HTML 中不存在的 ID
const missingIds = [];
for (const [id, files] of jsIdCalls) {
    if (!htmlIds.has(id)) {
        // 动态创建的元素（如 _toast, _editModeTips, btnCopyAiInstruction）排除
        if (id.startsWith('_') || id === 'btnCopyAiInstruction') continue;
        missingIds.push({ id, files: [...new Set(files)] });
    }
}

if (missingIds.length === 0) {
    log('PASS', '所有 getElementById 引用的 ID 在 HTML 中都存在');
} else {
    for (const { id, files } of missingIds) {
        log('FAIL', `ID "${id}" 在 ${files.join(', ')} 中被引用，但 HTML 中不存在！`);
    }
}

// Test 3: 检测 app.js 中 bindEvents() 里的 addEventListener 调用
// 关键：如果 getElementById 返回 null 且直接调用 .addEventListener，会崩溃
console.log('\n=== Test 3: 危险的 null.addEventListener 检测 ===');

// 找出直接 getElementById(xxx).addEventListener 的模式（无 null 检查）
const dangerPattern = /document\.getElementById\(['"]([^'"]+)['"]\)\.addEventListener/g;
const dangerCalls = [];
let dangerMatch;

// 重置并检查 app.js
const appLines = appJs.split('\n');
for (let i = 0; i < appLines.length; i++) {
    const line = appLines[i];
    dangerPattern.lastIndex = 0;
    while ((dangerMatch = dangerPattern.exec(line)) !== null) {
        const id = dangerMatch[1];
        if (!htmlIds.has(id)) {
            dangerCalls.push({ id, file: 'app.js', line: i + 1 });
        }
    }
}

// 检查 settings.js
const settingsLines = settingsJs.split('\n');
for (let i = 0; i < settingsLines.length; i++) {
    const line = settingsLines[i];
    dangerPattern.lastIndex = 0;
    while ((dangerMatch = dangerPattern.exec(line)) !== null) {
        const id = dangerMatch[1];
        if (!htmlIds.has(id)) {
            dangerCalls.push({ id, file: 'settings.js', line: i + 1 });
        }
    }
}

if (dangerCalls.length === 0) {
    log('PASS', '没有检测到对不存在元素直接调用 addEventListener 的危险代码');
} else {
    for (const { id, file, line } of dangerCalls) {
        log('FAIL', `${file}:${line} - getElementById("${id}").addEventListener 会崩溃！ID 在 HTML 中不存在`);
    }
}

// Test 4: 检查 HTML div 标签平衡
console.log('\n=== Test 4: HTML 标签平衡 ===');
const divOpens = (htmlContent.match(/<div[\s>]/gi) || []).length;
const divCloses = (htmlContent.match(/<\/div>/gi) || []).length;
if (divOpens === divCloses) {
    log('PASS', `div 标签平衡: ${divOpens} 开 = ${divCloses} 关`);
} else {
    log('FAIL', `div 标签不平衡: ${divOpens} 开 ≠ ${divCloses} 关 (差值: ${divOpens - divCloses})`);
}

// Test 5: 检查 settings.js 中引用的 CSS 类名是否在 JS 中对应 HTML 元素
console.log('\n=== Test 5: Settings 按钮选择器检查 ===');
const selectorPatterns = [
    { selector: '.panel-mode-btn', desc: '面板模式按钮' },
    { selector: '.doc-align-btn', desc: '文档对齐按钮' },
    { selector: '.sidebar-layout-btn', desc: '侧边栏布局按钮' },
    { selector: '.theme-btn', desc: '主题按钮' },
    { selector: '.font-btn', desc: '字体按钮' },
];
for (const { selector, desc } of selectorPatterns) {
    const className = selector.replace('.', '');
    const inHtml = htmlContent.includes(`class="${className}`) || htmlContent.includes(`class="${className} `);
    const inSettings = settingsJs.includes(`'${selector}'`) || settingsJs.includes(`"${selector}"`);
    if (inSettings && !inHtml) {
        log('FAIL', `${desc}: settings.js 使用选择器 ${selector}，但 HTML 中找不到该 class`);
    } else if (inSettings && inHtml) {
        log('PASS', `${desc}: 选择器 ${selector} 在 HTML 和 settings.js 中匹配`);
    }
}

// Test 6: 检查 settings.js 的 DEFAULTS 对象中的新字段
console.log('\n=== Test 6: Settings DEFAULTS 一致性 ===');
const defaultsMatch = settingsJs.match(/const DEFAULTS = \{([^}]+)\}/s);
if (defaultsMatch) {
    const defaultsBlock = defaultsMatch[1];
    const defaultKeys = [];
    const keyRegex = /(\w+)\s*:/g;
    let km;
    while ((km = keyRegex.exec(defaultsBlock)) !== null) {
        defaultKeys.push(km[1]);
    }
    
    // 检查 applyToDOM 中是否使用了这些字段
    const missingInApply = [];
    for (const key of ['panelMode', 'documentAlign']) {
        if (!defaultKeys.includes(key)) {
            log('FAIL', `DEFAULTS 缺少字段: ${key}`);
        } else if (!settingsJs.includes(`currentSettings.${key}`)) {
            log('FAIL', `DEFAULTS 有 ${key}，但 applyToDOM/bindEvents 中未使用`);
        } else {
            log('PASS', `字段 ${key}: DEFAULTS ✓ 使用 ✓`);
        }
    }
}

// Test 7: 检查 app.js 中编辑保存后是否调用 renderMathAndMermaid
console.log('\n=== Test 7: 编辑后重渲染检查 ===');
const hasRenderAfterSave = appJs.includes('renderMathAndMermaid()') && 
    appJs.indexOf('renderMathAndMermaid()', appJs.indexOf("updateEditStatus('saved'")) > 0;
// 更精确：在 handleSaveMd 函数中查找
const handleSaveMdMatch = appJs.match(/async function handleSaveMd[\s\S]*?^    \}/m);
if (handleSaveMdMatch) {
    const fnBody = handleSaveMdMatch[0];
    if (fnBody.includes('renderMathAndMermaid')) {
        log('PASS', 'handleSaveMd 中包含 renderMathAndMermaid() 调用');
    } else {
        log('WARN', 'handleSaveMd 中未找到 renderMathAndMermaid() 调用（编辑后公式可能丢失）');
    }
} else {
    log('WARN', '未能匹配 handleSaveMd 函数体');
}

// Summary
console.log('\n========== 测试结果汇总 ==========');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
const warned = results.filter(r => r.status === 'WARN').length;
console.log(`通过: ${passed}  失败: ${failed}  警告: ${warned}`);
console.log(allPassed ? '\n✅ 全部通过！' : '\n❌ 有测试失败，需要修复！');
process.exit(allPassed ? 0 : 1);
