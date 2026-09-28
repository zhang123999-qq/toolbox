# 图片标注 image-annotate（#480）

## 用途 | Purpose

- 单图上传，在图上做标注后下载合并后的图：画笔（自由线）、直线、箭头、矩形、椭圆、文字、马赛克笔刷。
- Annotate a single image with brush, line, arrow, rectangle, ellipse, text and mosaic tools, then download the merged result.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项           | 说明                                                                                       | Option     | Description                                           |
| -------------- | ------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------- |
| 标注工具 tool  | brush 画笔 / line 直线 / arrow 箭头 / rect 矩形 / ellipse 椭圆 / text 文字 / mosaic 马赛克 | Tool       | brush / line / arrow / rect / ellipse / text / mosaic |
| 颜色 color     | 标注颜色，默认 #ff0000                                                                     | Color      | Markup color, default #ff0000                         |
| 线宽 lineWidth | 1–50，默认 4（马赛克笔刷半径 = 线宽 × 4）                                                  | Line width | 1–50, default 4 (mosaic radius = width × 4)           |
| 字号 fontSize  | 12–120，默认 32（文字工具）                                                                | Font size  | 12–120, default 32 (text tool)                        |
| 文字内容 text  | 文本框输入，text 模式点击画布放置（为空时提示）                                            | Text       | Typed in the box, click canvas to place in text mode  |

## 输出 | Output

- 底图 + 标注层合并后的 PNG（文件名：原名去扩展名 + `-annotated.png`），一键下载。
- Merged PNG of base image + annotation layer (`<name>-annotated.png`), one-click download.

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 画布按原图尺寸 1:1 显示，不缩放：标注坐标精确对应像素。
- 撤销历史：每次落笔（mouseup）或文字放置推入快照，上限 30 步，超限丢弃最旧；「清空标注」恢复底图并清空历史。
- 马赛克笔刷：以落笔点为圆心、线宽 × 4 为半径，在底图对应区域取像素做块像素化后写回标注层。
- text 模式点击画布时若文字输入为空，行内提示错误，不放置。
- GIF 动图只处理第一帧（Canvas 限制）。

## 数据流向 | Data flow

文件 → 底图 canvas（原尺寸 1:1）＋ 标注层 canvas（透明，接收鼠标事件）
→ 落笔快照入历史栈（ImageData）
→ 下载时合并到底图尺寸的新 canvas → Blob → 下载；不经过网络。
