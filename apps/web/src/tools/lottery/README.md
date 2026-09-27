# 抽签（lottery）

## 工具用途 / Purpose

- 中文：从每行一人的名单中随机抽取指定人数，例如年会抽奖、课堂点名。
- English: Randomly draw a given number of people from a line-separated roster (e.g. annual-party raffle, class roll call).

## 输入 / Inputs

- `input`：候选名单，每行一人；空行自动丢弃，重复名字按独立条目保留。
- `input-count`：抽取人数，整数。
- `withReplacement`：有放回（允许重复中奖）。

## 输出 / Outputs

- 结果文本：中奖名单 + 候选人数 / 抽取人数 / 是否放回。
- 输出面板以卡片形式展示每位中奖者。

## 选项 / Options

| 选项            | 类型    | 默认值 | 说明                                                   |
| --------------- | ------- | ------ | ------------------------------------------------------ |
| withReplacement | boolean | false  | true = 有放回；false = 无放回（Fisher–Yates 部分洗牌） |

## 限制 / Limits

- 空输入合法：返回空名单结果。
- 抽取人数 = 0 合法（返回空名单）；负数、非整数报错。
- 无放回时，抽取人数不得大于名单人数，否则进入错误态（中英双语）。
- 输入最大 50000 字符（模板级限制）。

## 数据流向 / Data flow

- 全本地计算，不上传网络、不持久化。随机源：`mulberry32(hashSeed(text + count + withReplacement + nonce))`，保证显示/复制/下载结果一致；每次点击 run 或改输入时 nonce 递增，得到新一轮抽签。

## 示例 / Example

```
张三
李四
王五
赵六
钱七
```

抽取人数 `2`，无放回 → 输出 2 位不同的中奖者。
