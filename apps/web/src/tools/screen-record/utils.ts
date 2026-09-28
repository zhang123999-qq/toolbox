/**
 * screen-record 纯函数：mimeType 探测、时长格式化、错误映射、文件名构造。
 * 不触碰 DOM / MediaRecorder / navigator，可 100% 单测。
 */

/** mimeType 候选列表（auto 偏好时按此顺序探测） */
export const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const

export type CodecPreference = 'auto' | 'vp9' | 'vp8'

/**
 * 按候选列表逐个用 isSupported 探测，返回第一个受支持的 mimeType；无可用返回 null。
 * preference 指定编码偏好（vp9/vp8）时，把含该编码的候选项排到前面优先探测，
 * 其余候选项仍作为兜底依次探测。
 */
export function pickMimeType(
  isSupported: (mimeType: string) => boolean,
  candidates: readonly string[],
  preference: CodecPreference,
): string | null {
  const ordered: readonly string[] =
    preference === 'auto'
      ? candidates
      : [
          ...candidates.filter((c) => c.includes(preference)),
          ...candidates.filter((c) => !c.includes(preference)),
        ]
  for (const mime of ordered) {
    if (isSupported(mime)) return mime
  }
  return null
}

/** 毫秒 → "mm:ss"；负数按 0 处理；超过 59 分钟继续累加分钟数 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/**
 * 录制相关错误映射为中文友好提示（对标 screen-capture 的映射口径）。
 * 未知错误透传原始消息；非 Error 值走 String(err)。
 */
export function mapRecordError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
      return '已拒绝屏幕共享权限：请在浏览器的共享选择器中允许后重试'
    case 'NotFoundError':
      return '未找到可共享的屏幕或音频设备'
    case 'NotReadableError':
      return '屏幕/音频设备被占用或读取失败，请关闭占用程序后重试'
    case 'OverconstrainedError':
      return '当前设备不支持请求的录制参数'
    case 'SecurityError':
      return '当前页面不是安全上下文：屏幕录制需要 HTTPS 或 localhost'
    case 'AbortError':
      return '录制被意外中断，请重试'
    default:
      return err instanceof Error ? err.message : String(err)
  }
}

/** 构造输出文件名：screen-record-YYYYMMDD-HHMMSS.webm（时间戳由参数注入，便于单测） */
export function buildOutputFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `screen-record-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.webm`
  )
}
