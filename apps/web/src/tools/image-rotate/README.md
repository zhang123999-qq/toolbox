# 图片旋转 image-rotate（#423）

## 用途 | Purpose

- 本地旋转图片任意角度：快捷按钮（顺时针 90°/180°/270°）可连续点击累加，也支持 -360~360 的任意角度输入（含小数）。
- Rotate images locally by any angle: stackable 90°/180°/270° clockwise presets, plus arbitrary -360°–360° input (decimals allowed).

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                   | 说明                                   | Option           | Description                                      |
| ---------------------- | -------------------------------------- | ---------------- | ------------------------------------------------ |
| 快捷旋转 preset        | 顺时针 90°/180°/270°，在当前角度上累加 | Presets          | Clockwise 90°/180°/270°, stacked on current      |
| 旋转角度 angle         | -360~360，空=0°，可小数                | Angle            | -360–360, empty=0°, decimals allowed             |
| 输出格式 format        | jpeg / png / webp                      | Format           | jpeg / png / webp                                |
| 质量 quality           | 1–100，默认 90（PNG 不生效）           | Quality          | 1–100, default 90 (ignored for PNG)              |
| 背景色 backgroundColor | 非直角旋转时填充色，默认 #ffffff       | Background color | Fill color for non-right angles, default #ffffff |
| 透明背景 transparent   | 仅 PNG 可选：背景保持透明              | Transparent      | PNG only: keep background transparent            |

## 输出 | Output

- 旋转前后预览、尺寸/角度/格式统计，一键下载（文件名如 `photo-rotated.jpg`）。
- Before/after preview, size/angle/format stats, one-click download (e.g. `photo-rotated.jpg`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 任意（非直角）角度旋转时画布按包围盒自动扩大，多余区域用背景色填充；直角旋转（0°/90°/180°/270°）图片恰好铺满画布，无需填充。
- 透明背景仅 PNG 有效：勾选后画布不清屏，直接保留透明通道；JPEG/WebP 无透明通道，仍用背景色填充。
- GIF 动图旋转后只保留第一帧（Canvas 限制）。
- 角度输入非法时快捷旋转按钮从 0° 起算。

## 数据流向 | Data flow

文件 → 内存 Canvas（translate 到中心 → rotate → 居中 drawImage）→ Blob → 下载；不经过网络。
