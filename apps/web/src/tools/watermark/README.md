# 图片水印 watermark（#430）

## 用途 | Purpose

- 本地给单张图片添加可见文字水印：九宫格定位、旋转角度（防伪斜水印）、整图平铺。
- Add a visible text watermark to a single image locally: 3×3 grid positioning, rotation (anti-counterfeit diagonal watermark), full-image tiling.
- 与「文本水印」（text-watermark，#57）的区别：本工具给**图片**加可见文字水印；text-watermark 是把零宽字符隐藏水印藏进**纯文本**。批量给多张图片加水印见后续 #469 watermark-batch。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项             | 说明                              | Option    | Description                              |
| ---------------- | --------------------------------- | --------- | ---------------------------------------- |
| 水印文字 text    | 必填，空时报错"水印文字不能为空"  | Text      | Required; empty input is rejected        |
| 字号 fontSize    | 8–500 px，默认 48                 | Font size | 8–500 px, default 48                     |
| 颜色 color       | 默认 #ffffff                      | Color     | Default #ffffff                          |
| 不透明度 opacity | 0–100%，默认 50                   | Opacity   | 0–100%, default 50                       |
| 位置 position    | 九宫格，默认右下                  | Position  | 3×3 grid, default bottom-right           |
| 旋转角度 angle   | -180–180°，可小数，默认 -30       | Rotation  | -180–180°, decimals allowed, default -30 |
| 平铺 tile        | 整图重复平铺，间距 = 字号 × 2     | Tile      | Repeat across image, gap = size × 2      |
| 边距 margin      | 0–500 px，默认 24（平铺时不生效） | Margin    | 0–500 px, default 24 (ignored in tiling) |
| 输出格式 format  | jpeg / png / webp                 | Format    | jpeg / png / webp                        |
| 质量 quality     | 1–100，默认 80（PNG 不生效）      | Quality   | 1–100, default 80 (ignored for PNG)      |

## 输出 | Output

- 原图与加水印后预览、尺寸统计，一键下载（文件名 `原名-watermarked.<ext>`）。
- Original vs. watermarked preview, size stats, one-click download (`<name>-watermarked.<ext>`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图只处理第一帧（Canvas 限制）。
- 文本宽度由 Canvas measureText 度量，高度取 1.2 倍字号近似。
- 旋转以文本左上角为轴心；平铺模式忽略九宫格位置与边距。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（原图 + 水印文字绘制） → Blob → 下载；不经过网络。
