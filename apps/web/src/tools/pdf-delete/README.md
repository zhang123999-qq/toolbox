# PDF 删页 pdf-delete（#485）

## 用途 | Purpose

- 上传单个 PDF，每页渲染为小缩略图，勾选要删除的页面后，用 pdf-lib 生成去掉选中页的新 PDF 并下载。
- Upload a single PDF, preview each page as a thumbnail, check the pages to remove, then generate and download a new PDF without them via pdf-lib.

## 输入 | Input

- PDF 文件单个，单文件上限 50MB（按 `%PDF-` 魔数校验）。
- Single PDF file, max 50MB (validated by the `%PDF-` magic bytes).

## 交互 | Interaction

| 区域         | 说明                                             |
| ------------ | ------------------------------------------------ |
| 缩略图网格   | 每页一张小图 + 勾选框 + 页码，点击勾选切换       |
| 全选 / 反选  | 一键全选或反选                                   |
| 按范围勾选   | 输入 `1,3,5-7`（或 `all`）快速勾选，非法输入报错 |
| 删除选中页面 | 未勾选或全选时禁用，并提示原因                   |

## 输出 | Output

- 去掉选中页的新 PDF，一键下载，文件名为原名加 `-deleted.pdf` 后缀。
- A new PDF without the selected pages, one-click download, named `<original>-deleted.pdf`.

## 边界 | Limits

- **至少保留 1 页**：未勾选任何页，或勾选全部页时，删除按钮禁用并提示原因。
- 页数很多时（如 >100 页）：缩略图逐页渲染较慢，页面会给出性能提示。
- 加密 PDF：明确报错，请先解密后再上传（暂不支持输入密码）。
- 全程本地处理：pdfjs-dist 缩略图渲染 + pdf-lib 页面删除均在浏览器内完成，不上传。

## 数据流向 | Data flow

文件 → 内存 ArrayBuffer → 缩略图 Blob（URL.createObjectURL）/ 新 PDF Blob → 下载；不经过网络。
