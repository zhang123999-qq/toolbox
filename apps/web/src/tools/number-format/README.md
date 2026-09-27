# 数字格式

输入数字（每行一个），按千分位、小数位、百分比、科学计数法格式化输出。底层使用 `Intl.NumberFormat`，纯本地计算。

## 用途

- 给大数字加千分位分隔符（1,234,567.89）
- 小数统一保留 N 位（财务对账、报表）
- 小数转百分比（0.5 → 50.00%）
- 大数字转科学计数法（12345 → 1.23E4）

## 输入

| 字段   | 类型   | 约束                              |
| ------ | ------ | --------------------------------- |
| `text` | string | 数字，每行一个；最大 200,000 字符 |

## 输出

每行输入对应一行格式化结果。

```text
1,234,567.89
-1,234.50
0.30
```

## 选项

| 选项       | 取值                           | 说明                       |
| ---------- | ------------------------------ | -------------------------- |
| 格式化模式 | decimal / percent / scientific | 标准 / 百分比 / 科学计数法 |
| 千分位分隔 | 开 / 关                        | 是否插入千分位逗号         |
| 小数位数   | 0 / 1 / 2 / 4 / 6 / 8          | 保留小数位数（四舍五入）   |

## 边界

- 空输入 → 空输出，不报错
- 非数字 / NaN / Infinity → 双语报错
- 空行自动跳过
- 输入 > 200,000 字符 → 报错
- 百分比模式：输入 0.5 输出 50.00%（自动 ×100）
- 极大值（如 1e15）按千分位正常输出

## 示例

输入 `1234567.891`，默认选项 → 输出 `1,234,567.89`。

## 数据流向

纯前端本地计算，不调用网络、不上传数据。

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #366                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS，Intl.NumberFormat）       |
| 模板     | T2（双栏 + 选项）                   |

---

# Number Format

Enter numbers (one per line) and format them with thousands separators, fixed decimals, percent style, or scientific notation. Powered by `Intl.NumberFormat`, computed 100% locally.

## Purpose

- Add thousands separators to large numbers (1,234,567.89)
- Round to N decimal places (finance, reports)
- Convert decimals to percent (0.5 → 50.00%)
- Convert large numbers to scientific notation (12345 → 1.23E4)

## Input

| Field  | Type   | Constraints                              |
| ------ | ------ | ---------------------------------------- |
| `text` | string | Numbers, one per line; max 200,000 chars |

## Output

One formatted result per input line.

## Options

| Option              | Values                         | Description                     |
| ------------------- | ------------------------------ | ------------------------------- |
| Format mode         | decimal / percent / scientific | Standard / percent / scientific |
| Thousands separator | on / off                       | Insert thousands separators     |
| Decimal places      | 0 / 1 / 2 / 4 / 6 / 8          | Kept decimal places (rounded)   |

## Edge cases

- Empty input → empty output, no error
- Non-numeric / NaN / Infinity → bilingual error
- Blank lines are skipped
- Input > 200,000 chars → error
- Percent mode: 0.5 → 50.00% (auto ×100)
- Huge values (e.g. 1e15) format normally with separators

## Example

Input `1234567.891` with defaults → output `1,234,567.89`.

## Data flow

Pure client-side computation. No network calls, no uploads.

## Meta

| Item        | Value                          |
| ----------- | ------------------------------ |
| Global #    | #366                           |
| Category    | `math`                         |
| Group       | `life`                         |
| Priority    | P1                             |
| Feasibility | A (pure JS, Intl.NumberFormat) |
| Template    | T2                             |
