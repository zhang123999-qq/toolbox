# PDF 提取图片 pdf-to-image-extract（#494）

## 用途 | Purpose

- 提取 PDF 文档中**内嵌的图片对象**（原图数据），逐张预览并下载为 PNG/JPEG。
- Extract the **embedded image objects** (original image data) from a PDF; preview each one and download as PNG/JPEG.
- 全程本地处理（pdfjs-dist 纯 JS 解析），不上传。

## 与 #462 的区别 | Difference from pdf-to-image (#462)

- **本工具（#494）提取内嵌图片**：解析每页的 operatorList，找出 `paintImageXObject` /
  `paintInlineImageXObject` 操作，从 `page.objs` 取出图片对象（`{width, height, kind, data}`），
  归一化为 RGBA 后导出。拿到的是 PDF 里原本嵌入的图片（接近原图），不含页面上的文字/矢量图形。
- **#462（PDF 转图片）是整页渲染**：按 DPI 把整个页面光栅化为一张位图，图片只是页面的一部分。
- This tool (#494) extracts embedded image objects; #462 renders whole pages to bitmaps.
- 一句话：想要"PDF 里的原图"用本工具；想要"某一页长什么样"用 #462。

## 输入 | Input

- 单个 PDF 文件（点击选择或拖拽），单文件上限 50MB；按 `%PDF-` 魔数校验。
- A single PDF file (click or drag-and-drop), max 50MB per file, validated by the `%PDF-` magic number.

## 选项 | Options

| 选项            | 说明       | Option | Description |
| --------------- | ---------- | ------ | ----------- |
| 输出格式 format | PNG / JPEG | Format | PNG / JPEG  |

## 输出 | Output

- 每张提取出的图片独立预览卡片：缩略图 + "图片 N · 第 M 页 · 宽×高" + 单独下载按钮。
- 文件名：`原名-p{页码}-img{序号}.png|.jpg`（如 `report.pdf` → `report-p1-img1.png`）。
- 顶部显示"共提取 N 张图片"；数据异常被跳过的图片会计数提示。
- Each image gets its own preview card with an individual download button.
  File name: `{base}-p{page}-img{index}.png|.jpg`.

## 边界 | Limits

- **只提取内嵌图片对象**：纯文字/矢量页、扫描件里"看起来像图但实际是整页位图"的 PDF，
  若其图片是以整页形式存放的则能提取；若 PDF 里根本没有内嵌图片对象，会显示明确的空状态。
- **1-bit 遮罩（ImageMask）不提取**：它们是单色遮罩而非照片，解析时自动过滤。
- **数量上限**：单个 PDF 最多提取 200 张（`MAX_IMAGES`），超出时截断并提示。
- **单张尺寸上限**：单边 ≤16384 像素（与 #462 一致），超限的图片计入跳过。
- **加密 PDF**：pdfjs 无法在无密码时解析，会明确报错"PDF 已加密，不支持提取图片"。
- **无打包下载**：项目当前没有 zip 能力（fflate 尚未引入，#515/#516 才规划），
  因此只提供逐张下载，不提供"全部打包下载"。如后续引入 fflate 可再加。
- Encrypted PDFs are rejected with a clear error; image count is capped at 200 per PDF;
  no batch-zip download (no fflate in the project yet) — download images one by one.

## 数据流向 | Data flow

文件 → 内存（pdfjs 解析 operatorList / 图片对象）→ canvas → Blob → 下载；全程本地，不经过网络。

## 实现说明 | Implementation notes

- pdfjs worker 使用与 pdfjs-dist 打包在一起的本地 `pdf.worker.min.mjs`，不走 CDN。
- 图片数据归一化：pdfjs 只产出 `RGBA_32BPP` / `RGB_24BPP` / `GRAYSCALE_1BPP` 三种 kind，
  统一转为 RGBA 后经 `createImageData` + `putImageData` 画到 canvas 再导出。
- 可行性记为 A：pdfjs-dist 为纯 JS（非 wasm 核心），worker/wasm/api 全为 false（与 #462 同例）。
