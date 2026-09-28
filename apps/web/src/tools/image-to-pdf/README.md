# 图片转 PDF image-to-pdf（#461）

## 用途 | Purpose

- 上传多张图片，合并为一个 PDF（每图一页），一键下载。
- Upload multiple images and merge them into one PDF (one page per image), then download.

## 输入 | Input

- 图片文件（可多选）：PNG / JPEG / WebP / GIF / BMP / AVIF，每文件上限 50MB（单独校验）。
- Image files (multi-select): PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file (checked individually).

## 选项 | Options

| 选项              | 说明                                               | Option    | Description                                          |
| ----------------- | -------------------------------------------------- | --------- | ---------------------------------------------------- |
| 页面尺寸 pageSize | 适应图片 / A4 / Letter                             | Page size | Fit image / A4 / Letter                              |
| 页边距 margin     | mm，默认 0，范围 0–50                              | Margin    | mm, default 0, range 0–50                            |
| 排序 order        | 列表中每项可上移 / 下移 / 删除，生成顺序即列表顺序 | Order     | Move up/down/delete per item; PDF follows list order |

## 输出 | Output

- 生成的多页 PDF 文件（`首图名-merged.pdf`），附页数与文件大小信息，一键下载。
- The merged multi-page PDF (`<first-image>-merged.pdf`) with page count and size info, one-click download.

## pdf-lib 说明 | pdf-lib notes

- 使用 `pdf-lib`（纯 JS，无 wasm）构建 PDF：`PDFDocument.create()` → 按图片类型
  `embedJpg` / `embedPng` → `addPage([w, h])` → `drawImage` → `save()` 得到字节数组，
  再包成 `application/pdf` 的 Blob 下载。
- JPEG/PNG 直接嵌入；WebP/GIF/BMP/AVIF 等先经 Canvas 转 PNG（`canvasToBlob`）再 `embedPng`。
- 图片尺寸通过 `loadImageFromBlob` 读取，用于计算页面版式（图片在页内按边距等比适配并居中）。

## 边界 | Limits

- 单文件上限 50MB（每文件单独校验，超限整批拒绝加入）。
- 页边距超过 50mm 会报错；页面尺寸固定为 pt 单位（A4 = 595.28×841.89pt，Letter = 612×792pt）。
- GIF 动图只取第一帧（Canvas 限制）。
- 全程本地处理，不上传。

## 数据流向 | Data flow

文件 → 内存（pdf-lib 文档对象）→ PDF Blob → 下载；不经过网络。
