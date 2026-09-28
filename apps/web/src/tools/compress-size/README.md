# 压缩到指定大小 compress-size（#460）

## 用途 | Purpose

- 输入目标大小（KB），工具自动把图片压缩到**不超过目标字节数**：先对 JPEG/WebP
  质量 1–100 做二分查找逼近，找到满足目标的最大质量；若质量=1 仍超标，则按
  面积 ×0.7 逐轮缩小尺寸后重新二分（最多 3 轮，保底 1px）。
- Enter a target size (KB); the tool binary-searches JPEG/WebP quality 1–100 for
  the best quality fitting under the target. If quality=1 still overshoots, it
  downscales (area ×0.7 per round, up to 3 rounds, min 1px) and re-searches.
- 与「图片压缩」（image-compress #421）的区别：本工具按**目标字节数**二分逼近；
  image-compress 按**质量/格式**直接压缩。

## 算法 | Algorithm

两阶段，全程本地 Canvas 2D 重编码：

1. **质量二分**：在质量区间 [1, 100] 内二分探测，每次取中点编码一次，
   体积 ≤ 目标则向高质量侧收敛（记录当前最优），否则向低质量侧收敛，
   直到找到满足目标的最大质量。区间每次减半，实际 ≤7 次收敛，
   另设 20 次迭代上限防死循环。
2. **降尺寸重试**：若质量=1 仍超标，将宽高按面积 ×0.7 等比缩小
   （`scale = √0.7`，四舍五入，保底 1px），回到阶段 1 重新二分；
   最多缩小 3 轮（即最多尝试原尺寸 + 3 档缩小尺寸）。

结果展示：二分探测总次数、最终质量、最终尺寸、原体积 → 新体积。

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file.

## 选项 | Options

| 选项                | 说明                                  | Option      | Description                                |
| ------------------- | ------------------------------------- | ----------- | ------------------------------------------ |
| 输出格式 format     | jpeg / webp（PNG 无质量参数无法二分） | Format      | jpeg / webp (PNG has no quality to search) |
| 目标大小 targetSize | KB，整数，范围 1–51200（即 50MB）     | Target size | KB, integer, range 1–51200 (i.e. 50MB)     |

## 输出 | Output

- 压缩前后预览、尝试次数 / 最终质量 / 最终尺寸 / 体积变化统计，一键下载。
- Before/after preview, attempts / final quality / final dimensions / size stats, one-click download.

## 边界 | Limits

- 目标 ≥ 原图大小：直接提示无需压缩，原图原样输出（不做无意义重编码）。
- 目标过小（如 1KB）：质量=1 且缩小 3 轮仍超标时**明确报错**
  （"无法压缩到目标大小……请调大目标大小后重试"），不会无限循环。
- 全程本地 Canvas 处理，不上传。
- GIF 动图压缩后只保留第一帧（Canvas 限制）。
- 浏览器不支持的导出格式会报错（如旧浏览器导出 WebP）。

## 数据流向 | Data flow

文件 → 内存 Canvas（二分探测编码 N 次）→ 目标 Blob → 下载；不经过网络。
