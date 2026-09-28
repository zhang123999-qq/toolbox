# 图片转 Base64 image-to-base64（#475）

## 用途 | Purpose

- 单向批量「图片 → Base64」：多张图片转为 Base64 文本，专注转文本场景——每项显示输出字符数，支持逐项复制、逐项下载 `.txt`，也可把全部结果合并下载为一个 txt。
- One-way batch image → Base64: convert multiple images to Base64 text, optimized for the copy/download-as-text workflow — per-item char count, per-item copy / `.txt` download, and combined download of all results.
- 全程本地 FileReader 读取，不上传。

## 输入 | Input

- 图片文件（可多选）：PNG / JPEG / WebP / GIF / BMP / AVIF；单文件上限 50MB，单次最多 20 个文件。
- Multiple image files: PNG / JPEG / WebP / GIF / BMP / AVIF; max 50MB per file, max 20 files per batch.
- 选择文件后自动转换，无需点开始按钮。

## 选项 | Options

| 选项                | 说明                                                             | Option      | Description                                                             |
| ------------------- | ---------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| 输出形式 outputKind | DataURL（含 `data:image/...;base64,` 前缀）/ 纯 Base64（无前缀） | Output kind | DataURL (with `data:image/...;base64,` prefix) / raw Base64 (no prefix) |

## 输出 | Output

- 每项：文件名、输出字符数、文本框（可手动全选复制）、「复制」按钮、「下载 .txt」按钮。
- 顶部：「全部下载」按钮，把所有结果合并为一个 txt（每项以 `// 文件名` 开头）。
- 复制走 `navigator.clipboard.writeText`；失败时（无权限/非安全上下文）降级提示手动复制文本框内容，不抛未处理异常。

## 与相近工具的差异 | Differences from similar tools

- vs **#427 image-base64（Base64 转换）**：那是双向互转一体版（图片→Base64 / Base64→图片，一个页面两种方向）；本工具是其中「图片→Base64」方向的独立批量入口，按复制/下载文本场景优化。
- vs **#476 base64-to-image（Base64 转图片）**：那是反向工具（Base64 文本还原为图片下载）；需要把文本还原成图片时用它。

## 边界 | Limits

- 单文件 50MB 上限；单次最多 20 个文件（Base64 体积比原图膨胀约 37%，限制批量规模以控制内存）。
- 只做「图片→Base64」单向转换，不做 Base64→图片（用 #476）。
- 输出文本按原图编码，不做压缩或格式转换；如需压缩先用图片压缩类工具。

## 数据流向 | Data flow

文件 → FileReader（DataURL）→ 可选去前缀 → 文本展示 / 剪贴板 / .txt 下载；不经过网络。
