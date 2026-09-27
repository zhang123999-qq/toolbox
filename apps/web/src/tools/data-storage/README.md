# 数据存储

输入数值并选择源单位与目标单位，即时得到数据存储换算结果。

## 用途

- 比特 / 字节换算（8 bit = 1 B）
- 十进制 KB / MB / GB / TB 互转（硬盘容量口径）
- 二进制 KiB / MiB / GiB / TiB 互转（内存容量口径）

## 输入

| 字段   | 类型   | 约束                            |
| ------ | ------ | ------------------------------- |
| `text` | string | 待换算的数值，最大 200,000 字符 |

## 输出

单行文本：`输入值 源单位 = 结果 目标单位`

```text
1 GiB = 1073.741824 MB
```

## 选项

| 字段   | 类型   | 说明     | 可选值                                     |
| ------ | ------ | -------- | ------------------------------------------ |
| `from` | select | 源单位   | bit、B、KB、MB、GB、TB、KiB、MiB、GiB、TiB |
| `to`   | select | 目标单位 | 同左                                       |

## 算法

- 以**字节（B）**为基准：`结果 = 数值 × from.factor / to.factor`
- 输出用 `Number(n.toPrecision(12)).toString()` 格式化，去浮点噪声、去尾零
- 口径约定：KB/MB/GB/TB 为 SI 十进制（1 KB = 1000 B）；KiB/MiB/GiB/TiB 为二进制（1 KiB = 1024 B）

## 边界

- 空输入 → 输出为空（不报错）
- 非数字输入 → 中文报错「请输入有效的数字」
- 未知单位 id → 中文报错「未知单位」
- 输入 > 200,000 字符 → 报错

## 示例

输入数值：`1`，从 `GiB` 到 `MB`

输出：`1 GiB = 1073.741824 MB`（二进制 GiB 换算为十进制 MB）

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #325                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P0                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T2（双栏 + 选项下拉）               |

## English

Convert between data storage units (bit, B, KB, MB, GB, KiB, MiB, GiB and more).

- Input: a numeric string.
- Output: one line, e.g. `1 GiB = 1073.741824 MB`.
- Options: `from` / `to` selects over bit, B, KB, MB, GB, TB, KiB, MiB, GiB, TiB.
- Convention: KB/MB/GB/TB are decimal SI (1 KB = 1000 B); KiB/MiB/GiB/TiB are binary (1 KiB = 1024 B).
