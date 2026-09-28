# 图片转 AVIF image-to-avif（#478）

## 用途 | Purpose

- 一键把图片转成 AVIF：本地 Canvas `toBlob('image/avif')` 重编码，质量 1–100 可调（默认 80），可选限制最大边等比缩放。
- Convert images to AVIF in one click: local Canvas `toBlob('image/avif')` re-encode, adjustable quality (1–100, default 80), optional max-dimension downscaling.
- AVIF 是新一代图片格式：同等画质下体积显著小于 JPEG/WebP，适合网页与分享场景。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                | 说明                         | Option        | Description                          |
| ------------------- | ---------------------------- | ------------- | ------------------------------------ |
| 质量 quality        | 1–100，默认 80               | Quality       | 1–100, default 80                    |
| 最大边 maxDimension | 像素上限，空=不限，上限16384 | Max dimension | Pixel cap, empty=unlimited, max16384 |

## 输出 | Output

- 原图 vs AVIF 预览、体积、体积占比、尺寸统计，一键下载（文件名 `-avif.avif`）。
- Original vs AVIF preview, sizes, size-ratio and dimension stats, one-click download (`-avif.avif`).

## 浏览器支持与特性检测 | Browser support & feature detection

- AVIF **编码**依赖浏览器：Chrome 85+、Edge 84+、Firefox 93+、Safari 16.4+ 等支持 `canvas.toBlob('image/avif')`；旧浏览器不支持。
- 处理前先对 1×1 小 canvas 调用 `toBlob('image/avif')` 做特性探测：返回 null 或抛错 → 页面明确报错「当前浏览器不支持 AVIF 编码」，不静默失败、不输出坏文件。
- 探测逻辑在 `Tool.tsx`（需 DOM），探测结果判定抽成纯函数 `utils.isAvifEncodeSupported`（可单测）。

## 与相近工具的差异 | Differences

- vs #426 image-convert（通用格式互转）：#426 是「AVIF 仅输入、输出 JPEG/PNG/WebP」；本工具是专项一键「转 AVIF」输出（AVIF 仅输出）。
- vs #421 image-compress（图片压缩）：#421 输出 JPEG/PNG/WebP，本工具固定输出 AVIF。

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图只保留第一帧（Canvas 限制，页面有说明）。
- 不支持 AVIF 编码的浏览器会明确报错，换新版浏览器即可。

## 数据流向 | Data flow

文件 → 内存 Canvas → AVIF Blob → 下载；不经过网络。
