# 硬币（coin）

## 工具用途 / Purpose

- 中文：抛掷硬币 N 次，统计正面/反面次数，大硬币翻转动画展示，例如做决定、二选一。
- English: Flip a coin N times, tallying heads/tails, with a flipping coin animation (e.g. making decisions, either/or choices).

## 输入 / Inputs

- `input`：抛掷次数，1–10000 的整数。

## 输出 / Outputs

- 结果文本：抛掷次数 + 正反面统计 + 完整正反面序列。
- 大硬币（CSS 3D `rotateY` 翻转动画，纯 CSS，无动画库）；多次抛掷时下方展示序列（页面最多渲染前 200 次，文本导出仍含完整序列）。

## 选项 / Options

- 无额外选项开关；点「抛硬币」重新抛。

## 限制 / Limits

- 次数非法（空、0、负数、非整数、>10000）进入错误态（中英双语）。
- 每次抛掷：`rand() < 0.5` 为正面，否则反面（无偏分界）。
- 输入最大 50000 字符（模板级限制）。

## 数据流向 / Data flow

- 全本地计算，不上传网络、不持久化。随机源：`mulberry32(hashSeed(count + nonce))`，保证显示/复制/下载结果一致；每次点「抛硬币」nonce 递增，重新抛掷。

## 示例 / Example

抛掷次数 `10` → 大硬币显示当次正反面 + 正面 X 次，反面 Y 次 + 10 个正反面序列。
