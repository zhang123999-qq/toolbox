# Blob 形状生成 blob-gen（#393）

## 用途 | Purpose

- 用贝塞尔曲线生成随机有机 blob 形状，可导出 SVG。
- Generate random organic blob shapes with bezier curves, exportable as SVG.

## 输入 | Input

- 文本框：种子文本（可选）。相同种子 + 参数生成相同形状；留空则随机。
- Textarea: seed text (optional). Same seed + options produce the same shape; leave empty for random.

## 选项 | Options

| 选项                 | 说明                     | Option       | Description                    |
| -------------------- | ------------------------ | ------------ | ------------------------------ |
| 复杂度 complexity    | 控制点数量 3–12，默认 5  | Complexity   | 3–12 control points, default 5 |
| 平滑度 smoothness    | 曲率 0–1，默认 0.5       | Smoothness   | curvature 0–1, default 0.5     |
| 填充色 fillColor     | #rgb / #rrggbb，留空随机 | Fill         | leave empty for random         |
| 描边色 strokeColor   | 默认 #333333             | Stroke       | default #333333                |
| 描边宽度 strokeWidth | 0–20，默认 0             | Stroke width | 0–20, default 0                |

## 输出 | Output

- 左侧实时渲染 SVG；复制 / 下载得到 `.svg` 源码。
- Live SVG preview; copy / download gives the `.svg` source.

## 限制 | Limits

- 颜色须为 `#rgb` / `#rrggbb`；复杂度 3–12；平滑度 0–1；描边宽度 0–20；非法输入显示中文错误。
- Colors must be `#rgb` / `#rrggbb`; complexity 3–12; smoothness 0–1; stroke width 0–20; invalid input shows a Chinese error.

## 数据流向 | Data flow

- 全部在浏览器本地计算，无网络请求、无第三方依赖。
- All computation happens locally in the browser; no network requests, no third-party deps.

## 示例 | Example

复杂度 5，平滑度 0.5，填充留空（随机）→ 一段闭合 `Q` 曲线路径的 `<svg>`。

## 元信息 | Meta

- 编号 #393 · category `random` · group `design` · 可行性 A · 模板 T3 · deps: 无
