# 图片锐化 sharpen（#433）

## 用途 | Purpose

- 本地锐化图片：3×3 卷积核 `[[0,-k,0],[-k,1+4k,-k],[0,-k,0]]`（k = 强度/100）增强边缘清晰度，锐化强度 0–100 可调。
- Sharpen images locally: 3×3 convolution kernel `[[0,-k,0],[-k,1+4k,-k],[0,-k,0]]` (k = strength/100) enhances edge clarity, strength adjustable 0–100.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项              | 说明                        | Option   | Description                           |
| ----------------- | --------------------------- | -------- | ------------------------------------- |
| 锐化强度 strength | 0–100 整数，默认 50；0=原图 | Strength | 0–100 integer, default 50; 0=original |
| 输出格式 format   | jpeg / png / webp，默认 png | Format   | jpeg / png / webp, default png        |

## 输出 | Output

- 锐化前后对比预览、尺寸与强度统计，一键下载（文件名后缀 `-sharpen`）。
- Before/after preview, size and strength stats, one-click download (filename suffix `-sharpen`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 卷积数学在 `utils.ts` 纯函数中实现（操作 `Uint8ClampedArray`，不碰 DOM）；边缘像素用 clamp 复制边缘，alpha 通道原样保留。
- 强度为 0 时输出与原图一致。
- GIF 动图锐化后只保留第一帧（Canvas 限制，页面有说明）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 解码 → 内存 Canvas（getImageData 取像素 → 纯函数卷积 → putImageData 写回）→ Blob → 下载；不经过网络。
