# 图片哈希 image-hash（#468）

## 用途 | Purpose

- 上传 1 张图片，本地计算三种感知哈希（aHash / dHash / pHash），以 16 位十六进制字符串展示。
- 上传第 2 张图片后，逐种计算两哈希的 Hamming 距离，并换算为相似度百分比，用于判断图片是否相似/重复。
- Compute perceptual hashes (aHash / dHash / pHash) of an image locally, shown as 16-char hex; with a second image, Hamming distance and similarity percentage per algorithm.

## 输入 | Input

- 图片 A（必选）：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。
- 图片 B（可选，用于比对）：同上，同样校验类型与大小。
- Image A (required) and optional image B for comparison; same type/size checks.

## 三种哈希原理 | Algorithms

| 哈希  | 做法                                                                 | 特点                       |
| ----- | -------------------------------------------------------------------- | -------------------------- |
| aHash | 32×32 灰度 → 8×8 网格采样 → 均值阈值 → 64 bits                       | 最快，但判别力最弱         |
| dHash | 32×32 灰度 → 9×8 网格采样 → 水平相邻像素比较 → 64 bits               | 抗等比缩放，强于 aHash     |
| pHash | 32×32 灰度 → 二维 DCT → 取左上 8×8 低频（含 DC）→ 中值阈值 → 64 bits | 抗压缩/水印/轻微编辑，最强 |

- aHash (average hash): fastest but weakest; sensitive to global brightness shifts.
- dHash (difference hash): gradient-based, robust to rescaling.
- pHash (perceptual hash): DCT-based, robust to compression, watermarks and minor edits.

## DCT 说明 | DCT notes

- pHash 使用**纯 JavaScript 实现的二维 DCT-II**（可分离：一维 DCT 先行后列），无 wasm、无第三方库。
- 32×32 朴素 DCT 约数百万次浮点运算，实测毫秒级完成，性能可接受。
- 取左上 8×8 低频系数（含 DC 分量 [0][0]），以 64 个系数的**中值**为阈值二值化（标准做法，README 在此写明）。

## 相似度解读 | Similarity

- Hamming 距离：两 64 位哈希中不同比特的个数，范围 0–64。
- 相似度 = (1 − 距离 / 64) × 100%，保留 1 位小数；距离 0 → 100.0%，距离 64 → 0.0%。
- 经验参考：距离 ≤ 5 通常为几乎相同的图片（含压缩/缩放/轻微水印差异）；距离 10 左右多为相似但不同图；距离越大差异越大。阈值请按场景自行验证。

## 输出 | Output

- 图片 A / B 各自的 aHash、dHash、pHash（16 位 hex）。
- 双图时每种哈希的 Hamming 距离与相似度百分比。

## 边界 | Limits

- 全程本地 Canvas 处理，不上传。
- GIF 动图只取第一帧计算（Canvas 限制）。
- 感知哈希是"相似度"指纹，不是密码学哈希：不同图片可能哈希相同（碰撞），相同图片经大幅裁剪/旋转后距离会显著增大。
- 旋转、镜像、大面积裁剪会明显改变哈希；如需抗旋转请用特征点方案（超出本工具范围）。

## 数据流向 | Data flow

文件 → 内存 Canvas（下采样 32×32、转灰度）→ 纯 JS 哈希计算 → 页面展示；不经过网络。
