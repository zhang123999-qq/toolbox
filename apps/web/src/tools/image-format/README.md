# 图片格式检测 image-format（#471）

## 用途 | Purpose

- 批量检测图片真实格式：只读每张图片前 12 字节文件头魔数，识别真实格式，
  逐项判定「扩展名声明类型 vs 真实格式」的一致性，支持一键复制 / 下载检测报告。
- Batch-detect real image formats from file-header magic numbers,
  check "declared extension vs actual format" consistency per file,
  one-click copy / download of the report.

## 魔数表 | Magic numbers

| 格式 | 魔数（前 12 字节内）                  | Format |
| ---- | ------------------------------------- | ------ |
| PNG  | `89 50 4E 47 0D 0A 1A 0A`             | PNG    |
| JPEG | `FF D8 FF`                            | JPEG   |
| GIF  | `47 49 46 38`（"GIF8"）               | GIF    |
| WebP | 0-3 为 `RIFF` 且 8-11 为 `WEBP`       | WebP   |
| BMP  | `42 4D`                               | BMP    |
| ICO  | `00 00 01 00`                         | ICO    |
| AVIF | offset 4 为 `ftyp` 且 brand 含 `avif` | AVIF   |
| SVG  | 文本头含 `<svg`                       | SVG    |

以上皆未命中时结论为「无法识别」。字节不足（截断文件）不会误判。

## 一致性规则 | Consistency

| 情况                      | 结论                     |
| ------------------------- | ------------------------ |
| 扩展名期望格式 = 检测格式 | 一致 ✓                   |
| 扩展名期望格式 ≠ 检测格式 | 扩展名与内容不符 ⚠       |
| 魔数未识别                | 无法识别 ✗               |
| 无扩展名 / 未知扩展名     | 无扩展名，仅报告检测格式 |

扩展名映射：`png→PNG`、`jpg/jpeg→JPEG`、`gif→GIF`、`webp→WebP`、`bmp→BMP`、
`ico→ICO`、`avif→AVIF`、`svg→SVG`（大小写不敏感）。

## 批量上限 | Limits

- 单文件上限 50MB；批量总数上限 50。
- 只读每张文件前 12 字节（`File.slice`），不解码图片、不生成预览，因此内存占用小，
  50 个文件的批量检测也不会造成明显内存压力。
- 全程本地处理，不上传。

## 输入 / 输出 | I/O

- 输入：图片文件（可多选 / 拖拽批量）。
- 输出：检测报告文本（逐项：文件名、声明类型（扩展名/MIME）、检测到的真实格式、一致性结论），
  可一键复制或下载为 `.txt`。

## 与 #467 的差异 | vs image-info

- `image-info`（#467）：**单张**图片元信息查看（尺寸、宽高比、百万像素、色彩空间、魔数等）。
- 本工具（#471）：**批量**筛查，聚焦「扩展名与真实格式一致性」判定 + 可导出报告，
  不做尺寸等元信息展示。

## 数据流向 | Data flow

文件 → 文件头 12 字节 → 魔数判定 → 报告文本；不经过网络。
