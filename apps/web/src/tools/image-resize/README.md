# 图片缩放 image-resize（#425）

## 用途 | Purpose

- 本地缩放图片尺寸：两种模式——按像素（目标宽/高数字输入，「锁定纵横比」默认开启，改一边另一边按原图比例自动联动）与按百分比（1–1000%，可含小数如 12.5%）。
- Resize images locally in two modes: by pixels (target width/height inputs, "lock aspect ratio" on by default — editing one side auto-updates the other from the original ratio) or by percentage (1–1000%, decimals like 12.5 allowed).
- 输出 jpeg / png / webp + 质量（1–100，PNG 无损不生效），Canvas 高质量重采样。
- Output jpeg / png / webp with quality (1–100, ignored for lossless PNG), high-quality Canvas resampling.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项             | 说明                                         | Option     | Description                                                                             |
| ---------------- | -------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| 模式 mode        | 按像素 / 按百分比                            | Mode       | By pixels / by percentage                                                               |
| 宽度 width       | 目标宽度像素，空=未填，上限 16384            | Width      | Target width in px, empty=unset, max 16384                                              |
| 高度 height      | 目标高度像素，空=未填，上限 16384            | Height     | Target height in px, empty=unset, max 16384                                             |
| 锁定纵横比 lock  | 默认开启；改宽自动按原图比例填高（反之亦然） | Lock ratio | On by default; editing width auto-fills height from the original ratio (and vice versa) |
| 缩放比例 percent | 1–1000%，可含小数，默认 100%                 | Scale      | 1–1000%, decimals allowed, default 100%                                                 |
| 输出格式 format  | jpeg / png / webp                            | Format     | jpeg / png / webp                                                                       |
| 质量 quality     | 1–100，默认 80（PNG 不生效）                 | Quality    | 1–100, default 80 (ignored for PNG)                                                     |

## 输出 | Output

- 缩放前后预览、原图→目标尺寸与文件大小统计，一键下载（文件名形如 `photo-400x300.jpg`）。
- Before/after preview, original → target dimensions and file-size stats, one-click download (e.g. `photo-400x300.jpg`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 与后续批次的「图片尺寸调整」（image-dimension，#472）的关系：本工具（#425）是通用缩放器——按像素/百分比自由缩放；#472 侧重尺寸调整的另一组能力，将在后续批次实现，两者互补不重复。
- Relationship with the upcoming image-dimension (#472): this tool (#425) is the general-purpose resizer (free scaling by pixels/percentage); #472 will cover a different set of dimension-adjustment capabilities in a later batch — complementary, not overlapping.
- GIF 动图缩放后只保留第一帧（Canvas 限制，页面有说明）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。
- 计算结果至少 1px；宽高上限 16384px。

## 数据流向 | Data flow

文件 → 内存 Canvas（按目标尺寸高质量重采样）→ Blob → 下载；不经过网络。
