# PDF 提取文本 pdf-to-text（#493）

## 用途 | Purpose

- 逐页提取 PDF 的文本内容：pdfjs-dist `getTextContent()` 读取每页文本项，
  用 `item.hasEOL` 与 y 坐标分行、同行按 x 间隙补空格，还原基本排版。
- Extract text from each PDF page via pdfjs-dist `getTextContent()`:
  lines are restored from `item.hasEOL` and y coordinates, spaces from x gaps.

## 输入 | Input

- PDF 文件（单文件上限 50MB，按 `%PDF` 魔数校验）。
- PDF file (max 50MB per file, validated by `%PDF` magic bytes).

## 输出 | Output

- 逐页文本预览（空文本页显示占位，不崩溃）。
- 一键复制全文；下载 `.txt`（页与页之间用分页分隔符 `\f` 连接）。
- Page-by-page preview (empty pages show a placeholder instead of crashing).
- Copy full text in one click; download `.txt` (pages joined by form-feed `\f`).

## 选项 | Options

- 无。本工具固定全量逐页提取。
- None. Always extracts all pages.

## 边界 | Limits

- 全程本地 pdfjs-dist 处理，不上传；pdfjs worker 为本地打包版本，不走 CDN。
- 加密 PDF 明确报错（需先解密）；损坏的 PDF 报错。
- 整篇无可提取文本时显示空状态（可能是扫描件，可尝试 OCR 工具 #500）。
- 可行性说明：文档原标注 B（pdfjs），但本实现为纯 JS（pdfjs-dist 非 wasm 核心），
  worker/wasm/api 全 false，故记为 A。
- All processing is local via pdfjs-dist, no upload; the pdfjs worker is bundled
  locally, not loaded from a CDN.
- Encrypted PDFs get an explicit error (decrypt first); corrupted PDFs error out.
- A clear empty state is shown when no text can be extracted (likely a scanned
  document — try the OCR tool #500).

## 数据流向 | Data flow

文件 → pdfjs-dist（内存解析）→ 文本 → 预览 / 剪贴板 / .txt 下载；不经过网络。
