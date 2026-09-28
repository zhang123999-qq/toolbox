# 相机拍照 camera-snapshot（#465）

## 用途 | Purpose

- 调用设备摄像头拍照：点击「打开相机」经 `getUserMedia` 获取视频流并实时预览，点击「拍照」把当前帧截取到 Canvas，一键下载 PNG。
- Take a photo with your device camera: open the camera via `getUserMedia`, preview the live stream, capture the current frame to a canvas, and download it as PNG.

## 输入 | Input

- 设备摄像头视频流（`getUserMedia({ video: { facingMode } })`），无文件输入。
- Camera video stream (`getUserMedia({ video: { facingMode } })`); no file input.

## 选项 | Options

| 选项            | 说明                                      | Option | Description                                  |
| --------------- | ----------------------------------------- | ------ | -------------------------------------------- |
| 摄像头 facing   | 前置 user / 后置 environment              | Facing | user (front) / environment (rear)            |
| 镜像预览 mirror | 开 on / 关 off（CSS scaleX(-1) 翻转预览） | Mirror | on / off (flips preview with CSS scaleX(-1)) |

- 相机已打开时切换选项会自动重开视频流（先停止旧流全部 track 再请求新流）。

## 输出 | Output

- 实时预览、拍摄结果预览，一键下载 PNG（文件名形如 `snapshot-20260928-140905.png`）。
- Live preview, snapshot preview, one-click PNG download (e.g. `snapshot-20260928-140905.png`).

## 权限说明 | Permissions

- 首次点击「打开相机」时浏览器会弹出摄像头授权请求；拒绝后页面给出友好提示，需在地址栏旁重新允许。
- 仅请求视频（`audio: false`），不录音。
- The browser asks for camera permission on first open; if denied, the page shows a friendly hint. Video only (`audio: false`), no audio recording.

## 隐私 | Privacy

- 视频流只在本地 `<video>` 预览、拍照只在本地 Canvas 完成，全程不上传任何数据、不调用网络接口。
- The stream is previewed locally and snapshots are rendered on a local canvas only; nothing is uploaded and no network API is called.

## 边界 | Limits

- 浏览器不支持 `MediaDevices.getUserMedia`（如非安全上下文、过旧浏览器）→ 明确错误提示。
- 拒绝授权（NotAllowedError）→ 提示去浏览器设置中允许；无摄像头（NotFoundError）→ 提示检查设备；不支持后置（OverconstrainedError）→ 提示切换前置。
- 拍照时视频未就绪（`readyState < 2`）→ 提示稍候再拍，不截取黑帧。
- 关闭相机或切换摄像头时立即停止旧流全部 track；组件卸载时同样释放，避免摄像头指示灯常亮。
- 关闭页面/切换标签页后需重新授权打开（浏览器安全策略）。

## 数据流向 | Data flow

摄像头 → 本地 video 预览 → 本地 Canvas → PNG Blob → 下载；不经过网络。
