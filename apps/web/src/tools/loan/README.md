# 贷款计算

房贷车贷计算：等额本息 / 等额本金两种还款方式的月供、总利息与总还款。
金额运算使用 decimal.js 保证精度，纯前端计算，不上传数据。

## 用途

- 房贷、车贷月供试算
- 对比等额本息 vs 等额本金的总利息差异

## 输入

| 字段         | 类型   | 约束                            |
| ------------ | ------ | ------------------------------- |
| `text`       | string | 贷款本金（元，须 > 0）          |
| `annualRate` | string | 年利率（%，如 4.9；0 表示免息） |
| `years`      | string | 贷款年限（年，支持小数如 2.5）  |

## 输出

- 等额本息：每月月供、总利息、总还款
- 等额本金：首月月供、末月月供、每月递减、总利息、总还款

金额保留 2 位小数、千分位分隔。

## 选项

| 选项          | 类型   | 取值                |
| ------------- | ------ | ------------------- |
| `repayMethod` | select | 等额本息 / 等额本金 |

## 公式

- 月利率 r = 年利率 / 12，期数 n = 年限 × 12
- 等额本息月供 = P·r·(1+r)^n / ((1+r)^n − 1)；r=0 时月供 = P/n
- 等额本金：每月还本金 P/n；总利息 = P·r·(n+1)/2

## 边界

- 本金留空 → 输出空（不报错）
- 年利率 / 年限留空 → 中文报错（请填写…）
- 非数字 / ≤0（年利率允许 0）→ 中文报错
- 纯本地计算（decimal.js 在浏览器内求值），不上传数据

## 示例

输入：本金 `1000000`、年利率 `4.9`、年限 `20`，等额本息

输出：

```text
还款方式：等额本息
贷款本金：1,000,000.00 元
年利率：4.9% 贷款年限：20 年（240 期）
每月月供：6,544.44 元
总利息：570,665.72 元
总还款：1,570,665.72 元
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #346                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P0                                  |
| 可行性   | A（纯 JS，decimal.js 保精度）       |
| 模板     | T3（多面板）                        |
| 依赖     | decimal.js                          |

## English

Loan calculator (mortgage / auto): monthly payment, total interest and total repayment for equal-installment or equal-principal plans. Uses decimal.js for precise money math, fully client-side.

Inputs: `text` (principal in yuan, > 0), `annualRate` (yearly rate in %, 0 = interest-free), `years` (term in years). Option `repayMethod`: equal-installment / equal-principal.

Example: principal `1000000`, rate `4.9`, 20 years, equal-installment → monthly payment `6,544.44`, total interest `570,665.72`.
