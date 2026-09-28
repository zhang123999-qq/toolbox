/**
 * waveform —— 波形显示的纯函数层（峰值抽取 + 缩放视图 + 声道混合）
 *
 * 约定：
 * - 采样值为 Float32Array（取值 [-1, 1]）；
 * - 本文件不触碰任何浏览器 API（AudioContext / canvas 都在 Tool.tsx），
 *   可在 node 下被 vitest 完整测试。
 */

/** 一个像素列的峰值：该列内采样的最小/最大值 */
export interface Peak {
  readonly min: number
  readonly max: number
}

/** 缩放视图：采样点区间 [start, end) */
export interface ZoomView {
  readonly start: number
  readonly end: number
}

/** 峰值抽取的列数上限（防误填卡死） */
export const MAX_PEAK_WIDTH = 100000
/** 缩放倍数上限 */
export const MAX_ZOOM_FACTOR = 1024

/**
 * 峰值抽取（纯函数）：把采样序列压缩成 width 列 {min, max}。
 * 空采样返回全 0 列；不修改输入。
 */
export function computePeaks(samples: Float32Array, width: number): Peak[] {
  if (!Number.isInteger(width) || width < 1 || width > MAX_PEAK_WIDTH) {
    throw new Error(`列数非法：${String(width)}（应为 1～${MAX_PEAK_WIDTH} 的整数）`)
  }
  const peaks: Peak[] = []
  if (samples.length === 0) {
    for (let i = 0; i < width; i++) peaks.push({ min: 0, max: 0 })
    return peaks
  }
  const per = samples.length / width
  for (let b = 0; b < width; b++) {
    const from = Math.floor(b * per)
    const to = Math.max(from + 1, Math.floor((b + 1) * per))
    let mn = Infinity
    let mx = -Infinity
    for (let i = from; i < to; i++) {
      const v = samples[i]!
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    peaks.push({ min: mn, max: mx })
  }
  return peaks
}

/**
 * 缩放视图（纯函数）：以 centerSample 为中心、按 zoomFactor 放大，
 * 返回钳制在 [0, totalSamples) 内的 [start, end)。
 */
export function zoomView(totalSamples: number, centerSample: number, zoomFactor: number): ZoomView {
  if (!Number.isInteger(totalSamples) || totalSamples < 1) {
    throw new Error(`采样点数非法：${String(totalSamples)}（应为正整数）`)
  }
  if (!Number.isFinite(centerSample)) {
    throw new Error(`中心点非法：${String(centerSample)}（必须为有限数）`)
  }
  if (!Number.isFinite(zoomFactor) || zoomFactor < 1 || zoomFactor > MAX_ZOOM_FACTOR) {
    throw new Error(`缩放倍数非法：${String(zoomFactor)}（应为 1～${MAX_ZOOM_FACTOR} 的有限数）`)
  }
  const center = Math.min(Math.max(Math.round(centerSample), 0), totalSamples - 1)
  const half = Math.max(1, Math.round(totalSamples / zoomFactor / 2))
  const start = Math.max(0, Math.min(center - half, totalSamples - half * 2))
  const end = Math.min(totalSamples, start + half * 2)
  return { start, end: Math.max(start + 1, end) }
}

/** 多声道混单声道（平均法，纯函数） */
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) throw new Error('声道数据为空')
  const len = channels[0]!.length
  for (const ch of channels) {
    if (ch.length !== len) throw new Error('声道长度不一致：各声道采样点数必须相同')
  }
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    let s = 0
    for (const ch of channels) s += ch[i]!
    out[i] = s / channels.length
  }
  return out
}

/** 采样点数 → 秒 */
export function samplesToSeconds(samples: number, sampleRate: number): number {
  if (!Number.isFinite(samples) || samples < 0) {
    throw new Error(`采样点数非法：${String(samples)}（不能为负数）`)
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(`采样率非法：${String(sampleRate)}（必须为正数）`)
  }
  return samples / sampleRate
}

/** 秒 → "MM:SS.mmm"（如 01:05.234） */
export function formatTimeSec(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) {
    throw new Error(`时间非法：${String(sec)}（不能为负数）`)
  }
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`
}

/** 缩放视图的中文时间范围，如 "00:00.750 – 00:02.250" */
export function formatViewRange(view: ZoomView, sampleRate: number): string {
  return `${formatTimeSec(samplesToSeconds(view.start, sampleRate))} – ${formatTimeSec(
    samplesToSeconds(view.end, sampleRate),
  )}`
}
