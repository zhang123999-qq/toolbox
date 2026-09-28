# 图片压缩 image-compress（#421）

## 用途 | Purpose

- 本地压缩图片体积：JPEG/WebP 可调质量（1–100），PNG 无损重编码，可选限制最大边等比缩放。
- Compress images locally: adjustable quality (1–100) for JPEG/WebP, lossless re-encode for PNG, optional max-dimension downscaling.
- 与「压缩到指定大小」（compress-size #460）的区别：本工具按**质量/格式**压缩；compress-size 按**目标字节数**二分逼近质量。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                | 说明                         | Option        | Description                          |
| ------------------- | ---------------------------- | ------------- | ------------------------------------ |
| 输出格式 format     | jpeg / png / webp            | Format        | jpeg / png / webp                    |
| 质量 quality        | 1–100，默认 80（PNG 不生效） | Quality       | 1–100, default 80 (ignored for PNG)  |
| 最大边 maxDimension | 像素上限，空=不限，上限16384 | Max dimension | Pixel cap, empty=unlimited, max16384 |

## 输出 | Output

- 压缩前后预览、尺寸与压缩率统计，一键下载。
- Before/after preview, size and ratio stats, one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- PNG 为无损格式，质量滑杆不生效（界面仍保留，避免用户困惑处有说明）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。
- GIF 动图压缩后只保留第一帧（Canvas 限制，页面有说明）。

## 数据流向 | Data flow

文件 → 内存 Canvas → Blob → 下载；不经过网络。
