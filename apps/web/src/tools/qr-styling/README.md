# 二维码美化 qr-styling（#381）

## 用途 | Purpose

- 在 canvas 上绘制风格化二维码：方块 / 圆点 / 圆角数据模块 + 定制化定位角，可改前景与背景色。
- Draw a styled QR code on canvas: square / dot / rounded modules with custom finder frames and colors.

## 输入 | Input

- 文本框：二维码内容（URL / 文本）。
- Textarea: QR content (URL / text).

## 选项 | Options

| 选项            | 说明                                                      | Option     | Description                               |
| --------------- | --------------------------------------------------------- | ---------- | ----------------------------------------- |
| 点样式 dotStyle | square（方块）/ dot（圆点）/ rounded（圆角），默认 square | Dot style  | square / dot / rounded, default square    |
| 前景色 color    | #rrggbb，默认 #000000                                     | Foreground | #rrggbb, default #000000                  |
| 背景色 bgColor  | #rrggbb，默认 #ffffff                                     | Background | #rrggbb, default #ffffff                  |
| 静默区 margin   | 四周留白模块数，默认 4，范围 0–10                         | Quiet zone | quiet-zone modules, default 4, range 0–10 |

## 输出 | Output

- 右侧 canvas 实时预览；「复制 / 下载」得到同款 SVG 源码。
- Live canvas preview; "Copy / Download" exports the same-style SVG source.

## 限制 | Limits

- 容错固定为 M；非法颜色（非 #rrggbb）或静默区越界会显示错误。
- EC level fixed at M; invalid colors (non #rrggbb) or out-of-range margin show an error.

## 数据流向 | Data flow

- 矩阵由本地 `qrcode` 包生成，canvas 自绘；无网络请求；卸载时清理 canvas。
- Matrix from local `qrcode` package, self-drawn on canvas; no network. Canvas cleared on unmount.

## 示例 | Example

输入 `https://example.com`，dot 样式、前景 #0066ff → 圆点风格二维码。

## 元信息 | Meta

- 编号 #381 · category `random` · group `design` · 优先级 P1 · 可行性 A · 纯前端 · deps: `qrcode`
