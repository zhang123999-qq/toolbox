# 统计图表

粘贴数字或 CSV 数据（每行一个数据点），生成柱状图 / 折线图 / 饼图，并输出个数、总和、平均数、最小值、最大值汇总。图表由 echarts（SVG 渲染）绘制，纯本地计算。

与「文本统计图」（text-stats）的区别：text-stats 统计的是文本的词频 / 长度分布；本工具处理的是数值型数据，图表类型可在柱 / 线 / 饼之间切换。

## 用途

- 把一列数字快速可视化（销量、成绩、耗时…）
- 对比带标签的分类数据（`一月,120` 这类 CSV 行）
- 复制 / 下载汇总统计文本

## 输入

| 字段   | 类型   | 约束                                          |
| ------ | ------ | --------------------------------------------- |
| `text` | string | 数字或 CSV，每行一个数据点；最大 200,000 字符 |

数据格式：

```text
一月,120
二月,200
三月,150
```

或纯数字（空格 / 逗号 / 分号 / 制表符分隔，一行可写多个）：

```text
10 20 30 40 50
```

- `标签,数值`：标签为非数字、数值为数字时识别为带标签数据点
- 空行自动跳过

## 输出

- 图表区：echarts 绘制的柱状图 / 折线图 / 饼图
- 汇总区：数据个数、总和、平均数、最小值、最大值
- 复制 / 下载：汇总文本

## 选项

| 选项     | 取值                  | 说明                   |
| -------- | --------------------- | ---------------------- |
| 图表类型 | bar / line / pie      | 柱状图 / 折线图 / 饼图 |
| 小数位数 | 0 / 1 / 2 / 4 / 6 / 8 | 汇总数字保留小数位数   |

## 边界

- 空输入 → 显示空提示，不报错
- 非数字行 → 双语报错并带行号（如「第 2 行不是有效数据：abc」）
- 单数据点 → 正常出图
- 负数 → 正常参与统计与绘图
- 输入 > 200,000 字符 → 报错

## 示例

输入：

```text
一月,120
二月,200
三月,150
四月,80
五月,170
```

输出柱状图与汇总：数据个数 5，总和 720，平均数 144，最小值 80，最大值 200。

## 数据流向

纯前端本地计算与渲染，不调用网络、不上传数据。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #367                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | A（纯 JS + echarts）                |
| 模板     | T3（多面板 + 图表）                 |

---

# Statistics Chart

Paste numbers or CSV data (one data point per line) to render a bar / line / pie chart, with count, sum, mean, min, and max summary. Charts are drawn by echarts (SVG renderer), computed 100% locally.

Difference from "Text Statistics Chart" (text-stats): text-stats counts word frequency / length distribution of text; this tool works on numeric data and lets you switch between bar, line, and pie charts.

## Purpose

- Quickly visualize a list of numbers (sales, scores, durations…)
- Compare labeled category data (CSV rows like `Jan,120`)
- Copy / download the summary statistics text

## Input

| Field  | Type   | Constraints                                                |
| ------ | ------ | ---------------------------------------------------------- |
| `text` | string | Numbers or CSV, one data point per line; max 200,000 chars |

Formats:

```text
Jan,120
Feb,200
Mar,150
```

or plain numbers (space / comma / semicolon / tab separated, several per line):

```text
10 20 30 40 50
```

- `label,value`: recognized as a labeled data point when the label is non-numeric and the value is numeric
- Blank lines are skipped

## Output

- Chart area: bar / line / pie chart drawn by echarts
- Summary area: count, sum, mean, min, max
- Copy / download: summary text

## Options

| Option         | Values                | Description                      |
| -------------- | --------------------- | -------------------------------- |
| Chart type     | bar / line / pie      | Bar / line / pie chart           |
| Decimal places | 0 / 1 / 2 / 4 / 6 / 8 | Decimals kept in summary numbers |

## Edge cases

- Empty input → empty hint, no error
- Non-numeric line → bilingual error with line number (e.g. "Line 2 is not valid data: abc")
- Single data point → chart renders normally
- Negative numbers → included in stats and chart
- Input > 200,000 chars → error

## Example

Input:

```text
Jan,120
Feb,200
Mar,150
Apr,80
May,170
```

Output: bar chart plus summary — count 5, sum 720, mean 144, min 80, max 200.

## Data flow

Pure client-side computation and rendering. No network calls, no uploads.

## Meta

| Item        | Value                 |
| ----------- | --------------------- |
| Global #    | #367                  |
| Category    | `math`                |
| Group       | `life`                |
| Priority    | P2                    |
| Feasibility | A (pure JS + echarts) |
| Template    | T3                    |
