# 图片主色提取 color-extract（#456）

## 用途 | Purpose

- 上传图片，提取主色调色板：每个色块展示 HEX / RGB / 占比，点击色块复制 HEX 到剪贴板。
- Extract the dominant color palette from an image: each swatch shows HEX / RGB / share; click a swatch to copy its HEX.
- 典型用途：配色参考、品牌色提取、设计稿取色。
- Typical uses: color scheme reference, brand color extraction, picking colors from a design.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项           | 说明         | Option      | Description     |
| -------------- | ------------ | ----------- | --------------- |
| 颜色数量 count | 3–10，默认 6 | Color count | 3–10, default 6 |

## 输出 | Output

- 主色调色板：色块 + HEX（#rrggbb 小写）+ RGB + 占比（该色像素 / 总像素），按占比降序排列。
- Dominant palette: swatch + HEX (lowercase #rrggbb) + RGB + share (color pixels / total pixels), sorted by share desc.
- 点击色块复制 HEX；复制失败时页面给出“复制失败”提示。
- Click a swatch to copy its HEX; a notice is shown if copying fails.

## 聚类算法 | Algorithm

采用**均匀量化桶（uniform quantization）**统计，而非 K-Means：

1. 图片先下采样到 100×100（`drawScaled`，共 10000 像素），兼顾速度与代表性；
2. RGB 每通道取高 4 bit，组成 12 bit 桶序号（16×16×16 = 4096 桶），逐像素计数；
3. 按频次降序取前 N 个桶（频次相同按桶序号升序，保证结果确定性）；
4. 每个桶的代表色取桶内像素各通道的算术均值（四舍五入），而非桶中心值——
   均值更贴近该色系在原图中的实际观感；
5. 占比 = 桶计数 / 总像素数。

Alpha 通道不参与统计：透明像素仍按其 RGB 计入对应桶（半透明边缘色会被正常统计）。

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- 下采样到 100×100 后统计：极小的点缀色可能被合并到相近色桶中消失；如需精确取色请用取色器类工具。
- GIF 动图只统计第一帧（Canvas 限制）。
- 剪贴板写入需要浏览器授权；被拒绝时显示“复制失败”，可手动复制色块上的 HEX 文本。
- 均匀量化是近似算法：渐变丰富的图片可能出现相近色各占一个名额的情况。

## 数据流向 | Data flow

文件 → 内存 Canvas（100×100）→ 像素数组 → 纯函数 `extractPalette` → 色卡展示；不经过网络。
