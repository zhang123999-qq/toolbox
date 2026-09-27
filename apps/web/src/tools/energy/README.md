# 能量换算

输入数值并选择源单位与目标单位，即时得到能量换算结果。

## 用途

- 焦耳 / 千焦 / 兆焦互转
- 卡路里 / 千卡（大卡）换算
- 瓦时 / 千瓦时换算
- 电子伏特 eV、英热单位 BTU、英尺磅 ft·lb、尔格 erg 换算

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | 待换算的数值，最大 200,000 字符 |

## 输出

单行文本：`输入值 源单位 = 结果 目标单位`

```text
1 kWh = 3.6 MJ
```

## 选项

| 字段   | 类型   | 说明     | 可选值                                             |
| ------ | ------ | -------- | -------------------------------------------------- |
| `from` | select | 源单位   | J、kJ、MJ、cal、kcal、Wh、kWh、eV、BTU、ft·lb、erg |
| `to`   | select | 目标单位 | 同左                                               |

## 算法

- 以**焦耳（J）**为基准：`结果 = 数值 × from.factor / to.factor`
- 输出用 `Number(n.toPrecision(12)).toString()` 格式化，去浮点噪声、去尾零
- 常用精确值：1 kWh = 3.6e6 J、1 cal = 4.184 J、1 eV = 1.602176634e-19 J

## 边界

- 空输入 → 输出为空（不报错）
- 非数字输入 → 中文报错「请输入有效的数字」
- 未知单位 id → 中文报错「未知单位」
- 输入 > 200,000 字符 → 报错

## 示例

输入数值：`1`，从 `kWh` 到 `MJ`

输出：`1 kWh = 3.6 MJ`

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #322                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项下拉）               |

## English

Convert between energy units (J, kJ, cal, kcal, kWh, eV, BTU and more).

- Input: a numeric string.
- Output: one line, e.g. `1 kWh = 3.6 MJ`.
- Options: `from` / `to` selects over J, kJ, MJ, cal, kcal, Wh, kWh, eV, BTU, ft·lb, erg.
