# PDF 水印 pdf-watermark（#487）

## 用途 | Purpose

- 给单个 PDF 添加文字或图片水印：透明度、旋转角度、九宫格位置、应用页面范围均可调。
- Add a text or image watermark to a single PDF: adjustable opacity, rotation, 9-grid position and page ranges.
- 输出文件名：原名 + `-watermarked.pdf`。

## 输入 | Input

- PDF 文件：单文件上限 50MB，需通过 `%PDF-` 魔数校验；加密 PDF 会明确报错（不支持）。
- PDF file: max 50MB, must pass the `%PDF-` magic check; encrypted PDFs are rejected with a clear error.
- 图片水印：PNG / JPEG（按魔数识别），单文件上限 50MB。
- Watermark image: PNG / JPEG (detected by magic bytes), max 50MB.

## 选项 | Options

| 选项              | 说明                               | Option         | Description                                 |
| ----------------- | ---------------------------------- | -------------- | ------------------------------------------- |
| 水印类型          | 文字水印 / 图片水印                | Watermark type | Text / image                                |
| 水印文字 text     | 仅支持 ASCII/英文字符（见下）      | Text           | ASCII/English only (see below)              |
| 字号 fontSize     | 8–200pt，默认 48                   | Font size      | 8–200pt, default 48                         |
| 颜色 color        | 黑/灰/红/蓝/绿五种预设             | Color          | 5 presets: black/gray/red/blue/green        |
| 透明度 opacity    | 10–100%，默认 50%                  | Opacity        | 10–100%, default 50%                        |
| 旋转角度 rotate   | -90/0/45 预设 + 自定义（-180–180） | Rotation       | -90/0/45 presets + custom (-180–180)        |
| 位置 position     | 九宫格（左上/上中/右上/…/右下）    | Position       | 9-grid placement                            |
| 应用页面 pageMode | 全部页面 / 自定义范围（如 1-3,5）  | Pages          | All pages / custom ranges (e.g. 1-3,5)      |
| 缩放 scale        | 图片水印缩放 10–200%，默认 100%    | Scale          | Image watermark scale 10–200%, default 100% |

## 英文水印限制 | ASCII-only text watermarks

- 文字水印使用 pdf-lib 内嵌的 **Helvetica** 字体绘制，该字体没有 CJK（中文/日文/韩文）字形。
- 输入中文等非 ASCII 字符会被直接拒绝并报错，而不是输出乱码缺失字形——这是有意的产品决策。
- Text watermarks are drawn with pdf-lib's embedded **Helvetica**, which has no CJK glyphs.
- Non-ASCII input (e.g. Chinese) is rejected with a clear error instead of rendering as mojibake — a deliberate product decision.
- 如需中文水印，请使用图片水印（上传含中文的水印图片）。
- For Chinese watermarks, use an image watermark (upload an image containing the Chinese text).

## 边界 | Limits

- 全程本地 pdf-lib 处理，不上传；不修改原文档元数据（`updateMetadata: false`）。
- 加密 PDF：pdf-lib 无法解密，添加水印时明确报错。
- 页面范围按 1 起编号，越界/倒置/格式错误均会报错；范围为空时回退为全部页面。
- 水印绘制在页面内容之上（无独立图层概念，视觉上为叠加）。
- 旋转水印按包围盒左下角定位，大角度旋转时位置为近似值。

## 数据流向 | Data flow

文件 → 内存 ArrayBuffer → pdf-lib 文档 → 加水印 → Blob → 下载；不经过网络。
