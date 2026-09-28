# 图表生成

粘贴 CSV 数据，用 ECharts 在浏览器本地渲染柱状 / 折线 / 饼图 / 散点图，支持标题与画布尺寸。

## 用途

- 快速把表格数据可视化成图表
- 切换图表类型对比同一份数据
- 导出 CSV 源数据复用

## 输入

| 字段   | 类型   | 约束                                           |
| ------ | ------ | ---------------------------------------------- |
| `text` | string | CSV 数据：第一行表头，后续行数据（留空用示例） |

CSV 格式示例：

```
类别,数量
苹果,10
香蕉,20
橙子,15
```

- 柱状 / 折线：第一列为类目轴，其余列为系列
- 饼图：第一列为扇区名，第二列为数值
- 散点：第一列为 x，第二列为 y

## 选项

| 选项 | 默认值 | 范围 / 约束                | 说明         |
| ---- | ------ | -------------------------- | ------------ |
| 类型 | `bar`  | bar / line / pie / scatter | 图表类型     |
| 标题 | （空） | 任意文本                   | 留空则无标题 |
| 宽度 | `600`  | 100–2000                   | 画布宽（px） |
| 高度 | `400`  | 100–2000                   | 画布高（px） |

## 输出

- 右侧预览区：ECharts 渲染的图表
- 复制 / 下载：CSV 数据文本（`.csv` 文件）

## 边界

- CSV 不足两行 / 少于两列 → 中文报错
- 尺寸越界 → 中文报错
- 空输入自动使用示例数据

## 示例

留空直接渲染示例水果销量柱状图；把「类型」切到 `pie` 即变成饼图。

## 数据流向

纯本地：ECharts 在浏览器内渲染，CSV 不上传服务器。

## 元信息

| 项       | 值                              |
| -------- | ------------------------------- |
| 全局编号 | #397                            |
| 域       | `random`                        |
| 大组     | `design`                        |
| 优先级   | P1                              |
| 可行性   | A（纯前端，echarts 动态导入）   |
| 模板     | T3（图表可视化预览）            |
| 依赖     | `echarts`（动态导入，独立分包） |

---

# Chart Generator (English)

Paste CSV data and render bar / line / pie / scatter charts locally with ECharts.

## Purpose

- Quick visualization of tabular data
- Switch chart types to compare the same data
- Export CSV source for reuse

## Input

| Field  | Type   | Constraint                                              |
| ------ | ------ | ------------------------------------------------------- |
| `text` | string | CSV: first row header, then data rows (empty = example) |

- Bar / line: first column = category axis, remaining columns = series
- Pie: first column = sector name, second = value
- Scatter: first column = x, second = y

## Options

| Option | Default | Constraint                 | Description        |
| ------ | ------- | -------------------------- | ------------------ |
| Type   | `bar`   | bar / line / pie / scatter | Chart type         |
| Title  | (empty) | any text                   | Empty = no title   |
| Width  | `600`   | 100–2000                   | Canvas width (px)  |
| Height | `400`   | 100–2000                   | Canvas height (px) |

## Output

- Right preview panel: ECharts-rendered chart
- Copy / download: CSV data (`.csv` file)

## Edge cases

- Fewer than 2 rows / fewer than 2 columns → Chinese error
- Out-of-range size → Chinese error
- Empty input falls back to example data

## Data flow

Fully local: ECharts renders in the browser; CSV is not uploaded.

## Meta

| Item        | Value                                |
| ----------- | ------------------------------------ |
| Global No.  | #397                                 |
| Category    | `random`                             |
| Group       | `design`                             |
| Priority    | P1                                   |
| Feasibility | A (frontend, echarts dynamic import) |
| Template    | T3 (chart preview)                   |
| Deps        | `echarts` (dynamic import)           |
