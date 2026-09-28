# 图片翻转 image-flip（#424）

## 用途 | Purpose

- 本地翻转图片：水平镜像 / 垂直镜像，两个复选框可同时勾选（叠加效果等价于旋转 180°）。
- 输出格式 jpeg / png / webp 可选，JPEG/WebP 可调质量（1–100），PNG 无损。
- Flip images locally: horizontal / vertical mirror; both checkboxes can be combined (equivalent to 180° rotation).
- Output format jpeg / png / webp; adjustable quality (1–100) for JPEG/WebP, lossless for PNG.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                         | Option          | Description                         |
| --------------- | ---------------------------- | --------------- | ----------------------------------- |
| 水平翻转 flipH  | 复选框，默认勾选             | Flip horizontal | Checkbox, checked by default        |
| 垂直翻转 flipV  | 复选框                       | Flip vertical   | Checkbox                            |
| 输出格式 format | jpeg / png / webp            | Format          | jpeg / png / webp                   |
| 质量 quality    | 1–100，默认 80（PNG 不生效） | Quality         | 1–100, default 80 (ignored for PNG) |

- 两个都不勾选时给出提示错误「请至少选择一种翻转方式」，不会静默输出原图。
- Unchecking both shows the error "请至少选择一种翻转方式" instead of silently outputting the original.

## 输出 | Output

- 翻转前后预览、尺寸与翻转方式统计，一键下载（文件名形如 `photo-flipped.jpg`）。
- Before/after preview, size and flip-mode stats, one-click download (e.g. `photo-flipped.jpg`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图翻转后只保留第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。
- 翻转不改变分辨率；原图含透明通道时输出 PNG/WebP 保留透明，JPEG 以黑色填充透明区（Canvas 默认行为）。
- Fully local Canvas processing, no upload.
- Animated GIFs keep only the first frame after flipping (Canvas limitation).
- Unsupported export formats raise an error (e.g. WebP on old browsers).
- Flipping keeps the resolution; JPEG fills transparent areas with black (default Canvas behavior), PNG/WebP preserve transparency.

## 数据流向 | Data flow

文件 → 内存 Canvas（translate 到中心 → scale(±1,±1) → drawImage）→ Blob → 下载；不经过网络。
