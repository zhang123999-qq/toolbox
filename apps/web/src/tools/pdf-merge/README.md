# PDF 合并 pdf-merge（#481）

## 用途 | Purpose

- 按文件列表顺序把多个 PDF 的全部页面拼接为一个 PDF 文件下载。
- Merge multiple PDFs into a single file, concatenating all pages in list order.
- 列表支持上移 / 下移 / 删除，合并顺序完全由列表顺序决定。

## 输入 | Input

- PDF 文件（可多选，也支持拖拽追加），单文件上限 50MB。
- PDF files (multi-select, drag-and-drop append supported), max 50MB per file.

## 选项 | Options

| 选项       | 说明                       | Option | Description              |
| ---------- | -------------------------- | ------ | ------------------------ |
| 排序 order | 列表上移/下移/删除调整顺序 | Order  | Reorder via move up/down |

## 输出 | Output

- 合并后的单个 PDF（页数为各文件页数之和），一键下载。
- 文件名：首个文件名 + `-merged.pdf`（如 `report.pdf` → `report-merged.pdf`）。
- A single merged PDF (page count = sum of inputs), one-click download.
- Output name: first file name + `-merged.pdf`.

## 边界 | Limits

- 加密 PDF 不支持合并（pdf-lib 无法解密），会在合并时报错并指出文件名。
- Encrypted PDFs are not supported and fail at merge time with the file name shown.
- 每个文件独立校验（类型 / 大小 / 可解析性），任一失败则整体报错并指出是哪个文件。
- 非 PDF 文件（魔数不是 `%PDF-`）会被拒绝。
- 合并至少需要 2 个文件，不足时合并按钮禁用并提示。

## 数据流向 | Data flow

文件 → 内存（pdf-lib 解析/拼接）→ Blob → 下载；全程本地，不经过网络。
