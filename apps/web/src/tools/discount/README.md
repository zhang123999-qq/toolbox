# 折扣计算

输入原价、折扣与数量，计算折后单价、节省金额与实付总额。
金额运算使用 decimal.js 保证精度，纯前端计算，不上传数据。

## 用途

- 购物时快速算折后价与实付总额
- 促销「满减 / 打折」后的省钱金额

## 输入

| 字段           | 类型   | 约束                                   |
| -------------- | ------ | -------------------------------------- |
| `text`         | string | 原价（元，须 > 0）                     |
| `discountRate` | string | 折扣（%），如 20 表示减 20%（即 8 折） |
| `quantity`     | string | 数量（正整数，留空=1）                 |

折扣取值 0–100：0 = 不打折，100 = 免费。

## 输出

折后单价、单件节省、实付总额、总共节省（金额保留 2 位小数、千分位分隔）。

## 选项

本工具无选项。

## 公式

- 折后单价 = 原价 × (1 − 折扣/100)
- 实付总额 = 折后单价 × 数量

## 边界

- 原价留空 → 输出空（不报错）
- 折扣留空 → 中文报错；折扣超出 0–100 → 中文报错
- 数量非正整数 → 中文报错
- 纯本地计算（decimal.js 在浏览器内求值），不上传数据

## 示例

输入：原价 `100`、折扣 `20`、数量 `2`

输出：

```text
原价：100.00 元
折扣：20%（8 折）
数量：2
折后单价：80.00 元
单件节省：20.00 元
实付总额：160.00 元
总共节省：40.00 元
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #350                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，decimal.js 保精度）       |
| 模板     | T3（多面板）                        |
| 依赖     | decimal.js                          |

## English

Discount calculator: enter original price, discount and quantity to get discounted unit price, per-unit savings, total payable and total savings. Uses decimal.js for precise money math, fully client-side.

Inputs: `text` (original price, > 0), `discountRate` (discount in %, e.g. 20 = 20% off), `quantity` (positive integer, default 1).

Example: price `100`, discount `20`, quantity `2` → unit price `80.00`, total payable `160.00`, total savings `40.00`.
