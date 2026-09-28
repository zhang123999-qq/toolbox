# 屏幕截取 screen-capture（#463）

## 用途 | Purpose

- 点击「开始截取」，浏览器弹出屏幕共享选择器（整个屏幕 / 应用窗口 / 浏览器标签页），选择后实时预览。
- 点击「截取当前帧」，把 video 当前帧绘制到 Canvas 并导出为 PNG，**自动下载**，随后**立即停止所有共享轨道**释放屏幕共享。
- Capture the current screen frame: pick a screen/window/tab via the browser picker, preview it, capture the frame as PNG (auto-downloaded), then immediately release screen sharing.

## 权限说明 | Permissions

- 首次点击「开始截取」时，浏览器会弹出系统级授权框，**由用户亲自选择**要共享的屏幕、窗口或标签页；工具无法代选、也看不到未授权的内容。
- 用户在授权框点「取消」→ 友好提示「已取消屏幕共享授权」，不报错、不卡死。
- 截取完成后自动调用 `track.stop()` 释放全部轨道，任务栏/浏览器的「正在共享屏幕」指示灯即刻熄灭；组件卸载或点「停止共享」同样会释放。

## 浏览器支持 | Browser support

- 需要 `navigator.mediaDevices.getDisplayMedia`，即 **Chrome / Edge 等 Chromium 内核浏览器**（桌面版）。
- 不支持的浏览器打开工具时直接提示「当前浏览器不支持屏幕捕获，请使用 Chrome/Edge 等 Chromium 内核浏览器」，不会走到授权流程。
- 建议使用 HTTPS 或 localhost 访问（部分浏览器在非安全上下文中禁用屏幕共享）。

## 隐私 | Privacy

- **全程本地**：视频流只在当前标签页内存中预览一帧，Canvas 导出 PNG 后直接触发浏览器下载，**不上传、不经过任何网络请求**。
- 共享的画面不会被记录、缓存或发送到任何地方；释放轨道后浏览器即停止采集。

## 边界 | Limits

- 截取要求视频流 `readyState ≥ 2`（已有当前帧数据），否则提示「等待视频流就绪」。
- 输出固定为 PNG（无损），文件名形如 `screen-capture-<时间戳>.png`。
- 截取的是点击瞬间的**单帧**，不是录像；如需录制请使用「屏幕录制」（screen-record #464）。
- 多显示器环境下，具体截取哪个屏幕由浏览器授权框中的用户选择决定。

## 数据流向 | Data flow

屏幕共享流 → `<video>` 预览 → Canvas 单帧 → PNG Blob → 浏览器下载；随后停止全部轨道。不经过网络。
