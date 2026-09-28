/**
 * screen-recorder —— 屏幕录制的纯函数层
 *
 * 约定：getDisplayMedia / MediaRecorder 只出现在 Tool.tsx，
 * 本文件只做 MIME 选择 / 时长格式化 / 文件名 / 能力判断，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 录制能力与 MIME 选择
// ---------------------------------------------------------------------------

/** 候选的录制 MIME，按优先级排列 */
export const CANDIDATE_MIMES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
] as const

/**
 * 从候选列表里挑第一个被浏览器支持的 MIME。
 * isSupported 由调用方传入（通常是 MediaRecorder.isTypeSupported）。
 * 都不支持时返回空字符串，调用方改用浏览器默认。
 */
export function pickMimeType(
  candidates: readonly string[],
  isSupported: (mime: string) => boolean,
): string {
  for (const mime of candidates) {
    if (isSupported(mime)) return mime
  }
  return ''
}

/** 根据 MIME 推导文件扩展名：mp4 相关 → mp4，否则 webm */
export function extForMime(mime: string): string {
  return mime.includes('mp4') ? 'mp4' : 'webm'
}

// ---------------------------------------------------------------------------
// 格式化
// ---------------------------------------------------------------------------

/** 毫秒 → "mm:ss"（录制计时用，超过 1 小时显示 h:mm:ss） */
export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) throw new Error(`时长非法：${String(ms)}`)
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** 字节数 → 人类可读（B / KiB / MiB / GiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
}

// ---------------------------------------------------------------------------
// 文件名
// ---------------------------------------------------------------------------

/**
 * 录制结果文件名：屏幕录制-YYYYMMDD-HHmmss.<ext>。
 * now 可注入，便于单测；非法日期抛中文错。
 */
export function recorderFileName(ext: string, now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('日期非法')
  const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext : 'webm'
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `屏幕录制-${stamp}.${safeExt}`
}

// ---------------------------------------------------------------------------
// 错误文案
// ---------------------------------------------------------------------------

/** getDisplayMedia 失败时的中文提示：用户取消 / 权限拒绝 / 其他 */
export function captureErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError') return '已取消屏幕共享：未授予录制权限'
  return err instanceof Error ? `无法开始录制：${err.message}` : '无法开始录制，请重试'
}
