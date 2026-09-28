# Base64 转换 image-base64（#427）

## 用途 | Purpose

- 图片 ⇄ Base64 双向转换：图片转 Base64 文本（完整 DataURL 或纯 Base64），或粘贴 Base64 文本还原为图片下载。
- Two-way image ⇄ Base64 conversion: image to Base64 text (full DataURL or raw Base64), or paste Base64 text to restore the image for download.

## 输入 | Input

- 模式一（图片 → Base64）：图片文件 PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- 模式二（Base64 → 图片）：粘贴 Base64 文本（可带 `data:image/...;base64,` 前缀，无前缀默认按 PNG 处理），上限 7000 万字符。
- Mode 1 (image → Base64): image file PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.
- Mode 2 (Base64 → image): paste Base64 text (optional `data:image/...;base64,` prefix; defaults to PNG without prefix), max 70,000,000 chars.

## 选项 | Options

| 选项             | 说明                                        | Option      | Description                               |
| ---------------- | ------------------------------------------- | ----------- | ----------------------------------------- |
| 模式 mode        | encode 图片→Base64 / decode Base64→图片     | Mode        | encode image→Base64 / decode Base64→image |
| 输出形式 dataUrl | full 完整 DataURL / raw 纯 Base64（去前缀） | Output form | full DataURL / raw Base64 (no prefix)     |

## 输出 | Output

- 模式一：只读文本域展示结果，显示原图预览、Base64 字符数与约算字节数；一键复制、下载为 `.txt`。
- 模式二：图片预览、字符数统计，下载图片（文件名按 DataURL 的 MIME 定扩展名，如 `base64-image.jpg`）。
- Mode 1: read-only textarea with the result, original preview, char count and approx bytes; one-click copy, download as `.txt`.
- Mode 2: image preview, char stats, download image (extension follows the DataURL MIME, e.g. `base64-image.jpg`).

## 边界 | Limits

- 全程本地处理，不上传；合法性校验只用正则，不做 `atob` 解码，避免大文本爆内存。
- Base64 文本先去除全部空白字符（换行/空格/制表符）再校验；`mime` 非 `image/*` 的 DataURL 会被拒绝。
- 大文本内存提示：70M 字符上限约对应 52MB 图片；粘贴/转换超大文本时页面内存占用会显著上升，超限输入会被直接拒收并提示。
- 与 #475 image-to-base64（单向：图片→Base64）、#476 base64-to-image（单向：Base64→图片）的关系：本工具是**双向一体版**，那两个是本工具两个模式的独立入口，底层纯函数逻辑一致。
- Entirely local, no upload; validity is checked with regex only (no `atob` decoding) to avoid blowing up memory on huge inputs.
- All whitespace is stripped before validation; DataURLs whose MIME is not `image/*` are rejected.
- Memory note: the 70M-char cap ≈ a 52MB image; pasting/converting huge text raises memory use significantly, over-limit input is rejected with a prompt.
- Relation to #475 image-to-base64 (one-way: image→Base64) and #476 base64-to-image (one-way: Base64→image): this tool is the **two-way combined edition**; those two are standalone entries for each of its modes, sharing the same pure-function logic.

## 数据流向 | Data flow

- 编码：文件 → FileReader DataURL →（可选去前缀）→ 文本域 / 剪贴板 / `.txt` 下载；不经过网络。
- 解码：粘贴文本 → 去空白 → 正则校验 → 拼回 `data:{mime};base64,` → `<img>` 预览 / `<a download>` 下载；不经过网络。
- Encode: file → FileReader DataURL → (optional prefix strip) → textarea / clipboard / `.txt` download; no network.
- Decode: pasted text → whitespace strip → regex validation → reassembled `data:{mime};base64,` → `<img>` preview / `<a download>` download; no network.
