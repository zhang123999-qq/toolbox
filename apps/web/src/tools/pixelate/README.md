# 像素化 pixelate（#450）

## 用途 | Purpose

- 像素化艺术效果：把图片处理成复古像素风，像素块大小可调（2–64px），块越大颗粒越粗。
- Retro pixel-art effect: turn images into vintage pixel style with adjustable block size (2–64px); larger blocks, chunkier pixels.
- 与「马赛克打码」（mosaic #431）的区别：本工具是**艺术风格化**（复古像素风），mosaic 是**隐私遮挡**打码。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                 | 说明                         | Option           | Description                     |
| -------------------- | ---------------------------- | ---------------- | ------------------------------- |
| 像素块大小 pixelSize | 2–64 整数，默认 8（单位 px） | Pixel block size | Integer 2–64, default 8 (in px) |
| 输出格式 format      | jpeg / png / webp，默认 png  | Format           | jpeg / png / webp, default png  |

## 输出 | Output

- 像素化前后预览、尺寸与像素块大小统计，一键下载。
- Before/after preview, dimension and block-size stats, one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图只保留第一帧（Canvas 限制，页面有说明）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（先缩小再关闭平滑放大，形成色块）→ Blob → 下载；不经过网络。
