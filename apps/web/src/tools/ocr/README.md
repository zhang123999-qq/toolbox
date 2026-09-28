# OCR 图片文字识别 ocr（#446）

## 用途 | Purpose

- 上传图片，用 tesseract.js（WASM）在浏览器本地识别图片中的简体中文 / 英文文字，实时显示识别进度，可随时取消，识别结果可一键复制。
- Upload an image and recognize Simplified Chinese / English text locally in the browser with tesseract.js (WASM): live progress, cancellable, one-click copy of the result.

## 输入 | Input

- 图片文件：PNG / JPEG / WebP / GIF / BMP / AVIF，单文件上限 50MB。上传后自动开始识别。
- Image file: PNG / JPEG / WebP / GIF / BMP / AVIF, max 50MB per file. Recognition starts automatically after upload.

## 选项 | Options

| 选项            | 说明             | Option | Description                  |
| --------------- | ---------------- | ------ | ---------------------------- |
| 简体中文 chiSim | 复选框，默认选中 | chiSim | Checkbox, checked by default |
| 英文 eng        | 复选框，默认选中 | eng    | Checkbox, checked by default |

至少选择一种语言，否则会报错。

## 输出 | Output

- 识别结果文本（只读文本框）+ 一键复制按钮；复制失败时提示手动选择文本复制。
- Recognized text (read-only textarea) + one-click copy button; on copy failure, a hint asks you to select the text manually.

## 边界 / 隐私 | Limits & Privacy

- **tesseract.js 首次使用时从 CDN 下载识别引擎（WASM）与语言包（约几十 MB），之后浏览器会缓存；这不是完全离线工具。** 页面顶部有显著的隐私说明。
- **图片本身始终只在本地浏览器中处理，不会上传到任何服务器。**
- 大图在识别前会等比缩放到最大边 2000px，以提升速度、降低内存占用。
- 同一时间只允许一个识别任务：新上传会自动终止旧任务；识别过程中可随时取消；组件卸载时也会终止 worker。
- The recognition engine (WASM) and language packs are downloaded from a CDN on first use (tens of MB) and then cached — **this tool is not fully offline**. A prominent privacy notice is shown at the top of the page.
- **Your image is always processed locally in the browser and never uploaded to any server.**
- Large images are downscaled (longest side ≤ 2000px) before recognition for speed and memory.
- Only one recognition job runs at a time: a new upload terminates the previous job; you can cancel mid-way; the worker is terminated on unmount.

## 数据流向 | Data flow

文件 → 内存 Canvas（必要时缩放）→ 本地 tesseract.js worker 识别 → 文本展示/复制；识别引擎与语言包来自 CDN，图片不经过网络。
