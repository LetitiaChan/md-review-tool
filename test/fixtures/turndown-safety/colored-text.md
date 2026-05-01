# Colored Text + Semantic Tags Fixture

## 颜色标记

普通文本 {color:red}红色文字{/color} 普通文本。

多色组合：{color:red}红{/color}、{color:green}绿{/color}、{color:blue}蓝{/color}。

颜色内含格式：{color:orange}**加粗橙色**{/color}，{color:purple}*斜体紫色*{/color}。

RGB 格式：{color:rgb(120, 80, 200)}自定义颜色{/color}。

## HTML 语义标签

### 下划线（`<u>`）

这是 <u>带下划线的文本</u>。

### 键盘输入（`<kbd>`）— V2 修复目标

按 <kbd>Ctrl</kbd>+<kbd>C</kbd> 复制，按 <kbd>Ctrl</kbd>+<kbd>V</kbd> 粘贴。

快捷键组合：<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd>。

### 高亮（`<mark>` → `==x==`）

这里有一段 ==高亮的文字== 需要保留。

### 下标/上标（`<sub>`/`<sup>` → `~x~`/`^x^`）

化学式：H~2~O、CO~2~、C~6~H~12~O~6~。

数学符号：a^2^ + b^2^ = c^2^，E = mc^2^。

### 插入（`<ins>` → `++x++`）

这是 ++新插入++ 的内容。

### 删除（`~~x~~`）

这是 ~~被删除~~ 的内容。

## 综合使用

结合使用：按 <kbd>Ctrl</kbd>+<kbd>{color:red}Delete{/color}</kbd> 删除文件，查看 <mark>日志</mark> 中的 ==警告== 信息。
