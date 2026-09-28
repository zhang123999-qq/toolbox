# PNG 转 SVG png-to-svg（#454）

## 用途 | Purpose

- 把位图（PNG/JPEG/WebP/GIF/BMP/AVIF）**矢量化**为 SVG 路径：海报化分层 → 逐层描摹 → 组装 `<svg>`，可预览、可下载 `.svg`。
- Vectorize bitmaps to SVG paths locally: posterize into layers, trace each layer, assemble `<svg>`; preview and download.
- 适合 logo、图标、剪影、像素画等色块分明的图形；复杂照片效果有限（见「诚实说明」）。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                    | 说明                                              | Option          | Description                                       |
| ----------------------- | ------------------------------------------------- | --------------- | ------------------------------------------------- |
| 颜色数 colors           | 2–8，默认 4；每通道均匀量化等级数（海报化分层）   | Colors          | 2–8, default 4; per-channel quantization levels   |
| 最大边 maxEdge          | 64–1024，默认 256；下采样精度（越大越精细、越慢） | Max edge        | 64–1024, default 256; downscale precision         |
| 最小色块 minArea        | px²，默认 4；过滤小于此面积的噪点色块，0=不过滤   | Min area        | px², default 4; drop blobs smaller than this      |
| 保留背景 keepBackground | 开/关，默认关；关=丢弃最浅色层使背景透明          | Keep background | on/off, default off; off drops the lightest layer |

## 输出 | Output

- 原图与矢量结果并排预览、尺寸/色层数/ SVG 体积统计，一键下载 `*-vector.svg`。
- Side-by-side original/vector preview, dimension/layer-count/SVG-size stats, one-click download.

## 算法说明 | Algorithm

1. **下采样**：按最大边等比缩小（Canvas 高质量缩放），控制计算量。
2. **海报化分层**（`posterize`）：每通道均匀量化为 N 个等级，相同量化色的像素归入同一层，每层得到二值掩膜与代表色 `#rrggbb`。
3. **描摹**（`traceLayer`）：marching squares 简化版——逐行扫描，把每层连续前景像素合并为水平矩形，每个矩形输出为 SVG 子路径（`M…L…Z`）。刻意避开 16-case 轮廓拼接的 saddle case 与孔洞歧义，保证零逻辑漏洞；代价见下。
4. **过滤**（`filterSmallPolygons`）：按鞋带公式面积丢弃小色块（去噪点）。
5. **组装**（`buildSvg`）：`<svg viewBox>` + 每层 `<path fill>`；丢弃背景时最浅色层直接省略，背景即透明。

## 技术路线决策（GPL 说明）| License decision

- 文档技术路线曾建议 **potrace**，但 potrace 的 npm 包为 **GPL-2.0** 许可证，被本项目 `check-licenses` 门禁拒绝（仅允许 MIT / Apache-2.0 等宽松许可证），且批次内不允许安装新依赖。
- 因此本工具为**零依赖、自研纯 JS 实现**（`deps: []`，feasibility 记为 `A`）：海报化 + marching squares 简化版描摹，全部逻辑在 `utils.ts` 纯函数中，可 100% 单测。

## 效果诚实说明 | Honest notes

- 这是**简化版描摹**，不是 potrace：曲线边缘呈阶梯状（矩形合并所致），没有贝塞尔曲线拟合，没有去噪以外的形态学优化。
- 复杂照片（渐变、纹理、柔边）转出来是"海报化色块"风格，色块多、文件大，效果不如 potrace。
- 适合：logo、图标、剪影、印章、像素画、黑白线稿（颜色数 2）。
- 想获得更平滑的描摹：先用「图片压缩/滤镜」类工具提高对比、减少颜色，或把最大边调大（更精细但更慢）。

## 边界 | Limits

- 全程本地 Canvas + 纯 JS 计算，不上传。
- 最大边上限 1024：1024×1024×8 色层的同步计算在桌面浏览器约数百毫秒，界面有「处理中」加载态；更大尺寸请先自行缩小。
- 单文件上限 50MB。
- 输出 SVG 无贝塞尔拟合，放大后可见阶梯边缘（算法固有，非 Bug）。
- 透明 PNG 的 alpha 通道不参与分层（按 RGB 量化），半透明区域会被量化为实色。

## 数据流向 | Data flow

文件 → 内存 Canvas → 像素数组 → SVG 字符串 → Blob → 下载/预览；不经过网络。
