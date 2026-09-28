# 九宫格切图 grid-image（#441）

## 用途 | Purpose

- 单张图片按 rows×cols 网格切成小块（默认 3×3 九宫格），每块独立预览、独立下载。
- Split one image into a rows×cols grid of tiles (default 3×3 nine-grid), each tile previewed and downloadable separately.
- 与「多图拼接」（#439 merge 系）的区别：本工具是**切图**——输入为一张图片，输出为多块；多图拼接是**拼图**——输入为多张图片，输出为一张。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                         | Option  | Description                         |
| --------------- | ---------------------------- | ------- | ----------------------------------- |
| 行数 rows       | 1–10，默认 3                 | Rows    | 1–10, default 3                     |
| 列数 cols       | 1–10，默认 3                 | Columns | 1–10, default 3                     |
| 输出格式 format | jpeg / png / webp            | Format  | jpeg / png / webp                   |
| 质量 quality    | 1–100，默认 90（PNG 不生效） | Quality | 1–100, default 90 (ignored for PNG) |

## 输出 | Output

- rows×cols 网格预览：每块 tile 缩略图（尺寸与字节数标注）。
- 每块一个独立下载按钮，文件名形如 `photo-r1c1.jpg`（行列从 1 起，原扩展名替换）。
- Grid preview of rows×cols tiles with size/byte annotations.
- One download button per tile, file names like `photo-r1c1.jpg` (1-based row/col, original extension replaced).

## 边界 | Limits

- 余数吸收规则：宽/高不能被列数/行数整除时，余数像素由最后一列/最后一行吸收（基础块尺寸为 floor 取整），所有 tile 无缝覆盖全图、无间隙、无重叠，面积之和恒等于原图面积。
- 网格数超过图片尺寸（如 5px 宽切 10 列）会报错，不生成 0 宽度的坏块。
- 单文件 50MB 上限；GIF 动图切分后每块只保留第一帧（Canvas 限制）。
- tile 的 object URL 在重置、重新切分、页面卸载时全部释放，避免内存泄漏。
- 全程本地 Canvas 处理，不上传。

## 数据流向 | Data flow

文件 → loadImageFromBlob → 逐 tile drawImage 到独立 Canvas → canvasToBlob → object URL 预览 → 下载；不经过网络。
