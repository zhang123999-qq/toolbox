/**
 * tuner —— 调音器的纯函数层（自相关音高检测 + 十二平均律音名换算）
 *
 * 约定：
 * - 输入为时域采样 Float32Array（取值 [-1, 1]），采样率以参数传入；
 * - 音高检测用自相关法：对滞后 lag 计算相关函数，取第一个下降沿后的峰值，
 *   再用抛物线内插精化周期；
 * - 本文件不触碰任何浏览器 API（getUserMedia / AudioContext 都在 Tool.tsx），
 *   可在 node 下被 vitest 完整测试。
 */

/** 音名表（十二平均律，C 为一组起点） */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/** 音符信息：音名 / 八度 / MIDI 编号 / 与标准音高的偏差（音分） */
export interface NoteInfo {
  readonly name: string
  readonly octave: number
  readonly midi: number
  readonly cents: number
}

/** 静音判定：RMS 低于此值视为无有效输入 */
export const MIN_RMS = 0.01
/** 可检测的频率范围（Hz）：低于 40Hz 周期太长、高于 5kHz 乐器调音用不上 */
export const MIN_DETECT_FREQ = 40
export const MAX_DETECT_FREQ = 5000

/** 采样率非法（非整数 / 超出 8k～192k / 非有限数）时抛中文错 */
export function assertValidSampleRate(sampleRate: number): void {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new Error(`采样率非法：${String(sampleRate)}（应为 8000～192000 的整数，单位 Hz）`)
  }
}

/**
 * 抛物线内插精化周期：用峰值与其左右两点拟合抛物线顶点。
 * corr 为自相关序列，peak 为整数峰位置（1 <= peak <= corr.length - 2）。
 */
export function parabolicRefine(corr: ArrayLike<number>, peak: number): number {
  if (!Number.isInteger(peak) || peak < 1 || peak >= corr.length - 1) {
    throw new Error(`峰值位置非法：${String(peak)}`)
  }
  const x1 = corr[peak - 1]!
  const x2 = corr[peak]!
  const x3 = corr[peak + 1]!
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a === 0) return peak
  const refined = peak - b / (2 * a)
  return refined > 0 ? refined : peak
}

/**
 * 自相关音高检测（纯函数）。
 * @returns 基频（Hz）；静音 / 无明确周期 / 超出可检测范围时返回 null
 */
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  assertValidSampleRate(sampleRate)
  if (samples.length === 0) throw new Error('音频数据为空：无法检测音高')

  // 1. 能量检查：太安静视为无输入
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!
  const rms = Math.sqrt(sum / samples.length)
  if (rms < MIN_RMS || !Number.isFinite(rms)) return null

  // 2. 去掉首尾静音段（阈值 0.2），提高周期估计稳定性
  let start = 0
  let end = samples.length - 1
  while (start < end && Math.abs(samples[start]!) < 0.2) start++
  while (end > start && Math.abs(samples[end]!) < 0.2) end--
  const size = end - start + 1
  if (size < 4) return null

  // 3. 自相关
  const corr = new Float64Array(size)
  for (let lag = 0; lag < size; lag++) {
    let s = 0
    for (let j = 0; j + lag < size; j++) s += samples[start + j]! * samples[start + j + lag]!
    corr[lag] = s
  }

  // 4. 找第一个下降沿之后的最大峰（跳过 lag=0 的平凡峰）
  let d = 0
  while (d + 1 < size && corr[d]! > corr[d + 1]!) d++
  let maxVal = -Infinity
  let maxPos = -1
  for (let i = d; i < size; i++) {
    if (corr[i]! > maxVal) {
      maxVal = corr[i]!
      maxPos = i
    }
  }
  // 峰落在边界上（d 恒为 1 以上，maxPos 不可能为 0；此处防单调信号）
  if (maxPos >= size - 1) return null

  // 5. 抛物线内插精化周期 → 频率
  const period = parabolicRefine(corr, maxPos)
  const freq = sampleRate / period
  if (!(freq >= MIN_DETECT_FREQ && freq <= MAX_DETECT_FREQ)) return null
  return freq
}

/**
 * 频率 → 最近的标准音（十二平均律，A4 = 440Hz）。
 * @returns 音名（如 'A'）、八度、MIDI 编号、偏差音分（+ 为偏高）
 */
export function noteFromFrequency(freq: number): NoteInfo {
  if (!Number.isFinite(freq) || freq <= 0) {
    throw new Error(`频率非法：${String(freq)}（必须为正数）`)
  }
  const midiFloat = 69 + 12 * Math.log2(freq / 440)
  const midi = Math.round(midiFloat)
  const cents = Math.round((midiFloat - midi) * 100)
  const name = NOTE_NAMES[((midi % 12) + 12) % 12]!
  const octave = Math.floor(midi / 12) - 1
  return { name, octave, midi, cents }
}

/** 音分偏差 → 中文提示：±5 音分内算准 */
export function tuningHint(cents: number): string {
  if (!Number.isFinite(cents)) throw new Error(`音分非法：${String(cents)}`)
  if (cents > 5) return '偏高'
  if (cents < -5) return '偏低'
  return '音准'
}

/** 调音结果的一行中文摘要 */
export function formatTunerResult(freq: number): string {
  const note = noteFromFrequency(freq)
  const sign = note.cents > 0 ? '+' : ''
  return `${note.name}${note.octave} · ${freq.toFixed(1)} Hz · ${sign}${note.cents} 音分（${tuningHint(note.cents)}）`
}
