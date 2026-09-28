# 调色板导出 palette（#390）

## 用途 | Purpose

- 按基础色生成一组和谐色板，并直接导出为可粘贴进项目的代码（CSS 变量 / SCSS 变量 / JSON / Tailwind 配置）。
- Generate a harmonious palette from a base color and export it as ready-to-paste code (CSS variables / SCSS variables / JSON / Tailwind config).

## 输入 | Input

- 文本框：基础色（可选）。留空则随机生成基础色。
- 支持 `#rgb` / `#rrggbb` / CSS 颜色名（如 `rebeccapurple`）。
- Textarea: base color (optional). Leave empty for a random base color.
- Supports `#rgb` / `#rrggbb` / CSS color names.

## 选项 | Options

| 选项            | 说明                                                                                                       | Option        | Description                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| 模式 mode       | random / monochromatic / analogous / complementary / triadic / split-complementary / tetradic，默认 random | Harmony mode  | random / monochromatic / analogous / complementary / triadic / split-complementary / tetradic |
| 数量 count      | 1–20 的整数，默认 5                                                                                        | Color count   | Integer 1–20, defaults to 5                                                                   |
| 导出格式 format | css / scss / json / tailwind，默认 css                                                                     | Export format | css / scss / json / tailwind, defaults to css                                                 |

## 输出 | Output

- `css`：`:root { --color-1: #xxx; ... }`
- `scss`：`$color-1: #xxx;`
- `json`：`["#xxx", ...]`
- `tailwind`：`colors: { palette: { 1: '#xxx' } }`

## 限制 | Limits

- 数量上限 20；非法颜色 / 模式 / 数量 / 格式会显示中文错误提示。
- 配色基于 Oklch 色彩空间（经 `culori` 转换）。
- Count capped at 20; invalid color / mode / count / format shows a Chinese error.
- Colors computed in Oklch (via `culori`).

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求；依赖 `culori`（本地 npm 包）。
- All computation happens locally; no network requests. Depends on `culori`.

## 示例 | Example

输入 `#3b82f6`，类似色，3 色，css 格式 →

```css
:root {
  --color-1: #4d6df2;
  --color-2: #3b82f6;
  --color-3: #388efb;
}
```

（实际值随机）

## 元信息 | Meta

- 编号 #390 · category `random` · group `design` · 优先级 P0 · 可行性 A · 纯前端 · deps: `culori`
