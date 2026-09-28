/**
 * video-frame —— 视频指定时间点抓帧的纯函数层
 *
 * 约定：
 * - 时间校验、时间解析、文件名拼装、导出尺寸计算都是纯函数；
 * - 浏览器 API（video 元素、canvas、URL.createObjectURL）只在 Tool.tsx，
 *   本文件可在 node 下被 vitest 完整测试。
 */

/** 导出图片最大边长（像素），超限等比缩放 */
export const MAX_EXPORT_DIM = 1920
/** 解析时间输入的合法上限（秒） */
export const MAX_TIME_INPUT = 24 * 3600

/** 抓帧时间校验：合法返回原值，非法抛中文错 */
export function validateTime(time: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('视频时长无效，请先加载视频')
  }
  if (!Number.isFinite(time) || time < 0) {
    throw new Error(`时间非法：${String(time)}（应为 0～${formatTime(duration)} 的秒数）`)
  }
  if (time > duration) {
    throw new Error(`时间 ${formatTime(time)} 超过视频时长 ${formatTime(duration)}`)
  }
  return time
}

/** 时间钳制到 [0, duration - 1ms]，供滑杆使用；duration 无效返回 0 */
export function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  if (!Number.isFinite(time) || time < 0) return 0
  return Math.min(time, Math.max(0, duration - 0.001))
}

/** 秒 → mm:ss.mmm（分可超过 59） */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`秒数非法：${String(seconds)}`)
  }
  const totalMs = Math.round(seconds * 1000)
  const ms = totalMs % 1000
  const totalSec = Math.floor(totalMs / 1000)
  const s = totalSec % 60
  const m = Math.floor(totalSec / 60)
  const pad = (n: number, len: number): string => String(n).padStart(len, '0')
  return `${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`
}

/**
 * 解析时间输入：支持纯秒（"90.5"）或 mm:ss[.mmm]（"1:30.5"），
 * 首尾空白自动忽略；非法抛中文错。
 */
export function parseTimeInput(raw: string): number {
  const t = raw.trim()
  if (t === '') throw new Error('请输入时间（秒或 分:秒）')
  const mmss = /^(\d+):([0-5]?\d(?:\.\d{1,3})?)$/
  const m = mmss.exec(t)
  if (m) {
    const seconds = Number(m[1]) * 60 + Number(m[2])
    if (!Number.isFinite(seconds) || seconds > MAX_TIME_INPUT) {
      throw new Error(`时间非法：${t}`)
    }
    return seconds
  }
  const seconds = Number(t)
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_TIME_INPUT) {
    throw new Error(`时间非法：${t}（应为 0～${MAX_TIME_INPUT} 的秒数或 分:秒）`)
  }
  return seconds
}

/** 文件名安全字符：保留字母、数字、中文、下划线、连字符、点，其余转下划线 */
function sanitizeName(name: string): string {
  return name.replace(/[^\p{L}\p{N}_.~-]/gu, '_').slice(0, 80) || 'video'
}

/** 抓帧导出文件名：`原名_frame_01-30-500.png`（时间用 - 连接） */
export function buildFilename(originalName: string, timeSec: number): string {
  if (!Number.isFinite(timeSec) || timeSec < 0) {
    throw new Error(`秒数非法：${String(timeSec)}`)
  }
  const dot = originalName.lastIndexOf('.')
  const base = sanitizeName(dot > 0 ? originalName.slice(0, dot) : originalName)
  const stamp = formatTime(timeSec).replace(/[:.]/g, '-')
  return `${base}_frame_${stamp}.png`
}

/** 导出尺寸 */
export interface ExportSize {
  readonly width: number
  readonly height: number
}

/**
 * 按最大边长等比缩放：未超限原样返回；超限按长边缩到 maxDim；
 * 非法输入抛中文错。
 */
export function fitSize(videoW: number, videoH: number, maxDim = MAX_EXPORT_DIM): ExportSize {
  if (!Number.isInteger(maxDim) || maxDim < 1) {
    throw new Error(`最大边长非法：${String(maxDim)}`)
  }
  if (!Number.isFinite(videoW) || !Number.isFinite(videoH) || videoW <= 0 || videoH <= 0) {
    throw new Error(`视频尺寸无效：${String(videoW)}×${String(videoH)}`)
  }
  const longEdge = Math.max(videoW, videoH)
  if (longEdge <= maxDim) return { width: Math.round(videoW), height: Math.round(videoH) }
  const scale = maxDim / longEdge
  return {
    width: Math.max(1, Math.round(videoW * scale)),
    height: Math.max(1, Math.round(videoH * scale)),
  }
}

/** 滑杆值（0～1000）↔ 秒的换算 */
export function sliderToSeconds(value: number, duration: number): number {
  if (!Number.isFinite(value)) throw new Error(`滑杆值非法：${String(value)}`)
  return (Math.min(1000, Math.max(0, value)) / 1000) * duration
}

export function secondsToSlider(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('时长无效')
  }
  return Math.min(1000, Math.max(0, Math.round((seconds / duration) * 1000)))
}
