# 税率计算

含税价 / 不含税价互转：输入金额与税率，计算税额与对应价格。
金额运算使用 decimal.js 保证精度，纯前端计算，不上传数据。

## 用途

- 开发票、报价时含税 / 不含税互转
- 快速算出交易中的税额

## 输入

| 字段      | 类型   | 约束                         |
| --------- | ------ | ---------------------------- |
| `text`    | string | 金额（元，须 > 0）           |
| `taxRate` | string | 税率（%，如 13；0 表示免税） |

## 输出

不含税价、税额、含税价（金额保留 2 位小数、千分位分隔）。

## 选项

| 选项           | 类型   | 取值                              |
| -------------- | ------ | --------------------------------- |
| `taxDirection` | select | 含税价 → 不含税 / 不含税价 → 含税 |

## 公式

- 含税价 → 不含税：不含税 = 含税 / (1+r)
- 不含税价 → 含税：含税 = 不含税 × (1+r)
- 税额 = 含税 − 不含税（r=税率）

## 边界

- 金额留空 → 输出空（不报错）
- 税率留空 → 中文报错
- 非数字 / 负数 → 中文报错
- 纯本地计算（decimal.js 在浏览器内求值），不上传数据

## 示例

输入：含税价 `113`、税率 `13`，方向「含税价 → 不含税」

输出：

```text
换算方向：含税价 → 不含税
税率：13%
不含税价：100.00 元
税额：13.00 元
含税价：113.00 元
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #349                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，decimal.js 保精度）       |
| 模板     | T3（多面板）                        |
| 依赖     | decimal.js                          |

## English

Tax calculator: convert between tax-inclusive and tax-exclusive prices. Uses decimal.js for precise money math, fully client-side.

Inputs: `text` (amount, > 0), `taxRate` (tax rate in %). Option `taxDirection`: tax-inclusive → exclusive / exclusive → inclusive.

Example: tax-inclusive price `113`, rate `13` → tax-exclusive `100.00`, tax `13.00`.
