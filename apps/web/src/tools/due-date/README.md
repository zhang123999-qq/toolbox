# 预产期

输入末次月经日期（YYYY-MM-DD），按 Naegele 规则（+280 天）算出预产期，并根据今天算出当前孕周与距预产期的天数。

## 用途

- 备孕 / 怀孕后快速估算预产期
- 产检时核对孕周（X 周 X 天）
- 看距离预产期还有多少天（已过预产期会提示超期天数）

## 输入

| 字段   | 类型   | 约束                                               |
| ------ | ------ | -------------------------------------------------- |
| `text` | string | 末次月经日期，严格 `YYYY-MM-DD`，最大 200,000 字符 |

## 输出

```text
末次月经：2026-01-01
预产期：2026-10-08
当前孕周：12 周 3 天
距预产期：还有 193 天
```

（上面是「今天 = 2026-03-29」时的输出；孕周与剩余天数随当天日期变化。）

已过预产期时最后一行为 `已超过预产期 X 天`。

## 选项

无。

## 算法

- 预产期 = 末次月经 + 280 天（`setDate` 做加法，自动处理跨月 / 跨年 / 闰年）
- 孕周天数 = 今天 − 末次月经（整天）；周数 = 天数 ÷ 7 取整，余数为天数
- 日期差用 **UTC 午夜**相减：DST 切换日「本地午夜到午夜」不是严格 24 小时，
  直接 `ms / 86400000` 会差 ±1 天，用 UTC 午夜则恒为整天数
- 日期解析：正则定形 `^(\d{4})-(\d{2})-(\d{2})$` + 「构造后回读」校验，
  2 月 30 日、13 月这类输入会被中文报错拒绝

## 边界

- 空输入 → 输出空串
- 非 `YYYY-MM-DD`（如 `2026/01/01`、`2026-1-1`）→ 中文报错「无法解析的日期格式」
- 月份/日期越界 → 「月份越界」「日期越界」；不存在的日期（如 2 月 30 日、平年 2 月 29 日）→
  「日期越界：X 年 X 月没有 X 日」；闰年 2 月 29 日合法
- 末次月经晚于今天 → 「末次月经日期不能晚于今天」
- 输入 > 200,000 字符 → 报错

## 示例

输入 `2026-01-01`：

```text
末次月经：2026-01-01
预产期：2026-10-08
当前孕周：（按当天算）
距预产期：（按当天算）
```

## 元信息

| 项       | 值                            |
| -------- | ----------------------------- |
| 全局编号 | #360                          |
| 域       | `math`（数学/单位/金融/生活） |
| 大组     | `life`                        |
| 优先级   | P1                            |
| 可行性   | A（纯 JS）                    |
| 模板     | T2（双栏 + 同步转换）         |

## English

A due-date calculator: enter the first day of the last menstrual period (`YYYY-MM-DD`),
get the estimated due date (LMP + 280 days, Naegele's rule), the current gestational
age in weeks + days, and the days remaining until (or past) the due date.
Strict date validation rejects impossible dates like February 30th; day differences
are computed on UTC midnights to stay correct across DST transitions.
