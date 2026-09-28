# PDF 转 Word pdf-to-word（#495）

## 用途 | Purpose

- 将 PDF 文档转换为 Word（.docx）：pdfjs-dist 逐页提取文本内容，`docx` 库生成 .docx 文件。
- Convert PDF to Word (.docx): pdfjs-dist extracts text page by page, the `docx` library builds the .docx file.
- 每页文本生成段落，页与页之间自动插入分页符；转换完成后一键下载。
- Each page's text becomes paragraphs with automatic page breaks between pages; one-click download when done.

## 输入 | Input

- PDF 文件（.pdf），单文件上限 50MB；上传前校验 `%PDF-` 魔数。
- PDF file (.pdf), max 50MB per file; `%PDF-` magic bytes verified on upload.
- 加密 PDF 明确报错（不支持解密转换）。

## 输出 | Output

- `.docx` 文件（原名 + `-converted.docx`），含转换页数信息，一键下载。
- A `.docx` file (original name + `-converted.docx`) with page-count info, one-click download.

## 边界 | Limits

- **排版保真度有限：仅提取纯文本流生成 Word，不还原原文档的复杂版式、表格、图片与字体样式。**
- **Limited layout fidelity: only the plain text stream is extracted; complex layouts, tables, images and font styling from the original are NOT preserved.**
- 无文本层的扫描版 PDF 转换结果为空（每页保留一个空段落占位，页码不错位）。
- 大文件逐页提取并显示进度（正在转换 n/N 页）。
- 全程本地处理，不上传。

## 数据流向 | Data flow

文件 → pdfjs-dist（本地 worker）逐页 getTextContent → 文本行 → docx Document → Packer.toBlob → 下载；不经过网络。

## 依赖说明 | Dependencies

- `pdfjs-dist@6.3.289`（已安装）：PDF 文本提取。
- `docx@^9.7.2`（MIT）：纯 JS 的 Word（.docx/OOXML）生成库，无 GPL 系传染性，用于替代"纯 JS"路线中缺失的 Word 写入能力。
