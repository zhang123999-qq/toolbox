# PDF 拆分 pdf-split（#482）

## 用途 | Purpose

- 本地拆分 PDF：按页范围（如 `1-3,5,8-10`）、每 N 页一个文件、单页逐个拆分三种模式。
- Split PDF locally: by page ranges (e.g. `1-3,5,8-10`), every N pages per file, or page-by-page.

## 输入 | Input

- PDF 文件（按 `%PDF` 魔数校验，不依赖扩展名），单文件上限 50MB。
- PDF file (validated by `%PDF` magic bytes, not the extension), max 50MB per file.

## 选项 | Options

| 选项               | 说明                           | Option         | Description                        |
| ------------------ | ------------------------------ | -------------- | ---------------------------------- |
| 拆分模式 mode      | ranges / chunks / single       | Split mode     | ranges / chunks / single           |
| 页范围 pages       | ranges 模式用，如 `1-3,5,8-10` | Page ranges    | For ranges mode, e.g. `1-3,5,8-10` |
| 每份页数 chunkSize | chunks 模式用，≥1 的整数       | Pages per file | For chunks mode, integer ≥ 1       |

## 输出 | Output

- 每个拆分片段独立为一个 PDF 文件，每行一个下载按钮（**不打包成 ZIP**）。
- Each split part becomes its own PDF file with its own download button (**not zipped**).
- 文件名规则：`原名-p{起}-{止}.pdf`（单页时为 `原名-p{页}.pdf`），如 `doc-p1-3.pdf`。

## 边界 | Limits

- 全程本地 pdf-lib 处理，不上传。
- 加密（受密码保护）的 PDF 无法拆分，会明确报错。
- 页范围非法时明确报错：空输入、空片段（如 `1,,2`）、非数字、逆序范围（如 `5-3`）、超范围页码（如 `0` 或大于总页数）。
- 重复页码自动去重；ranges 模式每个逗号片段独立成一个文件。

## 为什么不打包成 ZIP | Why not a ZIP

- 本项目未安装 fflate/jszip 等打包依赖；每个拆分文件独立下载按钮已满足使用场景，避免引入额外依赖与体积。

## pdf-lib 说明 | pdf-lib notes

- 使用 `pdf-lib`（纯 JS，无 wasm）拆分：`PDFDocument.load` → 每组 `copyPages` 到新文档 → `save`。

## 数据流向 | Data flow

文件 → 内存（pdf-lib 文档对象）→ 多个 PDF Blob → 各自下载；不经过网络。
