# 图片模糊 blur（#432）

## 用途 | Purpose

- 高斯模糊图片：模糊半径 0–50px 可调，全程本地 Canvas 处理，不上传。
- Apply Gaussian blur to an image locally: adjustable radius 0–50px, no upload.
- 与「马赛克 / 像素化」（pixelate）的区别：本工具是高斯**平滑模糊**；pixelate 是色块化。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                        | Option      | Description                    |
| --------------- | --------------------------- | ----------- | ------------------------------ |
| 模糊半径 radius | 0–50px，默认 10             | Blur radius | 0–50px, default 10             |
| 输出格式 format | jpeg / png / webp，默认 png | Format      | jpeg / png / webp, default png |

## 输出 | Output

- 模糊前后对比预览、尺寸与半径统计，一键下载。
- Before/after preview, size and radius stats, one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 滤镜基于 Canvas `ctx.filter`：Chrome / Edge / Firefox 全版本支持；Safari 需 18+（低于此版本的 Safari 会忽略滤镜、输出原图）。
- 半径为 0 时不加滤镜（原样输出）。
- GIF 动图模糊后只保留第一帧（Canvas 限制，页面有说明）。

## 数据流向 | Data flow

文件 → 内存 Canvas（`ctx.filter = 'blur(Npx)'` 一次性绘制）→ Blob → 下载；不经过网络。
