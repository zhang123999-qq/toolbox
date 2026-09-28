# 照片滤镜 filter（#434）

## 用途 | Purpose

- 一键为照片应用 8 种预设滤镜风格：原图、黑白、复古、反色、暖阳、冷调、褪色、鲜明。
- Apply 8 preset photo filters in one click: original, B&W, sepia, invert, warm, cool, fade, vivid.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                        | Option | Description                    |
| --------------- | --------------------------- | ------ | ------------------------------ |
| 滤镜预设 preset | 8 种预设风格单选            | Preset | One of 8 preset styles         |
| 输出格式 format | jpeg / png / webp，默认 png | Format | jpeg / png / webp, default png |

## 输出 | Output

- 原图/滤镜后前后对比预览、尺寸与所用滤镜统计，一键下载（文件名加 `-filter` 后缀）。
- Before/after preview, size and applied-filter stats, one-click download (file name gets a `-filter` suffix).

## 边界 | Limits

- 全程本地 Canvas `ctx.filter` 绘制，不上传。
- `ctx.filter` 浏览器支持：Chrome / Edge / Firefox 全版本支持；Safari 18+（页面有说明）。
- GIF 动图只保留第一帧（Canvas 限制）。
- 输出尺寸与原图一致（不缩放）。

## 数据流向 | Data flow

文件 → 内存 Canvas（含 ctx.filter 绘制）→ Blob → 下载；不经过网络。
