# PDF 转 Excel pdf-to-excel（#496）

## 用途 | Purpose

- 将 PDF 逐页提取文本，按文本位置重建为表格并导出 `.xlsx`：pdfjs-dist 提取带坐标文本 → 按纵坐标分组为行、按横向间隙分列 → xlsx（SheetJS 社区版）生成工作簿。
- Convert PDF to `.xlsx` page by page: extract positioned text with pdfjs-dist, group into rows by Y coordinate, split into columns by X gaps, then build the workbook with xlsx (SheetJS community edition).
- 工作表模式：合并为一张表（非空页之间以空行分隔）或每页一张工作表（命名"第1页"、"第2页"…）。

## 输入 | Input

- PDF 文件：单文件上限 50MB，上传前做 `%PDF` 魔数校验。
- PDF file: max 50MB per file, `%PDF` magic-number checked before processing.

## 选项 | Options

| 选项                 | 说明                                     | Option         | Description                                     |
| -------------------- | ---------------------------------------- | -------------- | ----------------------------------------------- |
| 工作表模式 sheetMode | merged 合并为一张表 / perPage 每页一张表 | Worksheet mode | merged: one sheet / perPage: one sheet per page |

## 输出 | Output

- 转换结果信息（页数、行数）与 `.xlsx` 一键下载，文件名如 `report-converted.xlsx`。
- Result info (page/row counts) and one-click `.xlsx` download, e.g. `report-converted.xlsx`.

## 边界 | Limits

- 全程本地处理，不上传。
- **保真度说明（必读）**：仅按文本位置启发式分行分列——纵坐标差 ≤ 2（PDF 单位）视为同一行，横向间隙 > 10 视为列分隔。不保留原样式、字体、公式、图片与合并单元格；复杂版式（多栏、斜排文字、跨页大表）分列可能不准，需要手动调整。
- 列宽按每列最大字符数估计（8–50 字符钳制）；xlsx 社区版不支持单元格样式写入。
- 加密 PDF 明确报错不支持；纯图片扫描版 PDF（提取不到文本）明确报错，不生成空文件。
- 可行性说明：文档原标注可行性 B，但本实现为纯 JS（pdfjs-dist 非 wasm 核心、xlsx 纯 JS），故记为 A（与 #495 pdf-to-word 同例）。

## 数据流向 | Data flow

文件 → pdfjs-dist 逐页文本（含坐标）→ 内存二维表 → xlsx 打包 → Blob → 下载；不经过网络。
