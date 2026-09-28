# 热力图

输入二维类目数值，用 ECharts 在浏览器本地渲染直角坐标系热力图，支持标题、画布尺寸与 PNG 导出。

## 用途

- 快速把「行 × 列」双类目数值可视化成颜色深浅矩阵
- 对比不同时段、不同分组之间的数值分布
- 导出 PNG 图片复用

## 输入

| 字段   | 类型   | 约束                                                      |
| ------ | ------ | --------------------------------------------------------- |
| `text` | string | 每行 `X类目, Y类目, 数值`（留空用示例，全角逗号自动归一） |

输入格式示例：

```
周一, 上午, 12
周一, 下午, 30
周二, 上午, 8
周二, 下午, 25
```

- X 轴类目、Y 轴类目均按**首次出现顺序**排列
- 同一个 (X类目, Y类目) 只能出现一次，重复数据点会中文报错

## 选项

| 选项 | 默认值 | 范围 / 约束 | 说明         |
| ---- | ------ | ----------- | ------------ |
| 标题 | （空） | 任意文本    | 留空则无标题 |
| 宽度 | `600`  | 100–2000    | 画布宽（px） |
| 高度 | `400`  | 100–2000    | 画布高（px） |

## 输出

- 右侧预览区：ECharts 渲染的热力图（含横向色阶条 `visualMap`，单元格数值标签）
- 「下载 PNG」按钮：以 2 倍像素比导出 `heatmap.png`（白底），图表未渲染时中文报错
- 复制 / 下载：数据文本（`.txt` 文件）

## 边界

- 空输入（无非空行）→ 中文报错「数据不能为空」
- 行不是恰好三列 / 类目为空 / 数值非有限数字 → 中文报错
- 重复的 (X类目, Y类目) 数据点 → 中文报错
- 尺寸越界 → 中文报错

## 示例

留空直接渲染示例「周一 / 周二 × 上午 / 下午」热力图；点「下载 PNG」可保存 2x 清晰度图片。

## 数据流向

纯本地：ECharts 在浏览器内渲染，数据不上传服务器。

## 元信息

| 项       | 值                              |
| -------- | ------------------------------- |
| 全局编号 | #671                            |
| 域       | `random`                        |
| 大组     | `design`                        |
| 优先级   | P1                              |
| 可行性   | A（纯前端，echarts 动态导入）   |
| 模板     | T3（图表可视化预览）            |
| 依赖     | `echarts`（动态导入，独立分包） |

---

# Heatmap (English)

Render ECharts heatmaps from two-dimensional category values locally, with title, canvas size and PNG export.

## Purpose

- Visualize two-category numeric data as a color-intensity matrix
- Compare value distributions across time slots or groups
- Export PNG images for reuse

## Input

| Field  | Type   | Constraint                                                                 |
| ------ | ------ | -------------------------------------------------------------------------- |
| `text` | string | One `X, Y, value` per line (empty = example; full-width commas normalized) |

- Categories on both axes are ordered by first appearance
- Each (X, Y) pair may appear only once; duplicates raise a Chinese error

## Options

| Option | Default | Constraint | Description        |
| ------ | ------- | ---------- | ------------------ |
| Title  | (empty) | any text   | Empty = no title   |
| Width  | `600`   | 100–2000   | Canvas width (px)  |
| Height | `400`   | 100–2000   | Canvas height (px) |

## Output

- Right preview panel: ECharts heatmap with a horizontal visualMap and value labels
- "下载 PNG" button: exports `heatmap.png` at 2x pixel ratio on a white background
- Copy / download: data text (`.txt` file)

## Edge cases

- Empty input → Chinese error
- Wrong column count / empty category / non-finite value → Chinese error
- Duplicate (X, Y) point → Chinese error
- Out-of-range size → Chinese error

## Data flow

Fully local: ECharts renders in the browser; data is not uploaded.

## Meta

| Item        | Value                                |
| ----------- | ------------------------------------ |
| Global No.  | #671                                 |
| Category    | `random`                             |
| Group       | `design`                             |
| Priority    | P1                                   |
| Feasibility | A (frontend, echarts dynamic import) |
| Template    | T3 (chart preview)                   |
| Deps        | `echarts` (dynamic import)           |
