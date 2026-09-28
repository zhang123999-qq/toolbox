# 屏幕录制 screen-record（#464）

## 用途 | Purpose

- 录制屏幕并保存为 webm 视频：点击「开始录制」→ 浏览器弹出屏幕共享选择器 → 录制 → 点击「停止」→ 下载 `.webm` 文件。
- Record your screen as a webm video: click Start → pick a screen/window in the browser picker → record → Stop → download the `.webm` file.

## 输入 | Input

- 无文件输入：视频源来自 `navigator.mediaDevices.getDisplayMedia` 的屏幕采集流。
- No file input: the video source is the screen-capture stream from `navigator.mediaDevices.getDisplayMedia`.

## 选项 | Options

| 选项           | 说明                                 | Option       | Description                                    |
| -------------- | ------------------------------------ | ------------ | ---------------------------------------------- |
| 视频编码 codec | 自动 / VP9 / VP8（偏好，见编码说明） | Video codec  | auto / VP9 / VP8 (preference, see below)       |
| 系统音频 audio | 开 / 关：是否同时录制系统播放的声音  | System audio | on / off: capture system audio alongside video |

## 编码说明 | Codec notes

- 启动录制时按候选列表 `video/webm;codecs=vp9` → `video/webm;codecs=vp8` → `video/webm` 用 `MediaRecorder.isTypeSupported` 逐个探测，取第一个可用项。
- 选择「VP9」/「VP8」偏好时，含该编码的候选项优先探测，其余仍作为兜底依次探测；若浏览器三个候选项都不支持，会报错并自动停止已采集的轨道。
- 输出容器固定为 `video/webm`，文件名为 `screen-record-YYYYMMDD-HHMMSS.webm`。
- At start, candidates `video/webm;codecs=vp9` → `video/webm;codecs=vp8` → `video/webm` are probed in order via `MediaRecorder.isTypeSupported`; the first supported one wins. With a VP9/VP8 preference, matching candidates are probed first and the rest still serve as fallback. If none is supported, an error is shown and acquired tracks are stopped. The container is always `video/webm`; file name is `screen-record-YYYYMMDD-HHMMSS.webm`.

## 浏览器支持 | Browser support

- 需要同时支持 `MediaRecorder` 与 `getDisplayMedia` 的浏览器（Chrome / Edge / Firefox 近年版本；Safari 的 MediaRecorder 支持有限）。
- 屏幕录制要求安全上下文（HTTPS 或 localhost），否则浏览器会拒绝授权。
- Requires a browser with both `MediaRecorder` and `getDisplayMedia` (recent Chrome / Edge / Firefox; Safari's MediaRecorder support is limited). Screen capture requires a secure context (HTTPS or localhost).

## 边界 | Limits

- 全程本地处理：采集、编码、组装 Blob、下载都在本机完成，不上传。
- 用户在浏览器共享选择器中点「取消」（NotAllowedError）会显示友好提示，不抛技术性错误。
- 录制中用户在浏览器原生 UI 点「停止共享」，同样触发统一收尾（停计时器、停 recorder、停轨道）。
- 停止录制 / 组件卸载时：仅当 recorder 处于 `recording` 状态才调用 `stop()`，并停止所有采集轨道、清除计时器，避免资源泄漏。
- 录制时长取决于内存：超长录制会把全部数据块缓存在内存中再组装，不适合数小时连续录制。
- Entirely local: capture, encode, Blob assembly and download all happen on-device, nothing is uploaded.
- Cancelling the browser share picker (NotAllowedError) shows a friendly hint instead of a technical error.
- Clicking "Stop sharing" in the browser's native UI during recording triggers the same teardown (timer, recorder and tracks).
- On stop/unmount: `recorder.stop()` is only called when state is `recording`; all capture tracks are stopped and the timer cleared to avoid leaks.
- Length is memory-bound: all chunks are buffered in memory before assembly, so multi-hour recordings are not suitable.

## 数据流向 | Data flow

屏幕流 → MediaRecorder 数据块（内存）→ Blob('video/webm') → 下载；不经过网络。
