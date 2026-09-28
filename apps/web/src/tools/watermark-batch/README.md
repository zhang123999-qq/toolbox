# 图片水印批量 watermark-batch（#469）

## 用途 | Purpose

- 多张图片批量加文字水印：统一设置一次，应用到全部图片。
- Add a text watermark to multiple images at once: configure once, apply to all.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，可多选，单文件上限 50MB。
- Image files: PNG / JPEG / WebP / GIF / BMP / AVIF, multi-select, max 50MB per file.

## 选项 | Options

| 选项             | 说明                                                 | Option    | Description                              |
| ---------------- | ---------------------------------------------------- | --------- | ---------------------------------------- |
| 水印文字 text    | 上限 100 字，必填                                    | Text      | Max 100 chars, required                  |
| 位置 position    | 九宫格：左上/上中/右上/左中/居中/右中/左下/下中/右下 | Position  | 9-grid placement                         |
| 字号 size        | 相对图片**短边**的百分比，2–20%，默认 6%             | Font size | % of image short side, 2–20%, default 6% |
| 颜色 color       | #rrggbb                                              | Color     | #rrggbb                                  |
| 不透明度 opacity | 10–100%，默认 50%                                    | Opacity   | 10–100%, default 50%                     |
| 旋转角度 angle   | -45–45°，默认 0（不旋转）                            | Angle     | -45–45°, default 0 (no rotation)         |
| 整图平铺 tile    | 开：水印铺满整图；关：单个定位                       | Tile      | On: tiled; off: single placement         |
| 输出格式 format  | jpeg / png / webp                                    | Format    | jpeg / png / webp                        |
| 质量 quality     | 1–100，默认 80（PNG 不生效）                         | Quality   | 1–100, default 80 (ignored for PNG)      |

## 输出 | Output

- 逐项进度（已完成 / 总数）、取消按钮。
- 每项状态：等待 / 处理中 / 成功 / 失败；失败项显示原因（如格式不支持、解码失败）。
- 结果列表：成功项缩略图 + 逐项下载按钮（文件名形如 `photo-watermarked.jpg`）。
- Per-item progress (done / total), a cancel button.
- Per-item status: pending / processing / done / error, with the failure reason shown.
- Result list: thumbnails for successful items plus a download button per item
  (e.g. `photo-watermarked.jpg`).

## 边界 | Limits

- **批量总数上限 20 张**：每张图片解码后位图常驻内存（如 8000×8000 像素约 256MB），
  结果 Blob 也常驻内存待下载；20 张是内存与处理时长的折中上限。
- **并发最多 3**：同一时刻最多 3 张图占用 Canvas 位图，峰值内存可控。
- 单文件上限 50MB（浏览器内存安全边界）。
- 全程本地 Canvas 处理，不上传；及时释放不再用的对象 URL。
- GIF 动图只保留第一帧（Canvas 限制）。
- PNG 为无损格式，质量参数不生效。
- **与 #430 watermark（单张图片水印）的差异**：#430 是单张精细调节
  （绝对像素字号、边距、-180–180° 旋转）；本工具是批量版，统一设置一次
  应用到多张图片，字号按图片短边百分比自适应，不提供单张级边距微调。
  需要逐张精细控制请用 #430。
- #57 text-watermark 是往文本里嵌入零宽字符的隐藏水印，操作对象是文本，
  与本图片水印工具不相关。

## 数据流向 | Data flow

文件 → 内存 Canvas（逐张绘制水印，并发 ≤3）→ Blob → 逐项下载；不经过网络。
