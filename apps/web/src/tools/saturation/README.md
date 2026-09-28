# 饱和度调整 saturation（#437）

## 用途 | Purpose

- 本地调整图片饱和度：0 = 黑白，100 = 原图，200 = 过饱和，Canvas ctx.filter 的 `saturate()` 一次性重绘。
- Adjust image saturation locally: 0 = grayscale, 100 = original, 200 = over-saturated, applied in a single redraw via Canvas ctx.filter `saturate()`.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项              | 说明                                            | Option     | Description                                                        |
| ----------------- | ----------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| 饱和度 saturation | 0–200，默认 100（0=黑白，100=原图，200=过饱和） | Saturation | 0–200, default 100 (0=grayscale, 100=original, 200=over-saturated) |
| 输出格式 format   | jpeg / png / webp，默认 png                     | Format     | jpeg / png / webp, default png                                     |

## 输出 | Output

- 调整前后预览、尺寸与饱和度统计，一键下载。
- Before/after preview, size and saturation stats, one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- `ctx.filter` 浏览器支持：Chrome / Edge / Firefox 全版本支持，Safari 18+（页面有说明）。
- GIF 动图只保留第一帧（Canvas 限制，页面有说明）。
- 饱和度 = 100 时滤镜为 `saturate(1)` 恒等变换，输出与原图一致。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（`ctx.filter = saturate(x)` 重绘）→ Blob → 下载；不经过网络。
