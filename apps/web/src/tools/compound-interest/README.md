# 复利计算

按年 / 半年 / 季度 / 月 / 日复利频率计算本息和与总利息。
金额运算使用 decimal.js 保证精度，纯前端计算，不上传数据。

## 用途

- 存款、理财复利收益试算
- 对比不同复利频率的收益差异

## 输入

| 字段         | 类型   | 约束                    |
| ------------ | ------ | ----------------------- |
| `text`       | string | 本金（元，须 > 0）      |
| `annualRate` | string | 年利率（%，0 表示无息） |
| `years`      | string | 年限（年，支持小数）    |

## 输出

本息和、总利息（金额保留 2 位小数、千分位分隔）。

## 选项

| 选项           | 类型   | 取值                                 |
| -------------- | ------ | ------------------------------------ |
| `compoundFreq` | select | 每年 / 每半年 / 每季度 / 每月 / 每天 |

## 公式

本息和 A = P·(1 + r/n)^(n·t)：r=年利率，n=每年复利次数，t=年限。

## 边界

- 本金留空 → 输出空（不报错）
- 年利率 / 年限留空 → 中文报错
- 非数字 / 负数 → 中文报错
- 纯本地计算（decimal.js 在浏览器内求值），不上传数据

## 示例

输入：本金 `10000`、年利率 `5`、年限 `10`，每年复利

输出：

```text
复利频率：每年（1 次/年）
本金：10,000.00 元
年利率：5% 年限：10 年
本息和：16,288.95 元
总利息：6,288.95 元
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #347                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，decimal.js 保精度）       |
| 模板     | T3（多面板）                        |
| 依赖     | decimal.js                          |

## English

Compound interest calculator: future value and total interest at yearly, half-yearly, quarterly, monthly or daily compounding. Uses decimal.js for precise money math, fully client-side.

Inputs: `text` (principal, > 0), `annualRate` (yearly rate in %), `years` (term in years). Option `compoundFreq`: yearly / half-yearly / quarterly / monthly / daily.

Example: principal `10000`, rate `5`, 10 years, yearly compounding → future value `16,288.95`, total interest `6,288.95`.
