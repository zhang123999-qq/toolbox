# 众数（Mode）

输入一组数字，找出出现次数最多的众数，附出现次数、占比与数据规模。

## 用途

- 统计一组数据中出现最频繁的值
- 并列众数一次性全部列出

## 输入

| 字段   | 类型   | 约束                        |
| ------ | ------ | --------------------------- |
| `text` | string | 数值列表，最大 200,000 字符 |

分隔符支持逗号（中英文）、空格、换行、分号、顿号、竖线，可混用；支持小数与负数。

## 输出

```text
数据个数：9
不同数值：4 个
众数：3
出现次数：4 次
占比：44.44%
```

## 选项

本工具无选项。

## 算法

- 按数值统计频次，取频次最大值对应的全部数值（数值升序排列）
- 占比 = 出现次数 ÷ 数据个数

## 边界

- 空输入 → 输出空
- 非数字 / 无穷大 → 中文报错并指出具体 token
- 输入 > 200,000 字符 → 报错

## 示例

输入：`3, 5, 3, 7, 3, 9, 5, 3, 7`

输出：众数 `3`，出现 4 次，占比 44.44%。

## 数据流向

纯本地计算，不上传任何数据。

## English

Enter a list of numbers (separated by commas, spaces or newlines) and get the mode — the most frequent value(s) — together with the occurrence count, share of total and data size. Ties are all listed in ascending order. Everything is computed locally in the browser; no data is uploaded.

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #333                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P1                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏）                          |
