# 骰子（dice）

## 工具用途 / Purpose

- 中文：掷 N 个 M 面骰，显示每颗点数与总点数，6 面骰用骰子点数符号展示，例如桌游判定、随机数小游戏。
- English: Roll N M-sided dice, showing each die's face and the total; 6-sided dice render as pip symbols (e.g. board-game checks, dice mini-games).

## 输入 / Inputs

- `input`：骰子个数，1–100 的整数。
- `input-sides`：骰子面数，2–100 的整数。

## 输出 / Outputs

- 结果文本：掷骰结果序列 + 总点数。
- 骰子面展示：6 面骰用 ⚀–⚅ 点数符号，其他面数显示数字；掷骰时有 CSS 抖动动画（纯 CSS，无动画库）。

## 选项 / Options

- 无额外选项开关；点「掷骰子」重新掷。

## 限制 / Limits

- 个数/面数非法（空、0、负数、非整数、超上限；面数 < 2）进入错误态（中英双语）。
- 每颗骰子点数 = `floor(rand() * sides) + 1`，区间 [1, sides]。
- 输入最大 50000 字符（模板级限制）。

## 数据流向 / Data flow

- 全本地计算，不上传网络、不持久化。随机源：`mulberry32(hashSeed(count + sides + nonce))`，保证显示/复制/下载结果一致；每次点「掷骰子」nonce 递增，重新掷骰。

## 示例 / Example

骰子个数 `2`，面数 `6` → 掷出两个点数符号 + 总点数（2–12）。
