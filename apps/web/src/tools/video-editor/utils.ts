/**
 * video-editor —— 视频剪辑的纯函数层
 *
 * 约定：
 * - 片段用 Segment 表示（时间单位：秒，可为小数）；片段列表不可变更新；
 * - 时间输入支持 "83.5"（秒）与 "01:23.5"（分:秒）两种写法；
 * - ffmpeg 调用策略：先按片段逐段裁剪（-ss/-to + 流拷贝），再用 concat demuxer 拼接；
 *   参数拼装是纯函数，真正的 ffmpeg.wasm 调用在 Tool.tsx（动态 import），
 *   本文件不触碰浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 一个剪辑片段：起止时间（秒） */
export interface Segment {
  readonly id: string
  readonly start: number
  readonly end: number
}

/** 片段序号（模块级，保证同一会话内 id 唯一） */
let segmentSeq = 0

/** 生成片段 id：seg-1、seg-2…… */
export function makeSegmentId(): string {
  segmentSeq += 1
  return `seg-${segmentSeq}`
}

/** 重置序号（仅测试用，保证 id 可预测） */
export function resetSegmentSeq(): void {
  segmentSeq = 0
}

// ---------------------------------------------------------------------------
// 时间解析与格式化
// ---------------------------------------------------------------------------

/**
 * 解析时间输入："83.5" → 83.5；"01:23.5" → 83.5；"1:02:03" → 3723。
 * 非法抛中文错。
 */
export function parseTimeInput(raw: string): number {
  const text = raw.trim()
  if (text === '') throw new Error('时间不能为空')
  if (text.includes(':')) {
    const parts = text.split(':')
    if (parts.length > 3) throw new Error(`时间格式非法："${raw}"（应为"秒"或"分:秒"或"时:分:秒"）`)
    const nums = parts.map((p) => Number(p))
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      throw new Error(`时间格式非法："${raw}"（各部分应为非负数）`)
    }
    if (parts.length === 2 && (nums[1]! >= 60 || !Number.isInteger(nums[0]!))) {
      throw new Error(`时间格式非法："${raw}"（分钟应为整数，秒应小于 60）`)
    }
    if (
      parts.length === 3 &&
      (nums[1]! >= 60 ||
        nums[2]! >= 60 ||
        !Number.isInteger(nums[0]!) ||
        !Number.isInteger(nums[1]!))
    ) {
      throw new Error(`时间格式非法："${raw}"（时、分应为整数，分、秒应小于 60）`)
    }
    const [a, b, c] = nums as number[]
    return parts.length === 2 ? a! * 60 + b! : a! * 3600 + b! * 60 + c!
  }
  const n = Number(text)
  if (!Number.isFinite(n) || n < 0) throw new Error(`时间格式非法："${raw}"（应为非负数字）`)
  return n
}

/** 秒 → "01:23.45"（分:秒.百分秒）；非法抛中文错 */
export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`时间非法：${String(sec)}（应为非负数）`)
  const totalHundredths = Math.round(sec * 100)
  const minutes = Math.floor(totalHundredths / 6000)
  const seconds = Math.floor((totalHundredths % 6000) / 100)
  const hundredths = totalHundredths % 100
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`
}

/** 秒 → ffmpeg -ss/-to 可接受的十进制字符串（保留 3 位小数） */
export function formatFfmpegTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`时间非法：${String(sec)}（应为非负数）`)
  return sec.toFixed(3)
}

// ---------------------------------------------------------------------------
// 片段列表管理（不可变更新）
// ---------------------------------------------------------------------------

/** 校验起止时间：有限、非负、start < end */
function assertRangeValid(start: number, end: number): void {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('起止时间必须是有效数字')
  }
  if (start < 0 || end < 0) throw new Error('起止时间不能为负数')
  if (start >= end) throw new Error('起始时间必须小于结束时间')
}

/** 创建片段（不校验视频总时长，总时长校验用 validateSegmentAgainstDuration） */
export function createSegment(start: number, end: number): Segment {
  assertRangeValid(start, end)
  return { id: makeSegmentId(), start, end }
}

/** 追加片段，返回新列表（原列表不变） */
export function addSegment(list: readonly Segment[], start: number, end: number): Segment[] {
  return [...list, createSegment(start, end)]
}

/** 按 id 删除片段；不存在抛中文错 */
export function removeSegment(list: readonly Segment[], id: string): Segment[] {
  const next = list.filter((s) => s.id !== id)
  if (next.length === list.length) throw new Error(`片段不存在：${id}`)
  return next
}

/**
 * 移动片段：delta=-1 上移一位，delta=+1 下移一位。
 * 已在边界时抛中文错；delta 非 ±1 抛中文错。
 */
export function moveSegment(list: readonly Segment[], id: string, delta: -1 | 1): Segment[] {
  if (delta !== -1 && delta !== 1) throw new Error(`移动方向非法：${String(delta)}（应为 -1 或 1）`)
  const idx = list.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error(`片段不存在：${id}`)
  const target = idx + delta
  if (target < 0) throw new Error('已经是第一个片段，无法上移')
  if (target >= list.length) throw new Error('已经是最后一个片段，无法下移')
  const next = [...list]
  const [seg] = next.splice(idx, 1)
  next.splice(target, 0, seg!)
  return next
}

/** 片段总时长（秒）：各片段时长之和 */
export function totalDuration(list: readonly Segment[]): number {
  return list.reduce((sum, s) => sum + (s.end - s.start), 0)
}

/** 校验片段不超出视频总时长；duration 未知（<=0）时跳过上限检查 */
export function validateSegmentAgainstDuration(segment: Segment, duration: number): void {
  if (!Number.isFinite(duration) || duration < 0)
    throw new Error(`视频时长非法：${String(duration)}`)
  if (duration > 0 && segment.end > duration) {
    throw new Error(
      `片段结束时间（${formatClock(segment.end)}）超出视频时长（${formatClock(duration)}）`,
    )
  }
}

// ---------------------------------------------------------------------------
// ffmpeg 参数拼装
// ---------------------------------------------------------------------------

/**
 * 单片段裁剪参数：输入定位（-ss 在 -i 之前，速度快）+ 流拷贝。
 * 注：流拷贝裁剪只能切到关键帧，毫秒级精度需求请改用重编码。
 */
export function buildTrimArgs(input: string, start: number, end: number, output: string): string[] {
  assertRangeValid(start, end)
  if (input === '' || output === '') throw new Error('输入 / 输出文件名不能为空')
  return [
    '-ss',
    formatFfmpegTime(start),
    '-to',
    formatFfmpegTime(end),
    '-i',
    input,
    '-c',
    'copy',
    output,
  ]
}

/** 转义 concat demuxer 列表文件中的单引号 */
export function escapeConcatPath(path: string): string {
  if (path === '') throw new Error('文件路径不能为空')
  return path.replace(/'/g, "'\\''")
}

/** 生成 concat demuxer 列表文件内容 */
export function buildConcatListFile(tempNames: readonly string[]): string {
  if (tempNames.length === 0) throw new Error('没有可拼接的片段文件')
  return tempNames.map((name) => `file '${escapeConcatPath(name)}'`).join('\n') + '\n'
}

/** concat 拼接参数（流拷贝，不重编码） */
export function buildConcatArgs(listFile: string, output: string): string[] {
  if (listFile === '' || output === '') throw new Error('列表文件 / 输出文件名不能为空')
  return ['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', output]
}

/** 拼接结果文件名：原名（去扩展名）+ -edit.mp4 */
export function editorFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}-edit.mp4`
}

/** 片段临时文件名：seg-<序号>.mp4（序号从 0 起，供 ffmpeg 虚拟文件系统使用） */
export function tempSegmentName(index: number): string {
  if (!Number.isInteger(index) || index < 0) throw new Error(`片段序号非法：${String(index)}`)
  return `seg-${index}.mp4`
}
