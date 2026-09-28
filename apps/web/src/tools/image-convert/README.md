# 图片格式转换 image-convert（#426）

## 用途 | Purpose

- 本地互转图片格式：选择目标格式（JPEG / PNG / WebP），JPEG/WebP 可调质量（1–100，默认 100），PNG 无损。
- Convert image formats locally: pick a target format (JPEG / PNG / WebP); adjustable quality (1–100, default 100) for JPEG/WebP, lossless for PNG.
- 与「图片压缩」（image-compress #421）的区别：本工具专注**格式互转**（默认质量 100、不压画质、无尺寸限制选项）；#421 专注**压体积**（质量 + 最大边两个选项配合缩小文件）。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF（含 AVIF 输入），单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF (AVIF as input included), max 50MB per file.

## 选项 | Options

| 选项            | 说明                                | Option        | Description                           |
| --------------- | ----------------------------------- | ------------- | ------------------------------------- |
| 目标格式 format | jpeg / png / webp                   | Target format | jpeg / png / webp                     |
| 质量 quality    | 1–100，默认 100（PNG 时置灰不生效） | Quality       | 1–100, default 100 (disabled for PNG) |

## 输出 | Output

- 转换前后预览、输出尺寸统计，一键下载（文件名按目标格式替换后缀，如 `photo-converted.jpg`）。
- Before/after preview, output dimension stats, one-click download (extension replaced per target format, e.g. `photo-converted.jpg`).

## 边界 | Limits

- 纯 Canvas 零依赖实现：文档原定可行性 B（wasm-vips），本批改用浏览器 Canvas `toBlob` 编码即可覆盖输出 jpeg/png/webp，故降为 A。
- 全程本地处理，不上传。
- AVIF 仅支持作为**输入**：浏览器 Canvas `toBlob` 不支持 AVIF 编码，AVIF 输出不在本工具范围（界面与本 README 均明确说明）。
- GIF 动图转换后只保留第一帧（Canvas 限制，页面有说明）。
- PNG 为无损格式，质量输入置灰且不生效（界面有常驻说明）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（原尺寸绘制）→ Blob → 下载；不经过网络。
