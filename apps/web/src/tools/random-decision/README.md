# 随机决定（random-decision）

## 工具用途 / Purpose

- 中文：从每行一个选项的候选列表中随机抽取指定数量的决定项，例如“今天吃什么”“谁先发言”，支持有放回/无放回。
- English: Randomly pick a given number of items from a line-separated option list (e.g. "what to eat today", "who speaks first"), with or without replacement.

## 输入 / Inputs

- `input`：候选选项，每行一个；空行自动丢弃，重复选项按独立条目保留。
- `input-count`：抽取个数，整数。
- `allowRepeat`：允许重复抽中同一项（有放回）。

## 输出 / Outputs

- 结果文本：中奖项列表 + 候选项数 / 抽取个数 / 是否放回。
- 输出面板以卡片形式展示每个抽中的选项。

## 选项 / Options

| 选项        | 类型    | 默认值 | 说明                                                                           |
| ----------- | ------- | ------ | ------------------------------------------------------------------------------ |
| allowRepeat | boolean | false  | true = 有放回（同一选项可被多次抽中）；false = 无放回（Fisher–Yates 部分洗牌） |

## 限制 / Limits

- 空输入合法：返回“未抽中任何内容”的占位结果。
- 抽取个数 = 0 合法（返回空结果）；负数、非整数报错。
- 无放回时，抽取个数不得大于选项数，否则进入错误态（中英双语）。
- 输入最大 50000 字符（模板级限制）。

## 数据流向 / Data flow

- 全本地计算，不上传网络、不持久化。随机源：`mulberry32(hashSeed(text + count + allowRepeat + nonce))`，保证显示/复制/下载结果一致；每次点击 run 或改输入时 nonce 递增，得到新一轮抽取。

## 示例 / Example

```
看电影
吃火锅
去爬山
打游戏
```

抽取个数 `2`，无放回 → 输出 2 个不同的选项。
