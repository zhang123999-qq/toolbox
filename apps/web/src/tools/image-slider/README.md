# 图片对比滑块 image-slider（#479）

## 用途 | Purpose

- 上传同一场景的前/后两张图，拖拽分隔线做直观的视觉对比，支持左右 / 上下两种对比方向。
- Upload before/after photos of the same scene and compare them visually with a draggable slider, horizontally or vertically.
- 与「图片对比」（image-compare #449）的区别：#449 做**像素级差异计算**，提供并排 / 差异热力图等分析视图；本工具（#479）只做**拖拽滑块的视觉对比**，不做任何像素计算，纯 CSS + DOM 实现。

## 输入 | Input

- 图 A（前 / 左 / 上）：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- 图 B（后 / 右 / 下）：同上，独立校验；图 B 加载失败时单独报错，不影响图 A。
- Image A (before/left/top) and image B (after/right/bottom): PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB each, validated independently.

## 选项 | Options

| 选项               | 说明                                           | Option    | Description                                           |
| ------------------ | ---------------------------------------------- | --------- | ----------------------------------------------------- |
| 对比方向 direction | horizontal=左右对比（默认）/ vertical=上下对比 | Direction | horizontal=left-right (default) / vertical=top-bottom |

## 交互 | Interactions

- 拖拽分隔线：在分隔线上按住鼠标拖动，实时改变两侧显示比例。
- 点击轨道：点击对比区任意位置，分隔线直接跳转到该位置。
- 键盘：分隔线可聚焦（Tab），方向键左右 / 上下微调 ±2（符合 `role="slider"` 的 a11y 约定，`aria-valuenow` 实时更新）。
- 方向切换：切换对比方向时保留当前滑块百分比。
- 重新选择：一键清空两张图、错误与滑块位置（回到 50%）。

## 边界 | Limits

- 尺寸对齐规则（明确且可预测）：对比容器宽高比 = 图 A 宽高比；两张图都拉伸填满容器（`object-fit: fill`，CSS 拉伸），页面注明"两图已按左图/上图尺寸对齐显示"。尺寸差异大的两张图会有拉伸变形，这是预期行为。
- 容器尚未布局（宽/高为 0）时的指针事件会被忽略，不会抛错。
- 全程本地 DOM/CSS 处理，不上传，不使用 canvas，不引入新依赖。

## 数据流向 | Data flow

文件 → `URL.createObjectURL` → `<img>` 显示；滑块百分比 → state → `clip-path` / 分隔线定位。不经过网络；object URL 在替换 / 重置 / 卸载时及时释放。
