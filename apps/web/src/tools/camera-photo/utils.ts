/**
 * camera-photo —— 摄像头拍照的纯函数层
 *
 * 约定：getUserMedia / canvas / video 只出现在 Tool.tsx，
 * 本文件只做尺寸计算 / DataURL 解析 / 文件名 / 错误文案，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 尺寸计算
// ---------------------------------------------------------------------------

/** 拍照导出尺寸：等比缩放使最长边不超过 maxSide（像素），宽高非法时抛中文错 */
export function fitPhotoSize(
  videoWidth: number,
  videoHeight: number,
  maxSide: number,
): { width: number; height: number } {
  if (!Number.isFinite(videoWidth) || !Number.isFinite(videoHeight)) {
    throw new Error('视频尺寸非法：宽高必须是有效数字')
  }
  if (videoWidth <= 0 || videoHeight <= 0) throw new Error('视频尺寸非法：宽高必须为正数')
  if (!Number.isFinite(maxSide) || maxSide <= 0) throw new Error('最长边非法：必须为正数')
  const scale = Math.min(1, maxSide / Math.max(videoWidth, videoHeight))
  const width = Math.max(1, Math.round(videoWidth * scale))
  const height = Math.max(1, Math.round(videoHeight * scale))
  return { width, height }
}

// ---------------------------------------------------------------------------
// DataURL 与文件名
// ---------------------------------------------------------------------------

/** 从 dataURL 里解析 MIME（非法 dataURL 抛中文错） */
export function dataUrlMime(dataUrl: string): string {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl)
  if (!match) throw new Error('图片数据非法：不是合法的 dataURL')
  return match[1]!
}

/** 从 dataURL 里取 base64 负载（无逗号分隔时抛中文错） */
export function dataUrlPayload(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  if (idx < 0) throw new Error('图片数据非法：dataURL 缺少负载分隔符')
  return dataUrl.slice(idx + 1)
}

/**
 * 拍照文件名：拍照-YYYYMMDD-HHmmss.png。
 * now 可注入，便于单测；非法日期抛中文错。
 */
export function photoFileName(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('日期非法')
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `拍照-${stamp}.png`
}

// ---------------------------------------------------------------------------
// 错误文案
// ---------------------------------------------------------------------------

/** 打开摄像头失败时的中文提示：权限拒绝 / 无设备 / 其他 */
export function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '摄像头权限被拒绝：请在浏览器地址栏允许本页面使用摄像头后重试'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return '未检测到可用摄像头：请确认设备已连接且未被其他程序占用'
  }
  return err instanceof Error ? `无法打开摄像头：${err.message}` : '无法打开摄像头，请重试'
}
