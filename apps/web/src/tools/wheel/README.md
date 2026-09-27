# 转盘（wheel）

## 工具用途 / Purpose

- 中文：把每行一个选项做成彩色转盘，点击「开始转盘」旋转并抽出指定数量的获奖者，例如团队活动抽奖、随机点名。
- English: Turn a line-separated option list into a colorful prize wheel; press "Spin" to rotate and draw a given number of winners (e.g. team raffle, random roll call).

## 输入 / Inputs

- `input`：扇区选项，每行一个，2–24 个。
- `input-winners`：获奖人数，0–1000 的整数，且不得大于选项数。

## 输出 / Outputs

- 结果文本：获奖名单 + 扇区数 / 获奖人数。
- 转盘盘面（CSS `conic-gradient` + 旋转 transition，纯 CSS 动画，无动画库），指针落在第一位获奖者的扇区中心。

## 选项 / Options

- 无额外选项开关；获奖人数 = 0 时只展示转盘、不抽奖。

## 限制 / Limits

- 选项数 < 2 或 > 24 进入错误态（中英双语）。
- 获奖人数负数/非整数/超 1000 或大于选项数时进入错误态（中英双语）。
- 抽奖无放回（Fisher–Yates 洗牌）。
- 输入最大 50000 字符（模板级限制）。

## 数据流向 / Data flow

- 全本地计算，不上传网络、不持久化。随机源：`mulberry32(hashSeed(text + winners + nonce))`；指针最终角度 = 5 整圈 + 获奖扇区中心偏移；每次点「开始转盘」nonce 递增，重新开奖。

## 示例 / Example

```
苹果
香蕉
橙子
葡萄
西瓜
芒果
```

获奖人数 `1` → 转盘旋转后落在获奖扇区。
