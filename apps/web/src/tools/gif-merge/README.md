# GIF 合成 gif-merge（#443）

## 用途 | Purpose

- 把多张图片合成为一张 GIF 动图：上传多图作为帧，可上移/下移/删除调整帧顺序，
  设置帧延迟、循环次数与质量后一键合成，预览并下载。
- Merge multiple images into an animated GIF: reorder frames, set frame delay,
  loop count and quality, then render, preview and download.

## 输入 | Input

- 多张图片：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB，最多 100 帧，至少 2 帧才能合成。
- Multiple images: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file,
  up to 100 frames, at least 2 frames required.
- **输出尺寸 = 第一帧的尺寸**：GIF 要求所有帧同尺寸，其余帧按 contain 等比缩放居中绘制
  （黑底填充），不足处留黑边。
- **GIF 动图作为输入时只取第一帧**（Canvas 解码限制，无法保留原动图的全部帧）。

## 选项 | Options

| 选项            | 说明                                                           | Option      | Description                                                                      |
| --------------- | -------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| 帧延迟 delay    | 每帧停留毫秒数，全局统一，20–10000，默认 200                   | Frame delay | ms per frame, global, 20–10000, default 200                                      |
| 循环次数 repeat | 0=无限循环，0–100，默认 0                                      | Loop count  | 0=infinite loop, 0–100, default 0                                                |
| 质量 quality    | gif.js 的像素采样间隔，1–20，**越小越清晰、文件越大**，默认 10 | Quality     | gif.js pixel sampling interval, 1–20, **smaller=sharper but larger**, default 10 |

## 输出 | Output

- 合成进度百分比（可取消）、结果 GIF 预览、尺寸与帧数统计，一键下载 `xxx-merged.gif`。
- Render progress %, cancellable; result preview, size/frame stats, one-click download.

## 边界 | Limits

- 全程本地处理，不上传：图片解码与绘制在主线程 Canvas，GIF 编码在 gif.js 的
  Web Worker（2 个）中并行完成。
- 输出任一边超过 2048px 时拒绝合成（内存安全边界）。
- 合成中可取消；重新合成或卸载页面时会自动中止旧任务，避免 Worker 泄漏。
- 可行性标注说明：规格文档标为 B，但 B 要求 wasm=true；本工具实际用的是
  gif.js 的 Web Worker 而非 WASM，虚假标注 B 会违反目录一致性校验，
  故诚实标注为 C（C 仅要求 api=false），meta.ts 顶部有同样注释。

## 数据流向 | Data flow

图片文件 → 内存 Canvas（统一尺寸）→ gif.js Worker 编码 → Blob → 预览/下载；不经过网络。
