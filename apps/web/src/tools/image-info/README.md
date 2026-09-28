# 图片元信息 image-info（#467）

## 用途 | Purpose

- 本地查看图片的基础元信息：文件名、文件大小、声明类型（MIME/扩展名）、**按文件头魔数识别的实际格式**、尺寸（宽×高）、宽高比、百万像素、色彩空间。
- Inspect basic image metadata locally: file name, size, declared type (MIME/extension), **actual format detected from file-header magic numbers**, dimensions, aspect ratio, megapixels, color space.
- 与「EXIF 查看」（exif-view #445）的区别：本工具**不读取 EXIF**，只做基础信息 + 魔数识别；exif-view 用 exifr 解析拍摄参数、GPS 等完整 EXIF 标签。想看"这张照片是什么相机拍的"用 exif-view；想确认"这个文件到底是什么格式、有没有被改名伪装"用本工具。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF / ICO / SVG，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF / ICO / SVG, max 50MB per file.

## 输出 | Output

- 元信息表（键/值两列）+ 图片预览；声明类型与魔数识别的实际格式不一致时显示警告行"扩展名/类型与实际格式不符"。
- Key/value metadata table + image preview; a warning row "extension/type does not match the actual format" appears when the declared type differs from the magic-detected format.

## 魔数表 | Magic numbers

| 格式 | 文件头签名                                                      | Format |
| ---- | --------------------------------------------------------------- | ------ |
| PNG  | `89 50 4E 47`                                                   | PNG    |
| JPEG | `FF D8 FF`                                                      | JPEG   |
| GIF  | `47 49 46 38`（`GIF8`）                                         | GIF    |
| BMP  | `42 4D`（`BM`）                                                 | BMP    |
| WebP | `52 49 46 46`（`RIFF`）…偏移 8 处 `57 45 42 50`（`WEBP`）       | WebP   |
| AVIF | ISO BMFF `ftyp` box，主品牌或兼容品牌含 `avif`                  | AVIF   |
| ICO  | `00 00 01 00`                                                   | ICO    |
| SVG  | 文本格式：前 200 字节去 BOM/前导空白后以 `<svg` 或 `<?xml` 开头 | SVG    |

## 边界 | Limits

- 全程本地处理，不上传；魔数识别只读文件前 512 字节。
- 魔数无法识别（如随机字节、损坏文件头）时报错而非展示错误信息。
- 尺寸/宽高比/百万像素依赖浏览器解码图片：解码失败（文件损坏）时报错。
- 色彩空间取自 Canvas 2D 上下文的 `ImageData.colorSpace`（近似值，反映当前渲染色彩空间而非图片内嵌 ICC）；取不到时显示"未知"，不抛错。
- SVG 按文本特征识别：`<?xml` 开头但非 SVG 的 XML 也会被判为 SVG（文本格式的固有局限）。

## 数据流向 | Data flow

文件 → 前 512 字节魔数识别 → 内存解码取尺寸 → 表格渲染；不经过网络。
