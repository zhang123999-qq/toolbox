# PDF OCR pdf-ocr（#500）

## 用途 | Purpose

- 上传 PDF，逐页渲染为图片（144 DPI）后在浏览器本地 OCR 识别中英文文字，合并为按页标注页码的可复制文本，可下载 `.txt`。
- Upload a PDF to render each page as an image (144 DPI) and recognize Chinese/English text locally in the browser, merged into copyable text with page markers, downloadable as `.txt`.
- 与「PDF 提取文本」（pdf-to-text #493）的区别：本工具识别的是**扫描版/图片型 PDF 的像素文字**；pdf-to-text 提取的是文本型 PDF 内嵌的文本层。

## 输入 | Input

- PDF 文件：`%PDF` 魔数校验，单文件上限 50MB。
- PDF file: `%PDF` magic-number check, max 50MB per file.

## 选项 | Options

| 选项            | 说明             | Option  | Description                  |
| --------------- | ---------------- | ------- | ---------------------------- |
| 简体中文 chiSim | 勾选识别简体中文 | Chinese | Recognize Simplified Chinese |
| 英文 eng        | 勾选识别英文     | English | Recognize English            |

至少选择一种语言。

## 输出 | Output

- 合并文本：每页以 `—— 第 N 页 ——` 标注分隔，空页填 `（本页未识别出文字）` 占位行，识别失败的页面记为 `—— 第 N 页（识别失败：原因） ——` 并继续下一页。
- 页数/字符数统计、失败页提示；一键复制、下载 `.txt`（原名去扩展名 + `-ocr.txt`）。
- Merged text with `—— 第 N 页 ——` page markers; empty pages get a placeholder line; failed pages are recorded inline without aborting the whole job.
- Page/character stats, failed-page notice; one-click copy and `.txt` download.

## 边界 | Limits

- **加密 PDF 不支持**：会明确提示先解密（可用 #490 PDF 解密）。
- 逐页进度条 + 当前页码，支持取消；取消后不保留部分结果。
- 单页渲染尺寸超过 Canvas 像素上限（16384²）时该页记为失败并跳过。
- 识别在单独的 tesseract worker 线程中进行；任务结束/取消/组件卸载时终止 worker，逐页释放 canvas 内存，PDF 文档及时销毁。

## 数据流向 | Data flow

文件 → 内存（pdfjs 渲染 canvas → tesseract 识别 → 文本）→ 下载；**PDF 本身不上传**。

例外：tesseract.js 的识别引擎与语言包在**首次使用时从 CDN 下载**（约十几 MB，之后浏览器缓存），页面顶部有显著告知（`pdfOcr.cdnNotice`）。
