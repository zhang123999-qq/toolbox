# 图片裁剪 image-crop（#422）

## 用途 | Purpose

- 本地裁剪图片：上传后设置裁剪矩形（x/y/宽/高，像素，数字输入框），支持纵横比预设（自由/1:1/4:3/3:4/16:9/9:16）与快捷按钮（居中正方形/最大区域）。
- 原图上用 CSS 绝对定位遮罩实时显示裁剪区域，裁剪后预览 + 一键下载。
- Crop images locally: set the crop rectangle (x/y/width/height in px) via numeric inputs, with aspect-ratio presets (free/1:1/4:3/3:4/16:9/9:16) and quick buttons (center square / max area). A CSS absolutely-positioned overlay shows the crop area live on the original; preview and one-click download after cropping.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                 | 说明                                             | Option       | Description                                                     |
| -------------------- | ------------------------------------------------ | ------------ | --------------------------------------------------------------- |
| 纵横比 aspectRatio   | 自由/1:1/4:3/3:4/16:9/9:16，切换时由宽算高并居中 | Aspect ratio | free/1:1/4:3/3:4/16:9/9:16; height derived from width, centered |
| X / Y                | 裁剪矩形左上角坐标（像素，非负整数）             | X / Y        | Top-left of crop rect in px (non-negative integers)             |
| 宽 / 高 width/height | 裁剪矩形尺寸（像素，非负整数）                   | Width/Height | Crop rect size in px (non-negative integers)                    |
| 输出格式 format      | jpeg / png / webp                                | Format       | jpeg / png / webp                                               |
| 质量 quality         | 1–100，默认 80（PNG 不生效）                     | Quality      | 1–100, default 80 (ignored for PNG)                             |

## 输出 | Output

- 裁剪后预览、裁剪尺寸/格式/体积统计，一键下载（文件名如 `photo-cropped.jpg`）。
- Cropped preview, size/format/byte stats, one-click download (e.g. `photo-cropped.jpg`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 首次上传默认裁剪矩形为最大区域（整图）。
- 裁剪矩形自动钳制到图片范围内：坐标越界贴边，宽高至少 1px。
- 裁剪参数须为非负整数（上限 16384）；非法输入显示错误，不执行裁剪。
- PNG 为无损格式，质量选项不生效。
- GIF 动图裁剪后只保留第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（按钳制后的矩形 drawImage 裁剪）→ Blob → 下载；不经过网络。
