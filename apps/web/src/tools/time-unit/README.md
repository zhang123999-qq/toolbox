# 时间单位

输入数值并选择源单位与目标单位，即时得到时间单位换算结果。

## 用途

- 纳秒 / 微秒 / 毫秒 / 秒互转
- 分钟 / 小时 / 天 / 周换算
- 平均月 / 回归年换算

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | 待换算的数值，最大 200,000 字符 |

## 输出

单行文本：`输入值 源单位 = 结果 目标单位`

```text
1 h = 60 min
```

## 选项

| 字段   | 类型   | 说明     | 可选值                                        |
| ------ | ------ | -------- | --------------------------------------------- |
| `from` | select | 源单位   | ns、μs、ms、s、min、h、day、week、month、year |
| `to`   | select | 目标单位 | 同左                                          |

## 算法

- 以**秒（s）**为基准：`结果 = 数值 × from.factor / to.factor`
- 输出用 `Number(n.toPrecision(12)).toString()` 格式化，去浮点噪声、去尾零
- 约定：month 取平均月长 30.4375 天（= 365.25/12），year 取回归年 365.25 天（= 31557600 s）

## 边界

- 空输入 → 输出为空（不报错）
- 非数字输入 → 中文报错「请输入有效的数字」
- 未知单位 id → 中文报错「未知单位」
- 输入 > 200,000 字符 → 报错

## 示例

输入数值：`1`，从 `h` 到 `min`

输出：`1 h = 60 min`

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #326                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项下拉）               |

## English

Convert between time units (ns, μs, ms, s, min, h, day, week, month, year).

- Input: a numeric string.
- Output: one line, e.g. `1 h = 60 min`.
- Options: `from` / `to` selects over ns, μs, ms, s, min, h, day, week, month, year.
- Convention: month = average month of 30.4375 days; year = tropical year of 365.25 days.
