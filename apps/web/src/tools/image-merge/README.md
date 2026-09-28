# 图片拼接 image-merge（#439）

## 用途 | Purpose

- 本地把多张图片拼成一张：横向（左右拼）、纵向（上下拼）、网格（按列数自动换行）三种方向。
- Merge multiple images into one locally: horizontal (side-by-side), vertical (stacked), or grid (wrap by column count).
- 与「长图拼接」（image-long-stitch #440）的区别：本工具是**通用多图拼接**（横向/纵向/网格，可调间距、背景色、对齐、列数）；#440 是**专用纵向长图**工具（截图拼长图场景，纵向连续拼接为主）。

## 输入 | Input

- 图片文件（可多选）：PNG / JPEG / WebP / GIF / BMP / AVIF，每张上限 50MB。
- Multiple image files: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.
- 每张图独立校验：类型不支持或超 50MB 只报错该张，不影响其他已选图；支持删除单张、清空全部。
- 至少 2 张才能拼接，只有 1 张时会提示错误。

## 选项 | Options

| 选项               | 说明                                                                         | Option    | Description                                                                   |
| ------------------ | ---------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| 拼接方向 direction | horizontal 横向 / vertical 纵向 / grid 网格                                  | Direction | horizontal / vertical / grid                                                  |
| 列数 columns       | 1–10，默认 3（仅网格模式生效）                                               | Columns   | 1–10, default 3 (grid only)                                                   |
| 间距 gap           | 图片之间的间距 px，0–200，默认 0                                             | Gap       | Gap between images in px, 0–200, default 0                                    |
| 背景色 bgColor     | 空白区域填充色，默认 #ffffff                                                 | Bg color  | Fill color for empty areas, default #ffffff                                   |
| 对齐 align         | 横向时垂直对齐 top/center/bottom；纵向时水平对齐 left/center/right；网格忽略 | Align     | vertical align for horizontal, horizontal align for vertical, ignored in grid |
| 输出格式 format    | jpeg / png / webp                                                            | Format    | jpeg / png / webp                                                             |
| 质量 quality       | 1–100，默认 85（PNG 不生效）                                                 | Quality   | 1–100, default 85 (ignored for PNG)                                           |

## 输出 | Output

- 输入图缩略图列表（含每张尺寸）、拼合结果预览、输出总尺寸（宽×高）、一键下载。
- Input thumbnails (with dimensions), merged preview, total output size (W×H), one-click download.
- 文件名形如 `merged-20260928-120507.jpg`。

## 边界 | Limits

- 尺寸不一致的图片**不拉伸**，按原尺寸依对齐方式放置，空白处填充背景色。
- 至少 2 张图片才能拼接。
- 全程本地 Canvas 处理，不上传。
- PNG 为无损格式，质量参数不生效。
- 缩略图与结果的 Blob URL 在删除 / 清空 / 卸载时及时释放，避免内存泄漏。

## 数据流向 | Data flow

多文件 → 逐张解码取尺寸 → 按布局计算位置 → 单 Canvas 绘制 → Blob → 下载；不经过网络。
