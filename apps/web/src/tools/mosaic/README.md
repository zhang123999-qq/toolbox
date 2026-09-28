# 马赛克 mosaic（#431）

## 用途 | Purpose

- 对图片整体做马赛克打码：按可调块大小（4–64px）像素化整张图片，用于隐私遮挡/打码场景。
- Apply mosaic redaction to the whole image: pixelate with an adjustable block size (4–64px), for privacy masking scenarios.
- 与「像素化」（pixelate #450）的区别：本工具定位是**隐私打码/遮挡**；pixelate 定位**像素艺术风格**。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项             | 说明                        | Option     | Description                    |
| ---------------- | --------------------------- | ---------- | ------------------------------ |
| 块大小 blockSize | 4–64 像素整数，默认 16      | Block size | 4–64 px integer, default 16    |
| 输出格式 format  | jpeg / png / webp，默认 png | Format     | jpeg / png / webp, default png |

## 输出 | Output

- 原图 / 马赛克后前后对比预览、尺寸与块大小统计，一键下载（文件名如 `photo-mosaic.png`）。
- Before/after preview, dimension and block-size stats, one-click download (e.g. `photo-mosaic.png`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图处理后只保留第一帧（Canvas 限制，页面有说明）。
- 块大小大于图片边时内部已保底（drawPixelated 用 max(1,·)），不会崩溃。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（drawPixelated 像素化） → Blob → 下载；不经过网络。
