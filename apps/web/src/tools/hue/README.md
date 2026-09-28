# 色相调整 hue（#438）

## 用途 | Purpose

- 本地旋转图片色相：-180°~+180° 可调，基于 Canvas `ctx.filter` 的 `hue-rotate()` 实现；hue=0 时滤镜为 `none`，输出与原图一致。
- Rotate image hue locally from -180° to +180° via Canvas `ctx.filter` `hue-rotate()`; hue=0 uses `none`, so the output is identical to the original.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                        | Option | Description                    |
| --------------- | --------------------------- | ------ | ------------------------------ |
| 色相 hue        | -180..180 整数，默认 0      | Hue    | Integer -180..180, default 0   |
| 输出格式 format | jpeg / png / webp，默认 png | Format | jpeg / png / webp, default png |

## 输出 | Output

- 调整前后对比预览、尺寸与文件大小统计，一键下载（文件名后缀 `-hue`）。
- Before/after preview, dimensions and file-size stats, one-click download (filename suffix `-hue`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- `ctx.filter` 浏览器支持：Chrome / Edge / Firefox 全版本支持；Safari 18+ 支持（页面有说明）。
- GIF 动图只保留第一帧（Canvas 限制，页面有说明）。
- hue=0 时输出与原图一致（滤镜为 `none`，仅按所选格式重编码）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（`hue-rotate()` 滤镜绘制）→ Blob → 下载；不经过网络。
