/**
 * video-thumbnail —— 视频缩略图的纯函数层
 *
 * 时间点解析 / 校验、缩略图网格布局、文件名生成全部在此实现，
 * 不触碰任何浏览器 API；真正的逐帧截取（video + canvas）在 Tool.tsx。
 */

/** 单次最多截取的时间点数量 */
export const MAX_TIMESTAMPS = 12

/** 网格最大列数 */
export const MAX_COLUMNS = 6

/** 秒 → "1.23 秒" */
export function formatSeconds(sec: number): string {
  return `${sec.toFixed(2)} 秒`
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

/**
 * 解析时间点文本：逗号（中英文）、顿号、空格、换行分隔均可。
 * 空输入或含非数字 token 时抛中文错。
 */
export function parseTimestamps(text: string): number[] {
  const tokens = text
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter((t) => t !== '')
  if (tokens.length === 0) throw new Error('请输入至少一个时间点')
  return tokens.map((token) => {
    const n = Number(token)
    if (!Number.isFinite(n)) throw new Error(`时间点非法：“${token}”不是数字`)
    return n
  })
}

/**
 * 校验时间点：数量 1～MAX_TIMESTAMPS，每个必须在 [0, durationSec] 内。
 * durationSec 非法（视频时长读不到）时直接抛中文错。
 */
export function validateTimestamps(timestamps: readonly number[], durationSec: number): void {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('视频时长非法：无法读取视频时长，换个视频文件试试')
  }
  if (timestamps.length === 0) throw new Error('请输入至少一个时间点')
  if (timestamps.length > MAX_TIMESTAMPS) {
    throw new Error(`时间点过多：一次最多截取 ${MAX_TIMESTAMPS} 张`)
  }
  timestamps.forEach((t, i) => {
    if (!Number.isFinite(t)) throw new Error(`第 ${i + 1} 个时间点不是有效数字`)
    if (t < 0 || t > durationSec) {
      throw new Error(
        `第 ${i + 1} 个时间点（${t} 秒）超出视频时长（${formatSeconds(durationSec)}）`,
      )
    }
  })
}

/**
 * 缩略图网格布局：count 张按 columns 列排，
 * 返回 { rows, cols }（最后一行不满时 cols 按实际张数收缩）。
 */
export function gridDims(count: number, columns: number): { rows: number; cols: number } {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`缩略图数量非法：${String(count)}（应为正整数）`)
  }
  if (!Number.isInteger(columns) || columns < 1 || columns > MAX_COLUMNS) {
    throw new Error(`列数非法：${String(columns)}（应为 1～${MAX_COLUMNS} 的整数）`)
  }
  return { rows: Math.ceil(count / columns), cols: Math.min(columns, count) }
}

/** 单张缩略图文件名：原名（去扩展名）+ -thumb-序号.png */
export function thumbnailFileName(inputName: string, index: number): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}-thumb-${index + 1}.png`
}
