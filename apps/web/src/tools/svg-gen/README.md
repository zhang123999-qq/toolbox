# SVG 图案生成 svg-gen（#392）

## 用途 | Purpose

- 生成可直接复制使用的 SVG 背景图案代码。
- Generate ready-to-copy SVG background pattern code.

## 输入 | Input

- 文本框：保留，图案由选项决定，留空即可。
- Textarea: reserved; the pattern is driven by options, leave empty.

## 选项 | Options

| 选项             | 说明                                                                        | Option     | Description                           |
| ---------------- | --------------------------------------------------------------------------- | ---------- | ------------------------------------- |
| 图案类型 pattern | dots（点阵）/ lines（条纹）/ checker（棋盘格）/ waves（波浪）/ grid（网格） | Pattern    | dots / lines / checker / waves / grid |
| 宽度 width       | 默认 400，50–2000                                                           | Width      | default 400, 50–2000                  |
| 高度 height      | 默认 300，50–2000                                                           | Height     | default 300, 50–2000                  |
| 前景色 fgColor   | 默认 #333333                                                                | Foreground | default #333333                       |
| 背景色 bgColor   | 默认 #ffffff                                                                | Background | default #ffffff                       |
| 间距 spacing     | 默认 20，5–100                                                              | Spacing    | default 20, 5–100                     |

## 输出 | Output

- 完整 SVG 代码字符串（含 `<svg>` 根标签）。
- A full SVG code string (including the `<svg>` root).

## 限制 | Limits

- 颜色须为 `#rgb` / `#rrggbb`；尺寸 50–2000；间距 5–100；非法输入显示中文错误。
- Colors must be `#rgb` / `#rrggbb`; size 50–2000; spacing 5–100; invalid input shows a Chinese error.

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无第三方依赖。
- All computation happens locally in the browser; no network requests, no third-party deps.

## 示例 | Example

dots，400×300，间距 20 →

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <circle cx="10" cy="10" r="5" fill="#333333"/>
  ...
</svg>
```

## 元信息 | Meta

- 编号 #392 · category `random` · group `design` · 可行性 A · 纯前端 · deps: 无
