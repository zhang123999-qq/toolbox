# 亮度/对比度 brightness-contrast（#436）

## 用途 | Purpose

- 本地调整图片亮度与对比度：亮度 -100~100（负值变暗，正值变亮），对比度 -100~100（负值降低对比，正值增强对比），默认都为 0。
- Adjust image brightness and contrast locally: brightness -100~100 (negative darkens, positive brightens), contrast -100~100 (negative lowers, positive raises), both default to 0.
- 与「色相/饱和度」（hue-saturation #437）的区别：本工具只调亮度与对比度。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                         | Option     | Description                            |
| --------------- | ---------------------------- | ---------- | -------------------------------------- |
| 亮度 brightness | -100~100，默认 0（负值变暗） | Brightness | -100~100, default 0 (negative darkens) |
| 对比度 contrast | -100~100，默认 0（负值降低） | Contrast   | -100~100, default 0 (negative lowers)  |
| 输出格式 format | jpeg / png / webp，默认 png  | Format     | jpeg / png / webp, default png         |

## 输出 | Output

- 调整前后预览、尺寸与亮度/对比度统计，一键下载。
- Before/after preview, size and level stats, one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 滤镜经由 `ctx.filter`（`brightness()` / `contrast()`）一次性绘制应用；浏览器支持：Chrome / Edge / Firefox 全版本支持，Safari 18+。
- GIF 动图只保留第一帧（Canvas 限制，页面有说明）。
- 亮度和对比度都为 0 时，滤镜为 `none`，输出与原图一致。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（ctx.filter 绘制）→ Blob → 下载；不经过网络。
