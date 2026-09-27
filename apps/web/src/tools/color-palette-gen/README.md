# 随机颜色板 color-palette-gen（#418）

## 用途 | Purpose

- 生成一组和谐的 HEX 颜色码，供 UI 设计、海报配色、品牌调色参考。
- Generate a harmonious set of HEX colors for UI design, posters, or brand palettes.

## 输入 | Input

- 文本框：基础色（可选）。留空则随机生成基础色。
- 支持 `#rgb` / `#rrggbb` / CSS 颜色名（如 `rebeccapurple`）。
- Textarea: base color (optional). Leave empty for a random base color.
- Supports `#rgb` / `#rrggbb` / CSS color names (e.g. `rebeccapurple`).

## 选项 | Options

| 选项           | 说明                                                                                                                                                    | Option       | Description                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| 配色模式 mode  | random（随机）/ monochromatic（单色）/ analogous（类似）/ complementary（互补）/ triadic（三角色）/ split-complementary（分裂互补）/ tetradic（四角色） | Harmony mode | random / monochromatic / analogous / complementary / triadic / split-complementary / tetradic |
| 颜色数量 count | 1–20 的整数                                                                                                                                             | Color count  | Integer 1–20                                                                                  |

## 输出 | Output

- 每行一个 `#rrggbb` HEX 颜色码。
- One `#rrggbb` HEX color code per line.

## 限制 | Limits

- 数量上限 20；非法颜色 / 模式 / 数量会显示错误提示。
- 配色基于 Oklch 色彩空间（经 `culori` 转换），保证感知均匀性。

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求；依赖 `culori`（本地 npm 包）。
- All computation happens locally in the browser; no network requests. Depends on the `culori` npm package (bundled locally).

## 示例 | Example

输入：`#3b82f6`，类似色，3 色 →

```
#4d6df2
#3b82f6
#388efb
```

（实际值随机）

## 元信息 | Meta

- 编号 #418 · category `random` · group `design` · 可行性 A · 纯前端 · deps: `culori`
