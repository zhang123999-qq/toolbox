# 图片旋转批量 rotate-batch（#473）

## 用途 | Purpose

- 多张图片按**统一角度**批量旋转：90°/180°/270° 快捷预设 + -360~360 自定义角度，一次应用到全部图片。
- Rotate multiple images by one **unified angle**: 90°/180°/270° quick presets plus a custom angle (-360~360), applied to all images at once.
- 与「图片旋转」（image-rotate #423）的区别：#423 是单张精细操作——快捷角度可在当前角度上**连续累加**、支持任意角度微调与背景色/透明选项；本工具是批量版，一个统一角度一次应用到多张图片，不提供逐张微调与累加。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image files: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项             | 说明                                        | Option       | Description                                    |
| ---------------- | ------------------------------------------- | ------------ | ---------------------------------------------- |
| 快捷角度         | 90°/180°/270°，点击即设定统一角度（不累加） | Quick angles | 90°/180°/270° presets, set the angle directly  |
| 自定义角度 angle | -360~360，可小数，顺时针为正                | Custom angle | -360~360, decimals allowed, clockwise positive |
| 输出格式 format  | jpeg / png / webp                           | Format       | jpeg / png / webp                              |
| 质量 quality     | 1–100，默认 90（PNG 不生效）                | Quality      | 1–100, default 90 (ignored for PNG)            |

## 输出 | Output

- 逐项进度（n/N + 进度条）、每项状态（等待/处理中/成功/失败+原因）、结果缩略图与逐项下载。
- Per-item progress (n/N + progress bar), per-item status (pending/processing/done/failed with reason), result thumbnails and per-item download.

## 旋转几何 | Rotation geometry

- 画布尺寸按**旋转包络矩形**计算：`W = |w·cosθ| + |h·sinθ|`，`H = |w·sinθ| + |h·cosθ|`，四舍五入取整，最小 1px。
- Canvas size follows the **rotation bounding box**: `W = |w·cosθ| + |h·sinθ|`, `H = |w·sinθ| + |h·cosθ|`, rounded to integers, minimum 1px.
- 90° 奇数倍（90°/270°）时三角函数值钳制为精确的 0/1，宽高**精确互换**，无浮点误差。
- 图片以画布中心为原点 `translate + rotate + drawImage` 绘制；非直角旋转时四角留白（PNG 保持透明，JPEG/WebP 编码为黑色）。

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 批量总数上限 **20** 张：结果 Blob 常驻内存、解码位图峰值可控，超限拒绝并提示。
- 并发最多 **3**：单张大图 Canvas 位图可达数百 MB，限并发保证内存峰值可控。
- 取消后：等待中的项直接标记失败（已取消），处理中的项完成后丢弃结果并及时释放对象 URL。
- GIF 动图旋转后只保留第一帧（Canvas 限制）。

## 数据流向 | Data flow

文件 → 内存 Canvas（旋转绘制）→ Blob → 下载；不经过网络；对象 URL 在替换/重置/取消后及时释放。
