# PDF 页码 pdf-page-number（#488）

## 用途 | Purpose

- 上传单个 PDF，为每页（可从指定页开始）添加页码，下载新 PDF。
- Upload a single PDF, stamp page numbers on every page (optionally starting from a given page), and download the new PDF.
- 全程本地 pdf-lib 处理，不上传。

## 输入 | Input

- PDF 文件（单文件，`%PDF` 魔数校验），上限 50MB。
- Single PDF file (`%PDF` magic check), max 50MB.

## 选项 | Options

| 选项                  | 说明                                                 | Option       | Description                                    |
| --------------------- | ---------------------------------------------------- | ------------ | ---------------------------------------------- |
| 位置 position         | 上左 / 上中 / 上右 / 下左 / 下中 / 下右（默认下中）  | Position     | 6 anchors (default: bottom center)             |
| 样式 style            | `n`（如 3）/ `n/N`（如 3/10）/ `page n`（如 page 3） | Style        | `n` / `n/N` / `page n`                         |
| 起始编号 startNumber  | 第一页显示的数字，默认 1，可设 0                     | Start number | Number shown on first stamped page (default 1) |
| 从第几页开始 fromPage | 默认 1（全部页）；不得超过总页数                     | Start page   | Default 1 (all pages); must be ≤ total         |
| 字号 fontSize         | 6–72pt，默认 12                                      | Font size    | 6–72pt, default 12                             |
| 边距 margin           | 0–200pt，默认 36                                     | Margin       | 0–200pt, default 36                            |

## 输出 | Output

- 加页码后的 PDF，一键下载（文件名原名 + `-pagenumber.pdf`）。
- PDF with page numbers, one-click download (`<name>-pagenumber.pdf`).

## 边界 | Limits

- 页码用 Helvetica 标准字体绘制，**仅支持 ASCII 字符**（数字与英文）：因此不提供「第n页」中文样式——Helvetica 没有中文「第/页」字形，绘制会得到空白/乱码；用等价的英文 `page n` 样式替代。
- 加密 PDF 明确报错（pdf-lib 无法解密）；损坏的 PDF 报错。
- 绘制不更新文档元数据（`updateMetadata: false`）。
- 边距为文本到页面边缘的距离；顶部位置时 y 按"页高 − 边距 − 字号"估算基线。

## 数据流向 | Data flow

文件 → 内存 pdf-lib（load → embedFont → drawText → save）→ Blob → 下载；不经过网络。
