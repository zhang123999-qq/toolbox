# 压力换算

输入数值并选择源单位与目标单位，即时得到压力换算结果。

## 用途

- 帕斯卡 / 千帕 / 兆帕 / 巴 / 毫巴互转
- 英制 psi、标准大气压 atm、毫米汞柱 mmHg、托 torr、英寸汞柱 inHg、千克力/平方厘米换算

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | 待换算的数值，最大 200,000 字符 |

## 输出

单行文本：`输入值 源单位 = 结果 目标单位`

```text
1 atm = 101.325 kPa
```

## 选项

| 字段   | 类型   | 说明     | 可选值                                                       |
| ------ | ------ | -------- | ------------------------------------------------------------ |
| `from` | select | 源单位   | Pa、kPa、MPa、bar、mbar、psi、atm、mmHg、torr、inHg、kgf/cm² |
| `to`   | select | 目标单位 | 同左                                                         |

## 算法

- 以**帕斯卡（Pa）**为基准：`结果 = 数值 × from.factor / to.factor`
- 输出用 `Number(n.toPrecision(12)).toString()` 格式化，去浮点噪声、去尾零
- 常用精确值：1 atm = 101325 Pa、1 psi = 6894.757 Pa、1 bar = 100000 Pa

## 边界

- 空输入 → 输出为空（不报错）
- 非数字输入 → 中文报错「请输入有效的数字」
- 未知单位 id → 中文报错「未知单位」
- 输入 > 200,000 字符 → 报错

## 示例

输入数值：`1`，从 `atm` 到 `kPa`

输出：`1 atm = 101.325 kPa`

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #321                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项下拉）               |

## English

Convert between pressure units (Pa, bar, psi, atm and more).

- Input: a numeric string.
- Output: one line, e.g. `1 atm = 101.325 kPa`.
- Options: `from` / `to` selects over Pa, kPa, MPa, bar, mbar, psi, atm, mmHg, torr, inHg, kgf/cm².
