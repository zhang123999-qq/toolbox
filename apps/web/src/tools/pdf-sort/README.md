# PDF 页面排序 pdf-sort（#486）

## 用途 | Purpose

- 上传单个 PDF，调整页面顺序后生成新的 PDF 文件。
- Upload a single PDF, reorder its pages, and generate a new PDF file.
- 排序方式：每页「上移 / 下移」按钮微调，「反转顺序」一键倒序，「重置顺序」恢复原排列。

## 输入 | Input

- PDF 文件（单个）：%PDF 魔数校验，单文件上限 50MB，页数上限 500 页。
- PDF file (single): %PDF magic-number check, max 50MB per file, max 500 pages.

## 选项 | Options

| 选项        | 说明                   | Option        | Description                     |
| ----------- | ---------------------- | ------------- | ------------------------------- |
| 上移 / 下移 | 当前页与相邻页交换位置 | Move up/down  | Swap the page with its neighbor |
| 反转顺序    | 整个页面列表倒序       | Reverse order | Reverse the whole page list     |
| 重置顺序    | 恢复为原文档的页面排列 | Reset order   | Restore the original page order |

## 输出 | Output

- 页面列表（页码 + 每页尺寸 pt），按新顺序 copyPages 生成新 PDF，一键下载。
- Page list (page number + per-page size in pt); new PDF generated via copyPages in the new order, one-click download.

## 边界 | Limits

- 全程本地 pdf-lib 处理，不上传。
- 页数上限 500 页：防止大文档 OOM，超限直接报错（见本说明）。
- 不支持加密 PDF：输入加密 PDF 会明确报错「不支持加密 PDF」。
- 损坏的 PDF（魔数通过但无法解析）报错「PDF 文件损坏，无法读取」。
- 生成时 `PDFDocument.load(bytes, { updateMetadata: false })`，避免 pdf-lib 把 Producer 盖章为 pdf-lib（见 pdf-compress 注释）。

## 数据流向 | Data flow

文件 → 内存 PDFDocument → copyPages 按新顺序重排 → save → Blob → 下载；不经过网络。
