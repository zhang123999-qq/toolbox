# GIF 分解 gif-split（#442）

## 用途 | Purpose

- 上传 GIF 文件，用 gifuct-js（纯 JS，无 WASM）解析出每一帧，逐帧预览，每帧可单独下载为 PNG。
- Upload a GIF, parse every frame with gifuct-js (pure JS, no WASM), preview frame by frame, download each frame as PNG.
- 「全部下载」逐个触发每帧下载（不引入 jszip 等打包依赖，浏览器会逐个弹出保存）。
- "Download all" triggers each frame download one by one (no zip dependency; the browser saves them individually).

## 输入 | Input

- GIF 文件（.gif），单文件上限 50MB。
- GIF file (.gif), max 50MB per file.

## 选项 | Options

- 无。本工具无选项。
- None. This tool has no options.

## 输出 | Output

- 帧列表：每帧预览图、序号/总数（如"第 1 / 12 帧"）、尺寸（宽×高）、延迟（毫秒，delay 单位 1/100 秒 ×10 换算）。
- 每帧独立的"下载本帧"按钮，文件名为 `{原名}-frame-{序号}.png`（序号按总帧数位数补零，如 photo-frame-01.png）。
- Frame list: per-frame preview, index/total, dimensions, delay in ms (gifuct-js delay is in 1/100s, ×10).
- Per-frame download button; file names like `photo-frame-01.png` (zero-padded by total frame count).

## 边界 | Limits

- 全程本地处理，不上传。
- 单文件上限 50MB；帧数上限 200 帧（超限报错"帧数过多"）；GIF 逻辑屏宽/高上限 4096px（超限报错）。
- decompressFrames 对超大 GIF 可能占用大量内存，以上帧数/尺寸上限即为兜底；接近上限的 GIF 解析会比较慢，请耐心等待"解析中…"。
- 「全部下载」是逐个触发浏览器下载，不是打包为 ZIP；浏览器可能拦截连续多次下载，工具在每帧之间留了短暂间隔，如仍被拦截请允许该站点的多次下载。
- 帧预览为各帧 patch 的直接渲染（gifuct-js 原始帧数据），不等同于播放器合成后的完整画面。

## 数据流向 | Data flow

文件 → ArrayBuffer → gifuct-js 解析（parseGIF → decompressFrames）→ 帧 patch 绘制到 canvas → PNG dataURL 预览 → 下载；不经过网络。

注：规格文档曾将本工具可行性标为 B，经核实 gifuct-js 为纯 JS 实现（无 WASM），按 #421 先例诚实标注为 A。
