# 雷达图

输入多系列多指标数据，用 ECharts 在浏览器本地渲染雷达图，支持标题、画布尺寸与 PNG 导出。

## 用途

- 多产品 / 多方案在多个维度上的对比可视化
- 能力画像、竞品分析等场景的雷达图展示
- 导出 PNG 图片用于文档、演示

## 输入

| 字段      | 类型   | 约束                                                                   |
| --------- | ------ | ---------------------------------------------------------------------- |
| `text`    | string | 数据行：每行一个系列，格式 `系列名, 指标1:值, 指标2:值…`（留空用示例） |
| `maxText` | string | 指标最大值：格式 `指标1:最大值, 指标2:最大值…`（留空用示例）           |

数据行格式示例：

```
产品A, 速度:80, 力量:65, 耐力:90
产品B, 速度:60, 力量:85, 耐力:70
```

指标最大值格式示例：

```
速度:100, 力量:100, 耐力:100
```

- 全角标点（`：`、`，`）会自动归一为半角，无需手动替换
- 每个系列必须给出全部指标的值（顺序不限），数值范围 0–该指标的最大值
- 系列名不可重复；指标名不可重复

## 选项

| 选项 | 默认值 | 范围 / 约束 | 说明         |
| ---- | ------ | ----------- | ------------ |
| 标题 | （空） | 任意文本    | 留空则无标题 |
| 宽度 | `600`  | 100–2000    | 画布宽（px） |
| 高度 | `400`  | 100–2000    | 画布高（px） |

## 输出

- 右侧预览区：ECharts 渲染的雷达图（图例在底部）
- 「下载 PNG」：导出 2x 像素比的 PNG 图片（白底）
- 复制 / 下载：数据行文本（`.txt` 文件）

## 边界

- 指标最大值为空 → 中文报错
- 指标单元缺冒号 / 指标名为空 / 指标重复 / 最大值不是大于 0 的数字 → 中文报错
- 数据行出现空行 → 中文报错
- 数据行少于两个单元 / 单元缺冒号 → 中文报错
- 系列名重复 → 中文报错
- 数据行引用了指标最大值中不存在的指标 → 中文报错
- 系列内同一指标出现两次 → 中文报错
- 指标值不是数字 / 小于 0 / 大于该指标最大值 → 中文报错
- 系列缺少某个指标 → 中文报错
- 尺寸越界 → 中文报错
- 空输入自动使用示例数据与示例指标最大值

## 示例

留空直接渲染示例「产品A / 产品B」三维雷达图；改「指标最大值」输入框可调整各轴刻度上限。

## 数据流向

纯本地：ECharts 在浏览器内渲染，数据不上传服务器。

## 元信息

| 项       | 值                              |
| -------- | ------------------------------- |
| 全局编号 | #670                            |
| 域       | `random`                        |
| 大组     | `design`                        |
| 优先级   | P1                              |
| 可行性   | A（纯前端，echarts 动态导入）   |
| 模板     | T3（图表可视化预览）            |
| 依赖     | `echarts`（动态导入，独立分包） |

---

# Radar Chart (English)

Enter multi-series, multi-indicator data and render a radar chart locally with ECharts.

## Purpose

- Compare multiple products / options across several dimensions
- Skill profiles, competitive analysis, and similar radar visualizations
- Export a PNG image for documents and presentations

## Input

| Field     | Type   | Constraint                                                                                     |
| --------- | ------ | ---------------------------------------------------------------------------------------------- |
| `text`    | string | Data rows: one series per row, `Series, Indicator1:value, Indicator2:value…` (empty = example) |
| `maxText` | string | Indicator maxima: `Indicator1:max, Indicator2:max…` (empty = example)                          |

- Full-width punctuation (`：`, `，`) is normalized automatically
- Every series must provide all indicators (any order); values must be within 0–max
- Series names and indicator names must be unique

## Options

| Option | Default | Constraint | Description        |
| ------ | ------- | ---------- | ------------------ |
| Title  | (empty) | any text   | Empty = no title   |
| Width  | `600`   | 100–2000   | Canvas width (px)  |
| Height | `400`   | 100–2000   | Canvas height (px) |

## Output

- Right preview panel: ECharts-rendered radar chart (legend at bottom)
- "下载 PNG" button: exports a 2x pixel-ratio PNG (white background)
- Copy / download: data row text (`.txt` file)

## Edge cases

- Empty indicator maxima → Chinese error
- Malformed indicator units / duplicate names / non-positive maxima → Chinese error
- Blank data rows, malformed rows, duplicate series names → Chinese error
- Unknown indicators, duplicated indicators within a series → Chinese error
- Non-numeric or out-of-range values, missing indicators → Chinese error
- Out-of-range size → Chinese error
- Empty input falls back to example data and example maxima

## Data flow

Fully local: ECharts renders in the browser; data is not uploaded.

## Meta

| Item        | Value                                |
| ----------- | ------------------------------------ |
| Global No.  | #670                                 |
| Category    | `random`                             |
| Group       | `design`                             |
| Priority    | P1                                   |
| Feasibility | A (frontend, echarts dynamic import) |
| Template    | T3 (chart preview)                   |
| Deps        | `echarts` (dynamic import)           |
