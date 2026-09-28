# Base64 转图片 base64-to-image（#476）

## 用途 | Purpose

- 单向「Base64 → 图片」：粘贴 Base64 文本 → 本地 atob 解码 → 校验为有效图片 → 预览 → 下载为 PNG / JPEG。
- Decode pasted Base64 text into an image locally (atob), verify it is a valid image, preview, then download as PNG / JPEG.
- 与相近工具的差异：#427 image-base64 是**双向互转**（图片 ⇄ Base64）一体版；
  #475 image-to-base64 是反方向（图片 → Base64）；本工具是单向「Base64 → 图片」独立入口，
  专注粘贴解码下载。

## 输入 | Input

支持两种形式（两种都先去除空白字符再处理）：

| 形式             | 示例                              | 说明                                              |
| ---------------- | --------------------------------- | ------------------------------------------------- |
| 完整 DataURL     | `data:image/png;base64,iVBORw0K…` | 解析声明的 MIME；非 `image/*` 类型报错            |
| 纯 Base64 字符串 | `iVBORw0KGgo…`                    | 默认按 PNG 处理，实际类型按文件头魔数推断（见下） |

- 空输入、非法 Base64 字符、长度异常都会明确报错，不会静默失败。
- 输入文本长度上限 **70MB 字符**（Base64 编码膨胀约 4/3，对应约 50MB 解码后图片；浏览器内存安全边界）。

## MIME 推断规则 | MIME sniffing

纯 Base64 输入没有声明 MIME，按解码后字节的文件头魔数判定：

| 魔数                            | MIME                  |
| ------------------------------- | --------------------- |
| `89 50 4E 47`                   | image/png             |
| `FF D8 FF`                      | image/jpeg            |
| `47 49 46 38`（"GIF8"）         | image/gif             |
| `RIFF … "WEBP"`（第 9–12 字节） | image/webp            |
| `42 4D`（"BM"）                 | image/bmp             |
| 无法识别                        | image/png（默认兜底） |

无论哪种输入，解码后都会用图片加载验证内容确为有效图片：损坏或非图片数据会明确报错。

## 输出 | Output

- 解码后预览图、图片尺寸（宽 × 高）与体积统计，一键下载。
- 输出格式可选 PNG / JPEG（JPEG 质量 1–100 可调，默认 80；PNG 为无损，质量参数不生效）。
- **JPEG 白底说明**：JPEG 不支持透明通道，导出前会先铺白色底，避免透明区域变成黑色；
  需要保留透明请选 PNG。

## 边界 | Limits

- 全程本地解码与 Canvas 重编码，不上传任何数据。
- GIF 动图经 Canvas 重编码后只保留第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。
- 超过 70MB 字符的输入会被拒绝（内存安全）。

## 数据流向 | Data flow

文本 → atob 解码 → Uint8Array → Blob → 图片校验 → Canvas → Blob → 下载；不经过网络。
