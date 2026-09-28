# 图片转 ASCII image-to-ascii（#451）

## 用途 | Purpose

- 上传图片生成 ASCII 字符画：按目标字符宽度下采样，把每个像素块的亮度映射为字符集中的字符。
- Convert an image to ASCII art: downsample to a target character width, mapping each pixel block's brightness to a character.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项               | 说明                                                | Option          | Description                                         |
| ------------------ | --------------------------------------------------- | --------------- | --------------------------------------------------- |
| 字符宽度 charWidth | 输出每行字符数，10–200，默认 80                     | Character width | Chars per row, 10–200, default 80                   |
| 字符集 charset     | 标准 `@%#*+=-:. ` / 简单 `#*. ` / 方块 `█▓▒░ `      | Charset         | standard / simple / blocks                          |
| 反色 invert        | 反转字符渐变（亮→暗），适合深色背景                 | Invert          | Reverse the ramp (light→dark), for dark backgrounds |
| 彩色模式 color     | 开：彩色预览并下载 .html；关：纯文本预览并下载 .txt | Color mode      | On: colored preview + .html; Off: plain text + .txt |

## 输出 | Output

- 原图预览 + ASCII 预览（纯文本用 `<pre>`，彩色模式每个字符用原像素颜色着色）。
- 输出尺寸（列 × 行）统计，一键下载。
- Original preview + ASCII preview (plain `<pre>` for text mode, per-character original colors for color mode).
- Output size (cols × rows) stats, one-click download.

## 字符高宽比 | Character aspect ratio

- 等宽字体中字符高度约为宽度的 **2:1**。为保持画面比例不变，下采样时行数按
  `行数 = 列数 × (原图高 / 原图宽) / 2` 计算（`computeSampleDimensions`，至少 1 行），
  即每个字符对应一个「宽 1、高 2」像素比例的图像块；否则字符画会被纵向拉伸。
- Characters are ~2:1 (height:width), so row count is compensated as
  `rows = cols × (srcH / srcW) / 2` to preserve the picture's proportions.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 亮度按 Rec.601 系数（0.299/0.587/0.114）计算；透明像素按黑色处理（alpha 被忽略）。
- GIF 动图只取第一帧（Canvas 限制）。
- 彩色 HTML 中的字符与文件名均做 HTML 转义（`<>&`），可直接用浏览器打开查看。

## 数据流向 | Data flow

文件 → loadImageFromBlob → 下采样小 canvas → getImageData → 字符矩阵 → 预览/下载；不经过网络。
