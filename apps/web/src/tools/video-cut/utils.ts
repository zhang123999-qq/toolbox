/**
 * video-cut —— 视频裁剪的纯函数层
 *
 * 约定：ffmpeg 调用只出现在 Tool.tsx（动态 import('@ffmpeg/ffmpeg')），
 * 本文件只做时间解析 / 格式化 / 校验 / 参数拼装 / 文件名，可在 node 下被 vitest 完整测试。
 */

// ---------------------------------------------------------------------------
// 时间解析与格式化
// ---------------------------------------------------------------------------

/**
 * 解析用户输入的时间为秒数。
 * 接受纯秒数（"83.5"）、"分:秒"（"1:23.5"）、"时:分:秒"（"1:02:03.45"）。
 * 空输入 / 格式非法 / 负数 / 非有限数一律抛中文错。
 */
export function parseTimeInput(raw: string): number {
  const text = raw.trim()
  if (text === '') throw new Error('时间不能为空')
  const parts = text.split(':')
  if (parts.length > 3) throw new Error(`时间格式非法：${raw}（支持 秒 / 分:秒 / 时:分:秒）`)
  let seconds = 0
  let multiplier = 1
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!.trim()
    if (part === '') throw new Error(`时间格式非法：${raw}（存在空的分量）`)
    const value = Number(part)
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`时间格式非法：${raw}（分量必须为非负数字）`)
    }
    if (multiplier > 1 && !Number.isInteger(value)) {
      throw new Error(`时间格式非法：${raw}（分、时必须为整数）`)
    }
    seconds += value * multiplier
    multiplier *= 60
  }
  return seconds
}

/** 秒数 → ffmpeg 可用的时间戳 "HH:MM:SS.mmm"（非负有限数） */
export function formatTimeForFfmpeg(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`时间非法：${String(sec)}`)
  const ms = Math.round(sec * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const rem = ms % 1000
  const pad = (n: number, width: number) => String(n).padStart(width, '0')
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(rem, 3)}`
}

/** 秒数 → 人类可读 "1.23 秒" */
export function formatSeconds(sec: number): string {
  return `${sec.toFixed(2)} 秒`
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
// 裁剪范围校验
// ---------------------------------------------------------------------------

/** 起止时间合法性校验；duration 为视频总时长（秒），未知时传 null 则跳过上限检查 */
export function validateCutRange(startSec: number, endSec: number, duration: number | null): void {
  if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
    throw new Error('起止时间必须是有效数字')
  }
  if (startSec < 0 || endSec < 0) throw new Error('起止时间不能为负数')
  if (startSec >= endSec) throw new Error('起始时间必须小于结束时间')
  if (duration !== null && endSec > duration) {
    throw new Error(
      `结束时间（${formatSeconds(endSec)}）超出视频时长（${formatSeconds(duration)}）`,
    )
  }
}

// ---------------------------------------------------------------------------
// ffmpeg 参数拼装（纯函数，实际调用在 Tool.tsx）
// ---------------------------------------------------------------------------

/**
 * 拼装裁剪命令参数。
 * reencode=true：重编码为 H.264 + AAC，兼容性最好；
 * reencode=false：流拷贝，速度快但裁剪点只能落在关键帧上。
 */
export function buildCutArgs(
  startTimestamp: string,
  endTimestamp: string,
  inputName: string,
  outputName: string,
  reencode: boolean,
): string[] {
  const base = ['-ss', startTimestamp, '-to', endTimestamp, '-i', inputName]
  if (reencode) {
    return [...base, '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', outputName]
  }
  return [...base, '-c', 'copy', outputName]
}

/** 裁剪结果的文件名：原名（去扩展名）+ -cut.mp4 */
export function cutFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}-cut.mp4`
}
