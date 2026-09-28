# 图片批处理 image-batch（#458）

## 用途 | Purpose

- 多张图片批量处理流水线：一次选择多张图片，统一应用「输出格式（jpeg/png/webp）+ 质量 1–100 + 最大边缩放（0=不限）」，队列逐项处理。
- Batch image pipeline: select multiple images once, apply a unified "output format (jpeg/png/webp) + quality 1–100 + max-dimension limit (0=unlimited)" preset, and process them one by one from a queue.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，可多选/拖拽多张。
- 单文件上限 50MB；**一次最多 20 张**（见「批量上限」）。
- Image files: PNG / JPEG / WebP / GIF / BMP / AVIF, multi-select or drag-and-drop.
- Max 50MB per file; **up to 20 files per batch** (see "Batch limit").

## 选项 | Options

| 选项                | 说明                          | Option        | Description                           |
| ------------------- | ----------------------------- | ------------- | ------------------------------------- |
| 输出格式 format     | jpeg / png / webp             | Format        | jpeg / png / webp                     |
| 质量 quality        | 1–100，默认 80（PNG 不生效）  | Quality       | 1–100, default 80 (ignored for PNG)   |
| 最大边 maxDimension | 像素上限，空=不限，上限 16384 | Max dimension | Pixel cap, empty=unlimited, max 16384 |

## 输出 | Output

- 逐项进度：第 n / 共 N 项 + 进度条；每项状态为等待 / 处理中 / 成功 / 失败（+失败原因）。
- 结果列表：缩略图、原体积 → 新体积、压缩率、逐项下载按钮（文件名带 `-batch` 后缀）。
- 处理中可随时取消：已开始的项会收尾，未开始的项保持等待，可重新开始。
- Per-item progress: n / N plus a progress bar; each item shows pending / processing / success / failed (with reason).
- Result list: thumbnail, original → new size, ratio, per-item download (filenames carry a `-batch` suffix).
- Cancel anytime: in-flight items finish, unstarted items stay pending, and the batch can be restarted.

## 与相近工具的差异 | Differences from similar tools

- vs #421 图片压缩 / #425 图片尺寸调整 / #426 图片格式转换（单张）：本工具是它们的**批量组合版**（压缩 + 缩放 + 转格式流水线），一次配置处理多张；单张精细处理请用它们。
- vs #469 图片水印批量 / #473 图片旋转批量 / #474 图片拼接批量（单功能批量）：本工具是**通用处理流水线**，不是单一功能批量；只需加水印/旋转/拼接请用它们。
- vs #421 image-compress / #425 image-resize / #426 image-convert (single image): this tool is their **batched combination** (compress + resize + convert pipeline); use them for single-image fine work.
- vs #469 watermark-batch / #473 rotate-batch / #474 merge-batch (single-feature batch): this tool is a **general processing pipeline**, not a single-feature batch.

## 批量上限 | Batch limit

- 一次最多 20 张：处理时每张图同时驻留「原图 Image + Canvas 位图 + 输出 Blob」三份内存，上限是浏览器内存安全边界，超出会直接报错。
- 并发上限 3 张：Canvas 编解码吃内存，并发过高易 OOM；处理完及时释放对象 URL。
- 重新选择文件、重新开始或重置时，上一轮结果的对象 URL 会被释放，避免内存泄漏。
- Up to 20 files per batch: each image transiently holds the source Image, the Canvas bitmap and the output Blob in memory; the cap is a browser memory safety boundary.
- At most 3 concurrent items to avoid OOM; object URLs are revoked as soon as results are discarded.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- PNG 为无损格式，质量参数不生效。
- GIF 动图处理后只保留第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会使对应项失败并显示原因（如旧浏览器导出 WebP）。
- 选项非法（如质量超出 1–100）时点击开始会报错且不处理任何项。

## 数据流向 | Data flow

文件 → 内存 Canvas（最多 3 并发）→ Blob → 下载；不经过网络。
