# 图片转 WebP image-to-webp（#477）

## 用途 | Purpose

- 一键把图片转为 WebP 格式：WebP 质量 1–100 可调（默认 80），可选限制最大边等比缩放。
- Convert images to WebP in one click: adjustable WebP quality (1–100, default 80), optional max-dimension downscaling.

## WebP 说明 | About WebP

- WebP 是 Google 推出的现代图片格式：同等画质下体积通常比 JPEG 小 25%–35%，且支持透明通道（JPEG 不支持）。
- 本工具调用浏览器 Canvas 原生 `toBlob('image/webp', quality)` 编码，纯前端本地实现，无需 wasm 依赖。
- WebP is Google's modern image format: typically 25%–35% smaller than JPEG at comparable quality, with alpha-channel support.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                | 说明                         | Option        | Description                          |
| ------------------- | ---------------------------- | ------------- | ------------------------------------ |
| 质量 quality        | WebP 质量 1–100，默认 80     | Quality       | WebP quality 1–100, default 80       |
| 最大边 maxDimension | 像素上限，空=不限，上限16384 | Max dimension | Pixel cap, empty=unlimited, max16384 |

## 输出 | Output

- 原图 vs WebP 预览、体积、压缩率、尺寸统计，一键下载（文件名形如 `photo-webp.webp`）。
- Before/after preview, size and ratio stats, one-click download (e.g. `photo-webp.webp`).

## 与相近工具的边界 | Differences

- vs **#426 image-convert**（通用格式互转：多格式输入 → JPEG/PNG/WebP 输出，可选质量）：本工具是专项一键「转 WebP」，无输出格式选项，参数聚焦 WebP 质量。
- vs **#421 image-compress**（按质量/格式压缩，输出格式三选一）：本工具固定输出 WebP，定位是「一键转 WebP」而非通用压缩。

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 输出固定为 WebP；浏览器不支持 WebP 编码时会报错（如极旧浏览器）。
- GIF 动图转换后只保留第一帧（Canvas 限制，页面有说明）。

## 数据流向 | Data flow

文件 → 内存 Canvas → WebP Blob → 下载；不经过网络。
