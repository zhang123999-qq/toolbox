# 图片压缩对比 compress-compare（#470）

## 用途 | Purpose

- 单张图片输入，一键生成 6 组固定压缩方案并排对比：每组一张卡片（方案名、预览缩略图、体积、压缩率、尺寸、独立下载按钮），顶部另有原图卡片（体积/尺寸），体积最小的方案标「最小」徽标，方便横向选优下载。
- Upload one image to generate 6 fixed compression presets side by side — each a card (preset name, thumbnail, size, ratio, dimensions, dedicated download button), plus an original-image card on top; the smallest preset gets a "smallest" badge for easy comparison and download.
- 与 #421 image-compress（单方案压缩下载）的区别：本工具是**多方案并排对比选优**，输出多张方案卡片供横向比较，而非单次压缩即下载。
- 与 #479 image-slider（两图滑块拖拽对比）的区别：本工具是**参数方案表格式对比**，以卡片表格呈现各方案的体积/压缩率/尺寸，而非滑块拖拽的视觉对比。

## 输入 | Input

- 单张图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Single image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 方案 | Presets

6 组方案纯前端写死（保证可测），卡片按以下顺序展示：

| 方案 id  | 说明           | 输出文件名后缀 |
| -------- | -------------- | -------------- |
| jpeg-q90 | JPEG 质量 90   | -q90.jpg       |
| jpeg-q70 | JPEG 质量 70   | -q70.jpg       |
| jpeg-q50 | JPEG 质量 50   | -q50.jpg       |
| webp-q80 | WebP 质量 80   | -q80.webp      |
| webp-q60 | WebP 质量 60   | -q60.webp      |
| png      | PNG 无损重编码 | -png.png       |

用户可勾选启用/禁用其中几组（至少保留 1 组；全部取消时给出提示且不执行）。方案变更后若已有原图，会自动用新组合重新对比；也可随时点「重新对比」按钮手动重跑。

## 输出 | Output

- 原图卡片：体积与尺寸。
- 方案卡片：方案名、预览缩略图、体积、压缩率（相对原图）、尺寸、独立下载按钮；体积最小者标「最小」徽标。
- Original card: size and dimensions. Preset cards: name, thumbnail, size, ratio vs. original, dimensions, dedicated download button; the smallest gets a "smallest" badge.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传；6 组方案串行生成（内存安全），旧结果的 objectURL 及时释放。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。
- GIF 动图各方案只保留第一帧（Canvas 限制）。
- 压缩率 = 方案体积 / 原图体积，保留 1 位小数。

## 数据流向 | Data flow

文件 → 内存 Canvas（原尺寸绘制一次）→ 6 组方案串行导出 Blob → 卡片预览/下载；不经过网络。
