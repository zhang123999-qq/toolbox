# 排卵期

由末次月经日期与周期长度推算排卵日、易孕期、下次月经与当前周期阶段；周期异常（<21 或 >35 天）时给出提示。
纯前端计算，不上传数据。

## 用途

- 备孕：找准易孕期（排卵日前 5 天至排卵日后 1 天）
- 了解当前处于月经期 / 卵泡期 / 易孕期 / 黄体期
- 周期异常时提示结果仅供参考

## 输入

| 字段          | 类型   | 约束                                     |
| ------------- | ------ | ---------------------------------------- |
| `text`        | string | 末次月经日期（`YYYY-MM-DD`，必填）       |
| `cycleLength` | string | 周期长度（天，留空=28，须为 10–90 整数） |
| `textB`       | string | 参考日期（留空=今天）                    |

## 输出

- 排卵日（`YYYY-MM-DD`）
- 易孕期区间、预计下次月经
- 当前阶段 + 周期第几天、距排卵天数（未到 / 今天 / 已过去 X 天）
- 周期 <21 或 >35 天时显示异常提示

## 选项

无。

## 公式

- 排卵日 = 周期起始日 +（周期长度 − 14）天（黄体期恒定 14 天假设）
- 易孕期 = 排卵日 − 5 天 ～ 排卵日 + 1 天（含精子存活期）
- 下次月经 = 周期起始日 + 周期长度；参考日期按整周期数定位到所在周期

## 边界

- 末次月经留空 → 输出空（不报错）
- 非法日期 / 越界日期 → 中英双语报错
- 周期非数字 / ≤0 / 非整数 / 超出 10–90 天 → 中英双语报错
- 周期 <21 或 >35 天 → 不报错，显示「结果仅供参考」提示
- 参考日期早于末次月经 → 报错
- 日期运算一律按 UTC 处理，避免本地时区 / 夏令时导致差一天

## 数据流向

纯本地计算，不调用外部接口，不上传任何数据。

## 示例

输入：末次月经 `2026-09-01`、周期 `28`、参考日期 `2026-09-27`

输出：

```text
末次月经：2026-09-01
周期长度：28 天
排卵日：2026-09-15
易孕期：2026-09-10 ～ 2026-09-16
下次月经（预计）：2026-09-29
当前阶段：黄体期（第 27 天）
距排卵：已过去 12 天
```

## 常见问题

- **周期不规律准吗？** 排卵日本质是预测；周期波动大时建议结合基础体温或排卵试纸。
- **易孕期为什么是 7 天？** 精子在体内存活约 5 天 + 卵子存活约 1 天，这是常规医学口径。

## 相关工具

- `/tools/due-date`（预产期）：同一批，推算预产期与孕周
- `/tools/date-diff`（日期差计算）：两个日期相差天数
- `/tools/age`（年龄计算）：日期差值计算

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #361                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P2                                  |
| 可行性   | A（纯 JS Date，不引入 dayjs）       |
| 模板     | T3（多面板）                        |
| 依赖     | 无                                  |

## English

Ovulation calculator: estimates the ovulation day, fertile window (5 days before to 1 day after ovulation), next period and current cycle phase from the last menstrual period date and cycle length (default 28 days). Cycles shorter than 21 or longer than 35 days trigger an "indicative only" warning. All date math is done in UTC to avoid timezone/DST off-by-one errors. Fully client-side, no data leaves the browser.

Example: LMP `2026-09-01`, cycle `28`, reference `2026-09-27` → ovulation `2026-09-15`, fertile window `2026-09-10`–`2026-09-16`, next period `2026-09-29`, luteal phase (day 27).
