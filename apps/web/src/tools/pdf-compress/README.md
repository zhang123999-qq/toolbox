# PDF 压缩 pdf-compress（#483）

## 用途 | Purpose

- 本地重新封装 PDF：pdf-lib 加载后以对象流（useObjectStreams）保存，可选清除文档元数据（标题/作者/创建者/生产者/主题/关键字）。
- Re-save a PDF locally with object-stream optimization; optional document metadata stripping (title/author/creator/producer/subject/keywords).

## 效果有限的诚实说明 | Honest limits

- **pdf-lib 无法对 PDF 内的图片重新编码**，因此本工具只能做结构层面的优化（对象流压缩、元数据清理）。
- **压缩效果通常有限：多数文件只能减小 0–10%，个别文件甚至略有增大**（界面按实际比例如实展示，不美化）。
- 若需要大幅压缩（图片重编码/降低 DPI），请使用支持图像重压缩的桌面工具（如 Ghostscript）；本工具定位是轻量本地封装优化。
- feasible 标注：文档 docs/tools/09-PDF-Office.md 建议可行性 B（pdfjs + wasm 图片重压缩）；本工具为不虚报 wasm 能力记为 **A（纯 pdf-lib，无 wasm）**，见 meta.ts 头部注释。

## 输入 | Input

- PDF 文件（魔数 `%PDF` 校验），单文件上限 50MB。
- PDF file (verified by `%PDF` magic bytes), max 50MB per file.

## 选项 | Options

| 选项                          | 说明                                | Option         | Description                                    |
| ----------------------------- | ----------------------------------- | -------------- | ---------------------------------------------- |
| 清除文档元数据 removeMetadata | 标题/作者/创建者/生产者/主题/关键字 | Strip metadata | Title/author/creator/producer/subject/keywords |

## 输出 | Output

- 压缩前后文件大小、压缩率（实际 new/orig，如实展示）、页数统计，一键下载 `-compressed.pdf`。
- Before/after size, honest compression ratio (actual new/orig) and page count, one-click download of `-compressed.pdf`.

## 边界 | Limits

- 全程本地 pdf-lib 处理，不上传。
- **加密 PDF 无法处理**（pdf-lib 不支持解密），页面会明确报错。
- 非 PDF 文件（魔数不符）会被拒绝。
- 不改变 PDF 内容与版式；表单、签名、附件等结构保留（重新封装可能重组内部对象，但语义不变）。

## 数据流向 | Data flow

文件 → 内存 Uint8Array → pdf-lib 重封装 → Blob → 下载；不经过网络。
