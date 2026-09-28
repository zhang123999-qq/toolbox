# PDF 转 PPT pdf-to-ppt（#497）

## 用途 | Purpose

- 将 PDF 文档转换为 PPT（.pptx）：pdfjs-dist 逐页提取带坐标的文本内容，按基线分组为文本行，`pptxgenjs` 库生成 .pptx 文件。
- Convert PDF to PPT (.pptx): pdfjs-dist extracts positioned text page by page, groups it into lines by baseline, and the `pptxgenjs` library builds the .pptx file.
- 每页 PDF 对应一张幻灯片，文本按原坐标放置为文本框；转换完成后一键下载。
- Each PDF page becomes one slide, with text placed as text boxes at the original coordinates; one-click download when done.

## 输入 | Input

- PDF 文件（.pdf），单文件上限 50MB；上传前校验 `%PDF-` 魔数。
- PDF file (.pdf), max 50MB per file; `%PDF-` magic bytes verified on upload.
- 加密 PDF 明确报错（不支持解密转换）。

## 输出 | Output

- `.pptx` 文件（原名 + `-converted.pptx`），含转换页数信息，一键下载。
- A `.pptx` file (original name + `-converted.pptx`) with page-count info, one-click download.

## 边界 | Limits

- **排版保真度有限：仅提取文本内容按坐标生成文本框，不保留原文档的复杂版式、图片、表格、字体与颜色样式。**
- **Limited layout fidelity: only text content is extracted into positioned text boxes; complex layouts, images, tables, fonts and color styling from the original are NOT preserved.**
- 无文本层的扫描版 PDF 转换结果为空白幻灯片（每页仍生成一张幻灯片，页码不错位）。
- pptxgenjs 要求整份文稿使用单一幻灯片版式：以第一页 PDF 尺寸为准，多尺寸混排的后续页按比例映射（字号取横纵缩放的较小者，避免拉伸变形）。
- 上标/下标、旋转文字可能被拆分到相邻文本框或位置略有偏移，复杂版式请人工校对。
- 大文件逐页提取并显示进度（正在转换 n/N 页）。
- 全程本地处理，不上传。

## 数据流向 | Data flow

文件 → pdfjs-dist（本地 worker）逐页 getTextContent → 带坐标文本 → 按基线分组为文本行 → 英寸文本框 → pptxgenjs（defineLayout/addSlide/addText/write blob）→ 下载；不经过网络。

## 依赖说明 | Dependencies

- `pdfjs-dist@6.3.289`（已安装）：PDF 文本提取（含坐标）。
- `pptxgenjs@4.0.1`（MIT，已核验所装版本 package.json `license` 字段为 `MIT`）：纯 JS 的 PPT（.pptx/OOXML）生成库，无 GPL 系传染性，用于替代"纯 JS"路线中缺失的 PPT 写入能力。无 WASM，故本工具可行性记为 A（文档原标注 B，见 meta.ts 注释）。
