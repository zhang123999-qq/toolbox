# 预产期

由末次月经日期推算预产期、当前孕周、距预产期天数与孕期阶段，支持自定义月经周期。
纯前端计算，不上传数据。

## 用途

- 备孕 / 已孕用户推算预产期
- 查看当前孕周（X 周 Y 天）与孕期阶段（孕早期 / 孕中期 / 孕晚期）
- 短 / 长周期按（周期 − 28）天自动调整预产期

## 输入

| 字段          | 类型   | 约束                                     |
| ------------- | ------ | ---------------------------------------- |
| `text`        | string | 末次月经日期（`YYYY-MM-DD`，必填）       |
| `cycleLength` | string | 周期长度（天，留空=28，须为 10–90 整数） |
| `textB`       | string | 参考日期（留空=今天）                    |

## 输出

- 预产期（`YYYY-MM-DD`）
- 当前孕周（`孕 X 周 Y 天`）、距预产期天数（过期显示「已超过预产期 X 天」）
- 孕期阶段：0–13 周孕早期 / 14–27 周孕中期 / 28 周+孕晚期
- 周期 ≠ 28 天时附调整说明

## 选项

无。

## 公式

- 预产期 = 末次月经 + 280 天 +（周期长度 − 28）天（奈格勒规则 + 周期校正）
- 孕周 = 参考日期与末次月经相差天数 ÷ 7（取整为周，余数为天）

## 边界

- 末次月经留空 → 输出空（不报错）
- 非法日期 / 越界日期（如 2023-02-29、13 月）→ 中英双语报错
- 周期非数字 / ≤0 / 非整数 / 超出 10–90 天 → 中英双语报错
- 参考日期早于末次月经 → 报错
- 日期运算一律按 UTC 处理，避免本地时区 / 夏令时导致差一天

## 数据流向

纯本地计算，不调用外部接口，不上传任何数据。

## 示例

输入：末次月经 `2026-06-01`、周期 `28`、参考日期 `2026-09-27`

输出：

```text
末次月经：2026-06-01
周期长度：28 天
预产期：2027-03-08
当前孕周：孕 16 周 6 天
距预产期：还有 162 天
孕期阶段：孕中期
```

## 常见问题

- **周期不准怎么办？** 工具按（周期 − 28）天做线性校正；周期极不规律时结果仅供参考，请以医生 B 超为准。
- **为什么和医院算的差几天？** 医院可能用 B 超孕囊大小校正，本工具是标准的末次月经推算法。

## 相关工具

- `/tools/ovulation`（排卵期）：同一批，推算排卵日与易孕期
- `/tools/age`（年龄计算）：日期差值计算
- `/tools/date-diff`（日期差计算）：两个日期相差天数

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #360                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS Date，不引入 dayjs）       |
| 模板     | T3（多面板）                        |
| 依赖     | 无                                  |

## English

Due date calculator: estimates the due date, gestational age (weeks + days), days remaining and trimester from the last menstrual period date, with adjustable cycle length. The due date is LMP + 280 days + (cycle − 28) days (Naegele's rule with cycle correction). All date math is done in UTC to avoid timezone/DST off-by-one errors. Fully client-side, no data leaves the browser.

Example: LMP `2026-06-01`, cycle `28`, reference `2026-09-27` → due date `2027-03-08`, `16 weeks 6 days`, `162 days left`, second trimester.
