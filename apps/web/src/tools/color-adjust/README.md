# 调色 color-adjust（#435）

## 用途 | Purpose

- 本地精细调色：色温（冷暖）、色调（品绿）、曝光三项像素级调整。
- Fine-tune color locally: pixel-level temperature, tint, and exposure adjustments.
- 与 #436（亮度/对比度）、#437（饱和度）、#438（色相）不重叠：本工具只做色温/色调/曝光。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项             | 说明                                     | Option      | Description                                  |
| ---------------- | ---------------------------------------- | ----------- | -------------------------------------------- |
| 色温 temperature | −100–100，默认 0；负值偏冷蓝，正值偏暖黄 | Temperature | −100–100, default 0; cold blue ↔ warm yellow |
| 色调 tint        | −100–100，默认 0；负值偏绿，正值偏品红   | Tint        | −100–100, default 0; green ↔ magenta         |
| 曝光 exposure    | −100–100，默认 0；负值压暗，正值提亮     | Exposure    | −100–100, default 0; darken ↔ brighten       |
| 输出格式 format  | jpeg / png / webp，默认 png              | Format      | jpeg / png / webp, default png               |

## 输出 | Output

- 调色前后对比预览、尺寸与文件大小统计，一键下载。
- Before/after preview, dimension and file-size stats, one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 三项全为 0 时输出与原图像素一致。
- GIF 动图只保留第一帧（Canvas 限制）。
- 曝光 −100 时整图全黑。

## 数据流向 | Data flow

文件 → 内存 Canvas（getImageData 像素级调色 → putImageData）→ Blob → 下载；不经过网络。
