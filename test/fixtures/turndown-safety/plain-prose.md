# Plain Prose Fixture

## 测试点 1 — 含 Markdown 特殊字符的正文

使用 * 作为重点符号，使用 _ 作为强调，# 表示标题层级，| 作为分隔符。

路径示例：`C:\Users\letichen\Documents\file.md` —— 反斜杠必须保留为单个反斜杠。

数学货币：价格 $9.99，折后 $7.50。

## 测试点 2 — 不含任何格式化的纯段落

这是第一段。这里有一个中文句号。End of sentence.

这是第二段。这里有一个 English period. 结束。

## 测试点 3 — 已带反斜杠的字符

用户在 markdown 源文件中手写 \* literal asterisk \* 时，保存后这些反斜杠应保留而非被双写。
