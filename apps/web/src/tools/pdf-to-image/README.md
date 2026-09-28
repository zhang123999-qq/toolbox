# PDF 转图片 pdf-to-image（#462）

## 用途 | Purpose

- 上传 PDF，按 DPI 将页面渲染为 PNG/JPEG 位图，支持选择页面，每页独立预览与下载。
- Upload a PDF and render its pages to PNG/JPEG bitmaps at the chosen DPI, with page selection; each page gets its own preview and download button.
- 与「PDF 图片提取」（pdf-to-image-extract #494）的区别：本工具是**整页渲染为位图**（所见即所得，含文字与矢量图形的光栅化结果）；#494 是**提取 PDF 文件内嵌的图片对象**（原图抠取，不做渲染）。

## 输入 | Input

- PDF 文件（.pdf），单文件上限 50MB。
- PDF file (.pdf), max 50MB per file.

## 选项 | Options

| 选项            | 说明                       | Option | Description                       |
| --------------- | -------------------------- | ------ | --------------------------------- |
| DPI dpi         | 72 / 150 / 300，默认 150   | DPI    | 72 / 150 / 300, default 150       |
| 页面 pages      | all=全部，或页码如 1,3,5-7 | Pages  | all, or page numbers like 1,3,5-7 |
| 输出格式 format | png / jpeg                 | Format | png / jpeg                        |

## pdfjs worker 说明 | pdfjs worker

- 使用 pdfjs-dist（v6.3.289，已随项目安装）解析与渲染 PDF。
- `pdfjsLib.GlobalWorkerOptions.workerSrc` 指向打包在本地的 `pdfjs-dist/build/pdf.worker.min.mjs`，worker 文件随应用一起部署，不走外部 CDN，全程本地。
- 渲染流程：`getDocument({ data })` → `getPage(n)` → `getViewport({ scale: dpi / 72 })` → `page.render()` 到 Canvas → 导出 Blob。

## DPI 说明 | DPI

- DPI 决定渲染分辨率：缩放比例 = DPI / 72（PDF 基准 72 DPI）。
- 选项封顶 300 DPI：更高 DPI 会使大页面 Canvas 尺寸超过浏览器安全上限（单边 16384px / 总像素 16384²），渲染前会校验并报错提示降低 DPI。
- 150 DPI 是清晰度与文件体积的平衡默认值；文字阅读建议 150–300，缩略图可用 72。

## 输出 | Output

- 每页独立预览图（显示页码与渲染尺寸）与下载按钮，文件名形如 `report-p1.png`。
- Per-page preview (with page number and rendered size) and download button, e.g. `report-p1.png`.

## 边界 | Limits

- 全程本地 pdfjs + Canvas 处理，不上传。
- 单文件上限 50MB。
- 加密/需要密码的 PDF 无法解析，会报错。
- DPI 封顶 300；超大页面即使 72 DPI 也可能超出 Canvas 上限，此时会报错。
- 输出为位图：文字不可选中复制，如需可复制文本请用 PDF 文本提取类工具。

## 数据流向 | Data flow

文件 → pdfjs 解析 → 内存 Canvas → Blob → 逐页下载；不经过网络。
