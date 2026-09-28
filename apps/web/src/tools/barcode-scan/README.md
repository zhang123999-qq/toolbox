# 条形码识别 barcode-scan（#448）

## 用途 | Purpose

- 上传图片，本地识别其中的**一维条形码**，显示解码出的文本内容 + 码制中文名，一键复制结果。
- Upload an image to decode the **1D barcode** in it locally; shows the decoded text and the format name, with one-click copy.
- 与「条形码生成」（barcode，#382）的区别：barcode 是把文本**编码成**条码图片（生成方向，仅支持 Code128 B）；本工具是反向操作——从图片中**识别解码**出条码内容（识别方向），两者功能互补、不重叠。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 输出 | Output

- 解码文本内容（等宽字体展示，可一键复制）。
- 码制中文名；支持的码制：EAN-13、EAN-8、UPC-A、UPC-E、Code 128、Code 39、ITF。
- 识别用图尺寸、原图预览。
- Decoded text (monospace, one-click copy), format name (EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF), scan image dimensions, original preview.

## 边界 | Limits

- 全程本地处理，图片不上传。
- 图片中未识别到条形码时给出友好提示（"未识别到条形码，请换一张更清晰的图片重试"），而非技术报错。
- 大图（任一边超过 2000px）先等比缩放到最大边 2000px 再识别，提速且不影响识别率。
- 条码过小、模糊、倾斜过大或反光的图片可能识别失败；二维码请使用二维码识别工具。
- 依赖说明：规格文档写"纯 JS"，但手写一维码解码无法达到零 Bug 标准，故与 #447 共用 **@zxing/library**（纯 JS 实现，无 WASM，可行性仍为 A），此偏离已经协调员确认。

## 数据流向 | Data flow

文件 → 内存 Image（必要时 Canvas 缩放至 ≤2000px）→ @zxing/library 本地解码 → 文本展示；不经过网络。
