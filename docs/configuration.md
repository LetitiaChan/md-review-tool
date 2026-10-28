# Configuration / 配置项

All settings live under the `mdReview` namespace in VS Code settings.
所有配置项位于 VS Code 设置的 `mdReview` 命名空间下。

## Appearance / 外观

| Setting | Type | Default | Description / 说明 |
|---|---|---|---|
| `mdReview.theme` | string | `"light"` | UI theme: `light` / `dark` / `auto` · 界面主题 |
| `mdReview.fontSize` | number | `16` | Body font size, 12–24 px · 正文字体大小 |
| `mdReview.lineHeight` | number | `1.6` | Body line height, 1.2–2.4 · 正文行高 |
| `mdReview.contentMaxWidth` | number | `1100` | Max content width, 600–1800 px · 内容区最大宽度 |
| `mdReview.fontFamily` | string | `""` | Body font family (empty = system) · 正文字体 |
| `mdReview.codeFontFamily` | string | `""` | Code font family (empty = monospace) · 代码字体 |
| `mdReview.documentAlign` | string | `"center"` | `left` / `center` / `right` · 文档对齐方式 |
| `mdReview.customCss` | string | `""` | Extra CSS injected into the preview · 预览附加 CSS |

## Layout / 布局

| Setting | Type | Default | Description / 说明 |
|---|---|---|---|
| `mdReview.showToc` | boolean | `true` | Show the TOC panel by default · 默认显示目录 |
| `mdReview.showAnnotations` | boolean | `true` | Show the annotations panel by default · 默认显示批注面板 |
| `mdReview.sidebarLayout` | string | `"toc-left"` | `toc-left` / `toc-right` · 目录位置 |
| `mdReview.panelMode` | string | `"embedded"` | `floating` / `embedded` · 面板显示模式 |
| `mdReview.showLineNumbers` | boolean | `false` | Line numbers in code blocks · 代码块行号 |

## Rendering / 渲染

| Setting | Type | Default | Description / 说明 |
|---|---|---|---|
| `mdReview.enableMermaid` | boolean | `true` | Mermaid diagrams · Mermaid 图表 |
| `mdReview.enableMath` | boolean | `true` | KaTeX math · 数学公式 |
| `mdReview.enablePlantUML` | boolean | `true` | PlantUML (online server, needs network) · 在线渲染，需要网络 |
| `mdReview.enableGraphviz` | boolean | `true` | Graphviz / DOT (local Viz.js) · 本地渲染 |
| `mdReview.codeTheme` | string | `"default-dark-modern"` | One of 15 code themes · 15 种代码主题 |
| `mdReview.imageAssetsPath` | string | `"assets/images"` | Directory used when saving pasted images · 粘贴图片的保存目录 |

Code themes: `auto`, `github`, `github-dark`, `monokai`, `vs2015`, `atom-one-dark`, `atom-one-light`, `dracula`, `nord`, `solarized-light`, `solarized-dark`, `tokyo-night`, `one-dark-pro`, `default-light-modern`, `default-dark-modern`.

## Storage & language / 存储与语言

| Setting | Type | Default | Description / 说明 |
|---|---|---|---|
| `mdReview.autoSave` | boolean | `true` | Auto-save annotations · 自动保存批注 |
| `mdReview.autoSaveDelay` | number | `1500` | Delay in ms, 500–10000 · 自动保存延迟 |
| `mdReview.language` | string | `"zh-CN"` | `zh-CN` / `en` · 界面语言 |

## Example / 示例

```jsonc
{
  "mdReview.theme": "auto",
  "mdReview.fontSize": 17,
  "mdReview.lineHeight": 1.75,
  "mdReview.codeTheme": "tokyo-night",
  "mdReview.sidebarLayout": "toc-right",
  "mdReview.enablePlantUML": false
}
```

Back to [README](../README.md).
