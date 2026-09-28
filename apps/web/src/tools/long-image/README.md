# 长图拼接 long-image（#440）

## 用途 | Purpose

- 多图纵向拼接成一张长图，适合聊天记录、网页截图等多图首尾相接的场景。
- Stitch multiple images vertically into one long image — ideal for chat logs and webpage screenshots.
- 与「图片拼接」（#439）的区别：#439 是通用拼接（横向 / 纵向 / 网格自由排布）；
  本工具 #440 专做**纵向长图**，核心能力是「统一宽度」（以最宽图为准，其余等比缩放）
  与「上移 / 下移排序」，为长截图场景定制。

## 输入 | Input

- 图片文件（可多选 / 拖拽多张）：PNG / JPEG / WebP / GIF / BMP / AVIF，每张上限 50MB。
- 至少 2 张才拼接；每张独立校验（类型 / 大小），失败单张报错，不污染其他图片。
- Multiple image files (multi-select / drag & drop): PNG / JPEG / WebP / GIF / BMP / AVIF,
  max 50MB per file. At least 2 images required; each file is validated independently —
  one bad file never blocks the others.

## 选项 | Options

| 选项               | 说明                                                          | Option     | Description                                      |
| ------------------ | ------------------------------------------------------------- | ---------- | ------------------------------------------------ |
| 宽度模式 widthMode | uniform 统一宽度（以最宽图为准等比缩放）/ original 保持原尺寸 | Width mode | uniform = scale to widest / original = keep size |
| 对齐 align         | original 模式下窄图对齐：left / center / right                | Align      | Narrow-image alignment in original mode          |
| 间距 gap           | 图之间间距 0–200px，默认 0                                    | Gap        | Spacing between images, 0–200px, default 0       |
| 背景色 bgColor     | 画布背景色，默认 #ffffff                                      | Background | Canvas background color, default #ffffff         |
| 输出格式 format    | jpeg / png / webp                                             | Format     | jpeg / png / webp                                |
| 质量 quality       | 1–100，默认 85（PNG 不生效）                                  | Quality    | 1–100, default 85 (ignored for PNG)              |

## 输出 | Output

- 长图预览、总尺寸与图片数统计，一键下载（文件名 `long-image-<yyyymmdd-hhmmss>.<ext>`）。
- Long-image preview, total dimensions and image count, one-click download.

## 边界 | Limits

- 排序：缩略图列表支持上移 / 下移 / 删除单张 / 清空；首尾项的移动按钮自动禁用。
- 统一宽度算法：`computeLongLayout` 纯函数实现 —— uniform 模式画布宽取最宽图，
  每张按 `h = round(原高 × 宽 / 原宽)` 等比缩放（最小 1px）；original 模式保持原尺寸，
  画布宽取最宽图，窄图按对齐方式计算 x 偏移；间距只出现在图与图之间（n-1 个），不加首尾。
- 内存释放：缩略图 object URL 在删除 / 清空时立即 revoke；旧结果 URL 在重拼 / 清空时释放。
- 全程本地 Canvas 处理，不上传；GIF 动图只保留第一帧（Canvas 限制）。
- Reordering: move up / down, remove one, clear all; boundary buttons auto-disabled.
- Layout (`computeLongLayout`, pure): uniform scales every image to the widest width
  (`h = round(srcH × width / srcW)`, min 1px); original keeps sizes and offsets narrow
  images by alignment; gap only between images (n-1 gaps).
- Memory: thumbnail object URLs revoked on remove/clear; previous result URL revoked on re-stitch/clear.
- 100% local Canvas processing, no upload; animated GIFs keep the first frame only.

## 数据流向 | Data flow

文件 → 解码取尺寸 → 纯函数算布局 → 主 Canvas（填充背景色 + 逐张绘制）→ Blob → 下载；不经过网络。
