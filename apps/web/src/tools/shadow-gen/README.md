# 阴影生成 shadow-gen（#389）

## 用途 | Purpose

- 生成 CSS `box-shadow` 代码，支持柔和 / 彩色 / 霓虹 / 内阴影与多层叠加。
- Generate CSS `box-shadow` code with soft / colored / neon / inset styles and multiple layers.

## 输入 | Input

- 文本框：基础色（可选）。彩色 / 霓虹样式作为发光色使用。
- Textarea: base color (optional). Used as the glow color for colored / neon styles.

## 选项 | Options

| 选项             | 说明                                                         | Option   | Description                   |
| ---------------- | ------------------------------------------------------------ | -------- | ----------------------------- |
| 层数 layers      | 1–5，默认 1；多层时偏移/模糊逐层递增                         | Layers   | 1–5, default 1                |
| 水平偏移 offsetX | -50–50，默认 0                                               | Offset X | -50–50, default 0             |
| 垂直偏移 offsetY | -50–50，默认 10                                              | Offset Y | -50–50, default 10            |
| 模糊半径 blur    | 0–100，默认 20                                               | Blur     | 0–100, default 20             |
| 扩散半径 spread  | -30–30，默认 0                                               | Spread   | -30–30, default 0             |
| 阴影颜色 color   | 默认 rgba(0,0,0,0.15)                                        | Color    | default rgba(0,0,0,0.15)      |
| 样式 style       | soft（柔和）/ colored（彩色）/ neon（霓虹）/ inset（内阴影） | Style    | soft / colored / neon / inset |

## 输出 | Output

- 完整 CSS：`.shadow { box-shadow: ...; }`。
- Full CSS wrapped in `.shadow { box-shadow: ...; }`.

## 限制 | Limits

- 数值须落在上述区间；颜色须为 HEX / rgb() / 命名色；非法输入显示中文错误。
- Numeric options must stay in range; colors must be HEX / rgb() / named; invalid input shows a Chinese error.

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无第三方依赖。
- All computation happens locally in the browser; no network requests, no third-party deps.

## 示例 | Example

层数 2，偏移 0/10，模糊 20，样式 soft →

```css
.shadow {
  box-shadow:
    0px 10px 20px 0px rgba(0, 0, 0, 0.15),
    0px 20px 40px 0px rgba(0, 0, 0, 0.15);
}
```

## 元信息 | Meta

- 编号 #389 · category `random` · group `design` · 可行性 A · 纯前端 · deps: 无
