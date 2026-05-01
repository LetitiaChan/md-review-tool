# Fenced Codes Fixture

## TypeScript

```typescript
function greet(name: string): string {
    return `Hello, ${name}!`;
}

// 注释：不应被 turndown 破坏
const user = greet('World');
```

## Python

```python
def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# 反斜杠测试：path = "C:\\Users\\foo"
```

## JSON（特殊字符）

```json
{
  "name": "测试",
  "path": "C:\\Users\\file.md",
  "markers": ["*", "_", "#", "|", "$"]
}
```

## 无语言标记的代码块

```
plain text block
line 2
  indented line
```

## 行内代码混用

使用 `npm install` 命令，然后运行 `npm test` 即可。

反引号逃逸：`` `inner backticks` `` 应完整保留。
