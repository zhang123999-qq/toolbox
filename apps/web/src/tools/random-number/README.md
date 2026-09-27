# 随机数

在指定范围内生成随机数：支持整数 / 小数、不重复抽取与批量生成。纯前端计算，不上传数据。

## 用途

- 抽奖、摇号、随机抽样
- 生成测试用的随机整数 / 小数
- 不重复抽取（如从 1–100 里抽 5 个）

## 输入

| 字段       | 类型   | 约束                                    |
| ---------- | ------ | --------------------------------------- |
| `text`     | string | 生成数量（正整数，留空=10，上限 10000） |
| `min`      | string | 最小值（数字，留空=1）                  |
| `max`      | string | 最大值（数字，留空=100）                |
| `decimals` | string | 小数位数（0–10 的整数，留空=0，即整数） |

## 输出

每行一个随机数（复制 / 下载为换行分隔的文本）。

## 选项

| 选项     | 类型    | 说明                                   |
| -------- | ------- | -------------------------------------- |
| `unique` | boolean | 不重复抽取（仅整数模式有效，默认关闭） |

## 边界

- 全部输入留空 → 输出空（不报错）
- 最小值 > 最大值 → 中文报错
- 数量不是正整数 / 超过 10000 → 报错
- 小数位数超出 0–10 → 报错
- 不重复数量超过范围容量 → 报错
- 小数模式下勾选「不重复」→ 报错（仅整数支持不重复）

## 可复现性

随机源为 mulberry32，种子 = FNV-1a(参数 JSON + 页面级盐）。
同一页面内相同参数产出相同序列，因此「显示 / 复制 / 下载」三处结果一致；
修改任一参数或重新进入页面即重新生成。

## 示例

输入：数量 `5`、最小值 `1`、最大值 `100`、小数位数 `0`

输出（示例）：

```text
42
7
88
15
63
```

## 元信息

| 项       | 值                                  |
| -------- | ----------------------------------- |
| 全局编号 | #345                                |
| 域       | `math`（数学 / 单位 / 金融 / 生活） |
| 大组     | `life`                              |
| 优先级   | P0                                  |
| 可行性   | A（纯 JS）                          |
| 模板     | T3（多面板）                        |
| 依赖     | 无                                  |

## English

Random number generator: generate integers or decimals within a range, with optional unique draws and batch output. Fully client-side.

Inputs: `text` (count, default 10, max 10000), `min` (default 1), `max` (default 100), `decimals` (0–10, default 0 = integers). Option `unique` enables non-repeating draws (integers only).

Example: count `5`, min `1`, max `100` → five integers between 1 and 100, one per line.
