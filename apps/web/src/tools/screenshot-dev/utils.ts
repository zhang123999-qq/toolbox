import type { ScreenshotDevInput, ScreenshotDevOptions } from './schema'

/** getDisplayMedia 视频约束：只要视频轨，不要音频 */
export const DISPLAY_MEDIA_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: { frameRate: { ideal: 2 } },
  audio: false,
}

/** 检测浏览器是否支持 getDisplayMedia */
export function isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  )
}

/**
 * 从视频轨截一帧到 canvas，返回 PNG dataURL。
 * 抽成纯函数便于单测（可传入 mock video / canvas）。
 */
export function frameToPng(video: HTMLVideoElement, canvas: HTMLCanvasElement): string {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) throw new Error('未取到视频帧（videoWidth/videoHeight 为 0）')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 canvas 2D 上下文')
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}

/** 停止 stream 里所有轨道 */
export function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

/**
 * 异步主流程：请求屏幕共享 → 播放 → 截帧 → 停止 → 返回文本结果。
 * 需要用户在浏览器弹窗里选择屏幕 / 窗口 / 标签页并授权。
 */
export async function captureScreen(): Promise<string> {
  if (!isSupported()) {
    throw new Error('当前浏览器不支持 getDisplayMedia，请改用最新版 Chrome / Edge')
  }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_CONSTRAINTS)
  } catch (error) {
    throw new Error(
      '未获得屏幕共享权限：请在浏览器弹窗中选择要截取的屏幕 / 窗口 / 标签页并点「允许」' +
        (error instanceof Error ? `（${error.message}）` : ''),
      { cause: error },
    )
  }
  try {
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    // 等一帧解码
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const canvas = document.createElement('canvas')
    const dataUrl = frameToPng(video, canvas)
    return [
      `已截取 ${video.videoWidth}×${video.videoHeight} 的一帧。`,
      '把下面这串 dataURL 粘到浏览器地址栏即可查看 / 另存为 PNG：',
      '',
      dataUrl,
    ].join('\n')
  } finally {
    stopStream(stream)
  }
}

export async function transform(
  _input: ScreenshotDevInput,
  _options: ScreenshotDevOptions,
): Promise<string> {
  // 本工具不需要文本输入；点「运行」即触发授权弹窗
  return captureScreen()
}
