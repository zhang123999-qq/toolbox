# 图片尺寸调整 image-dimension（#472）

## 用途 | Purpose

- 目标尺寸导向：指定精确的目标宽×高（像素），按适配模式输出，全程本地 Canvas 处理，不上传。
- Resize to exact target dimensions locally: specify precise target width × height with a fit mode, no upload.
- 注：docs/tools/08-图片图形.md 中 #472 的规格描述只有"调整尺寸"四字，较简略；本工具按"目标尺寸 + 适配模式"方案实现，与 #425 图片缩放（通用缩放器）不重叠。

## 适配模式 | Fit modes

| 模式             | 行为                                                                         | Mode    | Behavior                                                                                                |
| ---------------- | ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 等比留白 contain | 整图完整可见，等比缩放到恰好容纳，空白处填充背景色（可选，默认白色 #ffffff） | Contain | Whole image visible, scaled to fit, blank area filled with background color (optional, default #ffffff) |
| 等比裁剪 cover   | 等比放大到填满目标尺寸，多余部分居中裁掉                                     | Cover   | Scaled to fill target size, excess cropped from center                                                  |
| 拉伸 stretch     | 直接拉伸到目标尺寸，不保持纵横比（可能变形，界面有提示）                     | Stretch | Stretched to target size directly, aspect ratio not preserved (may distort, warned in UI)               |

图解（文字）：设原图 800×600，目标 400×400 ——

- contain：scale = min(400/800, 400/600) = 0.5 → 绘制 400×300，上下各留白 50px；
- cover：scale = max(400/800, 400/600) ≈ 0.667 → 从原图居中裁 600×600（裁掉左右各 100px），再缩到 400×400；
- stretch：整图直接拉满 400×400，画面被横向压扁。

## 预设 | Presets

| 预设        | 目标尺寸  | Preset | Dimensions   |
| ----------- | --------- | ------ | ------------ |
| 1920 × 1080 | 1920×1080 | 1080p  | 1920×1080    |
| 1280 × 720  | 1280×720  | 720p   | 1280×720     |
| 800 × 600   | 800×600   | SVGA   | 800×600      |
| 512 × 512   | 512×512   | Square | 512×512      |
| 256 × 256   | 256×256   | Thumb  | 256×256      |
| 自定义      | 手动输入  | Custom | Manual input |

手动修改宽/高后预设自动切换为"自定义"。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项            | 说明                                           | Option   | Description                                           |
| --------------- | ---------------------------------------------- | -------- | ----------------------------------------------------- |
| 预设 preset     | 常用目标尺寸下拉，自定义则手动输入             | Preset   | Common target-size presets; "custom" for manual input |
| 目标宽度 width  | 1–16384 的整数（像素）                         | Width    | Integer 1–16384 (px)                                  |
| 目标高度 height | 1–16384 的整数（像素）                         | Height   | Integer 1–16384 (px)                                  |
| 适配模式 fit    | contain / cover / stretch                      | Fit mode | contain / cover / stretch                             |
| 背景色 bgColor  | 仅 contain 生效，#rrggbb 或 #rgb，默认 #ffffff | BG color | contain only, #rrggbb or #rgb, default #ffffff        |
| 输出格式 format | jpeg / png / webp                              | Format   | jpeg / png / webp                                     |
| 质量 quality    | 1–100，默认 80（PNG 不生效）                   | Quality  | 1–100, default 80 (ignored for PNG)                   |

## 输出 | Output

- 调整前后预览、目标尺寸与文件大小统计，一键下载（文件名后缀按格式替换，如 `photo-dimension.jpg`）。
- Before/after preview, target-size and file-size stats, one-click download.

## 与 #425 图片缩放的差异 | vs image-resize (#425)

- #425 图片缩放是**通用缩放器**：按像素/百分比自由缩放，可锁定纵横比，等比为主，用于"把图变大/变小"。
- 本工具（#472）是**目标尺寸导向**：先指定必须输出的精确宽×高，再用适配模式（留白/裁剪/拉伸）解决纵横比不一致，用于"必须输出某种尺寸"的场景（如头像、横幅、封面图）。

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图调整后只保留第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。
- 目标宽高任一超出 1–16384 范围会被拒绝；背景色非 #rrggbb/#rgb 格式会被拒绝（仅 contain 校验）。

## 数据流向 | Data flow

文件 → 内存 Canvas（按适配模式绘制）→ Blob → 下载；不经过网络。
