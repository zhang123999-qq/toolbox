# 图片对比 image-compare（#449）

## 用途 | Purpose

- 上传两张图片做**像素级差异对比**：side 模式并排显示，diff 模式输出差异热力图（差异像素红色半透明叠加）并统计差异像素数与占比。
- Compare two images at the pixel level: side-by-side view, or a diff heatmap (different pixels overlaid in translucent red) with different/total pixel counts and ratio.
- 与「图片对比滑块」（image-slider，#479）的区别：本工具做**像素级差异计算**，输出并排视图与差异热力图等分析结果；#479 只提供拖拽滑块的直观视觉对比，不做任何像素计算。

## 输入 | Input

- 两张图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，各自独立投放区，单文件上限 50MB。
- Two image files: PNG / JPEG / WebP / GIF / BMP / AVIF, independent drop zones, max 50MB per file.
- 任一张图校验失败（类型/大小）只影响该槽位，不影响另一张图。

## 选项 | Options

| 选项               | 说明                                 | Option    | Description                                               |
| ------------------ | ------------------------------------ | --------- | --------------------------------------------------------- |
| 对比模式 mode      | side 并排显示（默认）/ diff 差异高亮 | Mode      | side: side-by-side (default); diff: highlight differences |
| 差异阈值 threshold | 0–255 的整数，默认 30                | Threshold | Integer 0–255, default 30                                 |

## 输出 | Output

- side 模式：两张图并排显示。
- diff 模式：底层为图 A、差异层（红色半透明）叠加其上的热力图 + 统计文本（差异像素 x / 总像素 y，占比 z%，1 位小数）。
- Side mode: the two images displayed side by side.
- Diff mode: heatmap (image A at the bottom, translucent-red diff layer on top) plus stats text (different pixels x / total y, z% with 1 decimal).

## 边界 | Limits

- **以图 A 尺寸为基准**：diff 模式下图 B 会等比缩放到与图 A 完全相同的宽高后再逐像素比较。
- **只比较 RGB 三通道，alpha 通道忽略**：两张图同一位置 RGB 相同、仅透明度不同，不计为差异。
- **阈值语义**：任一通道差值 **> threshold** 即为差异像素（差值 == threshold 不算）。
- 阈值/模式变更自动重算；像素数据按文件缓存，避免重复解码。
- 全程本地 Canvas 处理，不上传；GIF 动图只取第一帧（Canvas 限制）。

## 数据流向 | Data flow

文件 A/B → object URL（预览）→ Canvas getImageData 取像素 → computeDiff 得差异层 → putImageData 叠加绘制；不经过网络。组件卸载/重置/重复上传时及时 revoke object URL。
