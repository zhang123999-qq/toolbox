# 圆角图片 image-round（#429）

## 用途 | Purpose

- 本地给图片加圆角（圆角矩形裁剪）或裁成圆形：可选透明 / 白色 / 自定义背景色，全程不上传。
- Round image corners or crop to a circle locally: transparent / white / custom background, no upload.
- 常见用途：头像、App 图标、卡片配图的圆角处理。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                   | 说明                                                | Option        | Description                                                             |
| ---------------------- | --------------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| 模式 mode              | 圆角 round / 圆形 circle                            | Mode          | Rounded rect / circle                                                   |
| 圆角半径 radius        | 非负数可小数；px 上限 16384，% 上限 100（相对短边） | Corner radius | Non-negative, decimals allowed; px max 16384, % max 100 (of short side) |
| 半径单位 radiusUnit    | px / %（% 指相对短边；结果钳制到短边一半）          | Radius unit   | px / % of short side, clamped to half short side                        |
| 背景 background        | 透明 transparent / 白色 white / 自定义 custom       | Background    | transparent / white / custom                                            |
| 自定义颜色 customColor | 背景=自定义时生效（颜色选择器）                     | Custom color  | Active when background=custom                                           |
| 输出格式 format        | png（默认，保留透明） / jpeg                        | Format        | png (default, keeps transparency) / jpeg                                |

## 输出 | Output

- 原图与处理后预览、输出尺寸统计，一键下载（文件名形如 `photo-rounded.png`）。
- Original/processed preview, output size stats, one-click download (`photo-rounded.png`).

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 透明背景仅 PNG 有效：选 JPEG + 透明背景时，四角自动按白色填充，界面会给出提示（JPEG 无 alpha 通道）。
- 圆形模式 = 以图片中心为圆心、直径为短边的内切圆裁剪，输出正方形；此时半径输入被禁用。
- 半径超过短边一半时自动钳制到短边一半。
- JPEG 输出质量固定为最高（不提供质量选项，见 utils.OUTPUT_QUALITY）。
- GIF 动图只处理第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP——本工具仅提供 png/jpeg，无此问题）。

## 数据流向 | Data flow

文件 → 内存 Canvas（填背景 → 圆角矩形/圆形路径 clip → 绘制） → Blob → 下载；不经过网络。
