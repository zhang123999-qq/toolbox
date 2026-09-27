# 角度换算

输入数值并选择源单位与目标单位，即时得到角度换算结果。

## 用途

- 度 / 弧度互转
- 梯度（百分度）/ 圈 / 角分 / 角秒换算
- 北约密位 mil 换算

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | 待换算的数值，最大 200,000 字符 |

## 输出

单行文本：`输入值 源单位 = 结果 目标单位`

```text
180 deg = 3.14159265359 rad
```

## 选项

| 字段   | 类型   | 说明     | 可选值                                    |
| ------ | ------ | -------- | ----------------------------------------- |
| `from` | select | 源单位   | deg、rad、grad、turn、arcmin、arcsec、mil |
| `to`   | select | 目标单位 | 同左                                      |

## 算法

- 以**度（deg）**为基准：`结果 = 数值 × from.factor / to.factor`
- 输出用 `Number(n.toPrecision(12)).toString()` 格式化，去浮点噪声、去尾零
- 常用精确值：1 turn = 360 deg、1 grad = 0.9 deg、1 mil = 0.05625 deg（北约密位）

## 边界

- 空输入 → 输出为空（不报错）
- 非数字输入 → 中文报错「请输入有效的数字」
- 未知单位 id → 中文报错「未知单位」
- 输入 > 200,000 字符 → 报错

## 示例

输入数值：`180`，从 `deg` 到 `rad`

输出：`180 deg = 3.14159265359 rad`（即 π 弧度）

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #324                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项下拉）               |

## English

Convert between angle units (degrees, radians, gradians, turns, arcmin and more).

- Input: a numeric string.
- Output: one line, e.g. `180 deg = 3.14159265359 rad`.
- Options: `from` / `to` selects over deg, rad, grad, turn, arcmin, arcsec, mil.
