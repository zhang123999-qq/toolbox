# EXIF 清除 exif-remove（#445）

## 用途 | Purpose

- 清除图片中的 EXIF / GPS / 缩略图等元数据，保护隐私后分享。
- Strip EXIF / GPS / thumbnail metadata from images before sharing.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明       | Option | Description |
| --------------- | ---------- | ------ | ----------- |
| 输出格式 format | jpeg / png | Format | jpeg / png  |

- JPEG 输出质量固定为 92（`JPEG_QUALITY = 0.92`），PNG 为无损重编码。
- JPEG output quality is fixed at 92; PNG is losslessly re-encoded.

## 输出 | Output

- 清除前后预览、原图大小 / 新图大小 / 节省量（字节与百分比）/ 图片尺寸四项对比，一键下载。
- Before/after preview, comparison of original size / new size / saved bytes (with %) / dimensions, one-click download.
- 输出文件名：原名去扩展名 + `-noexif` + 新扩展名（如 `photo-noexif.jpg`）。

## 边界 | Limits

- 原理：Canvas 重编码只保留像素数据，不保留 EXIF 等任何元数据——剥离是绘制机制的天然结果，无需解析 EXIF 结构。
- 全程本地处理，不上传。
- GIF 动图只保留第一帧（Canvas 限制，页面有说明）。
- PNG 重编码后体积可能略大于原图（属正常现象，对比区会如实显示）。

## 数据流向 | Data flow

文件 → 内存 Canvas（原尺寸绘制）→ Blob → 下载；不经过网络。
