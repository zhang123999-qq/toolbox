# 利息计算

单利 / 复利（年复利）两种计息方式：输入本金、年利率与期限，计算利息与本息和。
金额运算使用 decimal.js 保证精度，纯前端计算，不上传数据。

## 用途

- 存款、贷款利息试算
- 对比单利 vs 复利的收益差异

## 输入

| 字段         | 类型   | 约束                    |
| ------------ | ------ | ----------------------- |
| `text`       | string | 本金（元，须 > 0）      |
| `annualRate` | string | 年利率（%，0 表示无息） |
| `termYears`  | string | 期限（年，支持小数）    |

## 输出

利息、本息和（金额保留 2 位小数、千分位分隔）。

## 选项

| 选项           | 类型   | 取值        |
| -------------- | ------ | ----------- |
| `interestType` | select | 单利 / 复利 |

复利按年复利计算；按月 / 按日复利请用「复利计算」工具。

## 公式

- 单利：利息 = P·r·t
- 复利：本息和 = P·(1+r)^t，利息 = 本息和 − P

## 边界

- 本金留空 → 输出空（不报错）
- 年利率 / 期限留空 → 中文报错
- 非数字 / 负数 → 中文报错
- 纯本地计算（decimal.js 在浏览器内求值），不上传数据

## 示例

输入：本金 `10000`、年利率 `5`、期限 `3`，复利

输出：

```text
计息方式：复利（年复利）
本金：10,000.00 元
年利率：5% 期限：3 年
利息：1,576.25 元
本息和：11,576.25 元
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #348                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，decimal.js 保精度）       |
| 模板     | T3（多面板）                        |
| 依赖     | decimal.js                          |

## English

Interest calculator: simple or (yearly) compound interest on a principal over a term. Uses decimal.js for precise money math, fully client-side.

Inputs: `text` (principal, > 0), `annualRate` (yearly rate in %), `termYears` (term in years). Option `interestType`: simple / compound.

Example: principal `10000`, rate `5`, 3 years, compound → interest `1,576.25`, maturity value `11,576.25`.
