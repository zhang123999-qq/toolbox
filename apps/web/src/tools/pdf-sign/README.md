# PDF 签名 pdf-sign（#491）

## 用途 | Purpose

- 可视化电子签名：用户在画布上手写签名（鼠标/触摸），或上传签名图片（PNG/JPEG），选择页码、位置、缩放后，由 pdf-lib 把签名位图嵌入 PDF 页面。
- Visual e-signature: draw on canvas (mouse/touch) or upload a signature image (PNG/JPEG), choose page/position/scale, and the signature bitmap is embedded into the PDF page via pdf-lib.

## 重要声明：可视化签名 ≠ 数字证书签名

- 本工具添加的是**可视化电子签名**（把签名图片“盖章”到页面上），**不是密码学数字证书签名**。
- 输出 PDF **不含**任何数字签名字典（`/Sig`、`/ByteRange`），不提供身份认证、不防篡改，无法验证签名者身份。
- 需要法律效力的数字签名，请使用 Adobe Acrobat 等支持证书签名的工具。
- This tool adds a **visual** electronic signature (an image stamped onto the page), **NOT** a cryptographic digital-certificate signature. The output PDF contains no digital signature dictionary (`/Sig`, `/ByteRange`): no identity authentication, no tamper protection.

## 输入 | Input

- PDF 文件：单文件上限 50MB，需通过 `%PDF` 魔数校验；已加密的 PDF 无法打开（pdf-lib 1.17 不支持带密码载入），会明确报错。
- 签名图片（上传模式）：仅 PNG / JPEG（pdf-lib 仅能嵌入这两种格式），程序解析文件头读取图片尺寸。

## 选项 | Options

| 选项              | 说明                                       | Option       | Description                                 |
| ----------------- | ------------------------------------------ | ------------ | ------------------------------------------- |
| 签名来源          | 手写（画布）/ 上传图片                     | Source       | Draw (canvas) / Upload image                |
| 线宽 lineWidth    | 画布笔触宽度 1–20                          | Stroke width | Canvas stroke width 1–20                    |
| 页码 page         | 目标页码下拉                               | Page         | Target page select                          |
| 水平/垂直位置 x/y | 签名左上角在页面可移动范围内的百分比 0–100 | Position     | Top-left corner as % of movable range 0–100 |
| 缩放 scale        | 10–300（%）                                | Scale        | 10–300 (%)                                  |

位置语义：x/y 取 0 时签名贴左/上边缘，取 100 时贴右/下边缘；签名恒不溢出页面（超出页面时等比收缩）。位置预览框实时显示落点。

## 输出 | Output

- 签名嵌入后的 PDF（页数不变），一键下载，文件名后缀 `-signed.pdf`。
- Signed PDF (page count unchanged), one-click download, file name suffix `-signed.pdf`.

## 边界 | Limits

- 全程本地处理，不上传。
- 手写签名为位图：放大后可见像素颗粒，属正常现象。
- 上传的签名图片建议使用透明底 PNG，视觉效果最佳。
- 本工具**不验证**签名者身份，也不做任何证书相关操作。

## 数据流向 | Data flow

PDF 文件 → 内存（pdf-lib 载入）→ 签名位图 drawImage → 新 PDF → 下载；不经过网络。
