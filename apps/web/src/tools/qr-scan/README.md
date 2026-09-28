# 二维码识别 qr-scan（#447）

## 用途 | Purpose

- 上传图片，本地识别其中的二维码：显示解码后的文本内容与码制（二维码），一键复制结果。
- Upload an image to decode the QR code in it locally: shows the decoded text and format, with one-click copy.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 输出 | Output

- 解码文本（保留换行展示）+ 码制 + 复制按钮。
- Decoded text (line breaks preserved) + format + copy button.

## 边界 | Limits

- 图片中没有二维码时，友好提示"未识别到二维码"（与"图片解码失败"区分：后者是文件损坏或格式不支持）。
- 大图先等比缩放至最大边 2000px 再识别，以提速；小图直接识别。
- 复制依赖剪贴板 API：非安全上下文或无权限时降级提示，可手动选择文本复制。
- 本工具只识别 QR 码（一维码/条码请用 #448 条码识别）。

## 依赖选择说明 | Dependency note

- 规格文档建议 jsQR，但 jsQR 仅支持 QR 码；本批 #448 需要一维码。
- 为将新增依赖数量压到最少，#447 / #448 统一使用 @zxing/library（纯 JS 实现，无 WASM），本工具通过 `DecodeHintType.POSSIBLE_FORMATS` 限定为 `BarcodeFormat.QR_CODE`。
- 该偏离已经协调员确认，记录在 `meta.ts` 顶部注释。

## 数据流向 | Data flow

文件 → 内存 Image/Canvas（大图缩放）→ zxing 本地解码 → 文本展示；全程不经过网络。
