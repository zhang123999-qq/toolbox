/**
 * audio-spectrogram —— 音频频谱图的纯函数层
 *
 * STFT（短时傅里叶变换，基 2 FFT 纯 JS 实现）+ dB 刻度 + 伪彩色映射全部在此实现，
 * 浏览器 API（AudioContext / canvas / Blob）；canvas 绘制只出现在 Tool.tsx。
 *
 * 约定：PCM 用 Float32Array 表示（取值 [-1, 1]），采样率以参数传入。
 */

/** PCM 音频：各声道等长 Float32Array，取值范围 [-1, 1] */
export interface PcmAudio {
  readonly sampleRate: number
  readonly channels: readonly Float32Array[]
}

/** 合法采样率区间（Hz）：整数，1000～192000 */
export const MIN_SAMPLE_RATE = 1000
export const MAX_SAMPLE_RATE = 192000

/** 采样率非法（非整数 / 超出区间 / 非有限数）时抛中文错 */
export function assertValidSampleRate(sampleRate: number): void {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < MIN_SAMPLE_RATE ||
    sampleRate > MAX_SAMPLE_RATE
  ) {
    throw new Error(
      `采样率非法：${String(sampleRate)}（应为 ${MIN_SAMPLE_RATE}～${MAX_SAMPLE_RATE} 的整数，单位 Hz）`,
    )
  }
}

/** 声道校验：至少 1 个声道，且各声道采样点数相同 */
export function assertValidChannels(channels: readonly Float32Array[]): void {
  if (channels.length === 0) throw new Error('声道数非法：至少需要 1 个声道')
  const frames = channels[0]!.length
  for (const ch of channels) {
    if (ch.length !== frames) throw new Error('声道长度不一致：各声道采样点数必须相同')
  }
}

/** 秒 → "1.23 秒" */
export function formatSeconds(sec: number): string {
  return `${sec.toFixed(2)} 秒`
}

/** 音频精确时长（秒）：采样点数 / 采样率 */
export function durationSec(audio: PcmAudio): number {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  return audio.channels[0]!.length / audio.sampleRate
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

/** 写 4 字符 ASCII 标记 */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
}

/** 16 位 PCM WAV 编码器（纯函数）：PcmAudio → WAV 文件字节 */
export function encodeWavPcm(audio: PcmAudio): Uint8Array<ArrayBuffer> {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  const numChannels = audio.channels.length
  const numFrames = audio.channels[0]!.length
  const dataSize = numFrames * numChannels * 2
  const out = new Uint8Array(44 + dataSize)
  const view = new DataView(out.buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, audio.sampleRate, true)
  view.setUint32(28, audio.sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = audio.channels[c]![i]!
      const clamped = sample < -1 ? -1 : sample > 1 ? 1 : sample
      view.setInt16(offset, Math.round(clamped * 32767), true)
      offset += 2
    }
  }
  return out
}

/**
 * 生成正弦测试音（纯函数）：供单测与「示例音频」使用。
 * 幅度 0.5，各声道同相。
 */
export function makeSineTone(
  sampleRate: number,
  seconds: number,
  freqHz: number,
  channels = 1,
): PcmAudio {
  assertValidSampleRate(sampleRate)
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('时长非法：必须为正数')
  if (!Number.isFinite(freqHz) || freqHz <= 0) throw new Error('频率非法：必须为正数')
  if (!Number.isInteger(channels) || channels < 1 || channels > 8) {
    throw new Error('声道数非法：应为 1～8 的整数')
  }
  const frames = Math.floor(sampleRate * seconds)
  const list: Float32Array[] = []
  for (let c = 0; c < channels; c++) {
    const data = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
      data[i] = 0.5 * Math.sin((2 * Math.PI * freqHz * i) / sampleRate)
    }
    list.push(data)
  }
  return { sampleRate, channels: list }
}

// ---------------------------------------------------------------------------
// STFT
// ---------------------------------------------------------------------------

/** 允许的窗长（采样点） */
export const WINDOW_SIZES = [256, 512, 1024, 2048] as const
export type WindowSize = (typeof WINDOW_SIZES)[number]

/** 窗长必须是白名单之一，否则抛中文错 */
export function assertValidWindowSize(size: number): asserts size is WindowSize {
  if (!(WINDOW_SIZES as readonly number[]).includes(size)) {
    throw new Error(`窗长非法：${String(size)}（可选 ${WINDOW_SIZES.join(' / ')}）`)
  }
}

/** 允许的重叠率（%） */
export const OVERLAP_PCTS = [0, 25, 50, 75] as const

/** 重叠率必须是白名单之一，否则抛中文错 */
export function assertValidOverlapPct(pct: number): void {
  if (!(OVERLAP_PCTS as readonly number[]).includes(pct)) {
    throw new Error(`重叠率非法：${String(pct)}（可选 ${OVERLAP_PCTS.join(' / ')}）`)
  }
}

/** 窗函数种类 */
export type WindowKind = 'hann' | 'hamming'

/** 窗函数增益（0 ≤ i < n） */
export function windowGain(kind: WindowKind, i: number, n: number): number {
  const phase = (2 * Math.PI * i) / (n - 1)
  return kind === 'hann' ? 0.5 * (1 - Math.cos(phase)) : 0.54 - 0.46 * Math.cos(phase)
}

/** 基 2 FFT（就地迭代）：re/im 为实部/虚部，长度必须为 2 的幂（窗长白名单保证） */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]!
      re[i] = re[j]!
      re[j] = tr
      const ti = im[i]!
      im[i] = im[j]!
      im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k]!
        const uIm = im[i + k]!
        const vRe = re[i + k + len / 2]! * curRe - im[i + k + len / 2]! * curIm
        const vIm = re[i + k + len / 2]! * curIm + im[i + k + len / 2]! * curRe
        re[i + k] = uRe + vRe
        im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nRe
      }
    }
  }
}

/** 对加窗后的实信号做 FFT，返回前 n/2 个频点的幅度（已按 n 归一化） */
function fftMagnitudes(frame: Float32Array): Float32Array {
  const n = frame.length
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  for (let i = 0; i < n; i++) re[i] = frame[i]!
  fftInPlace(re, im)
  const out = new Float32Array(n / 2)
  for (let k = 0; k < n / 2; k++) {
    out[k] = Math.sqrt(re[k]! * re[k]! + im[k]! * im[k]!) / n
  }
  return out
}

/** 语谱图：每帧为 windowSize/2 个频点的幅度 */
export interface Spectrogram {
  readonly frames: readonly Float32Array[]
  readonly windowSize: number
  readonly hopSize: number
  /** 频率分辨率（Hz / 频点） */
  readonly freqStepHz: number
  /** 时间分辨率（秒 / 帧） */
  readonly frameStepSec: number
}

/**
 * 对单声道信号做 STFT（纯 JS 朴素 DFT，窗长 ≤ 2048 时可用）。
 * 空信号、信号短于窗长时抛中文错。
 */
export function computeSpectrogram(
  signal: Float32Array,
  sampleRate: number,
  windowSize: number,
  overlapPct: number,
  windowKind: WindowKind = 'hann',
): Spectrogram {
  assertValidSampleRate(sampleRate)
  assertValidWindowSize(windowSize)
  assertValidOverlapPct(overlapPct)
  if (signal.length === 0) throw new Error('音频为空：没有可分析的采样点')
  if (signal.length < windowSize) {
    throw new Error(
      `音频太短：仅 ${formatSeconds(signal.length / sampleRate)}，一个分析窗就需要 ${windowSize} 个采样点`,
    )
  }
  const hopSize = Math.round((windowSize * (100 - overlapPct)) / 100)
  const count = Math.floor((signal.length - windowSize) / hopSize) + 1
  const frames: Float32Array[] = []
  const windowed = new Float32Array(windowSize)
  for (let f = 0; f < count; f++) {
    const start = f * hopSize
    for (let i = 0; i < windowSize; i++) {
      windowed[i] = signal[start + i]! * windowGain(windowKind, i, windowSize)
    }
    frames.push(fftMagnitudes(windowed))
  }
  return {
    frames,
    windowSize,
    hopSize,
    freqStepHz: sampleRate / windowSize,
    frameStepSec: hopSize / sampleRate,
  }
}

/** 多声道混成单声道（各声道取平均），供频谱分析 */
export function mixDownToMono(audio: PcmAudio): Float32Array {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  const frames = audio.channels[0]!.length
  const out = new Float32Array(frames)
  const n = audio.channels.length
  for (let i = 0; i < frames; i++) {
    let sum = 0
    for (const ch of audio.channels) sum += ch[i]!
    out[i] = sum / n
  }
  return out
}

// ---------------------------------------------------------------------------
// dB 刻度与伪彩色
// ---------------------------------------------------------------------------

/** dB 下限：低于此值一律按底噪显示 */
export const DB_FLOOR = -90

/** 幅度 → dB（相对最大幅度）；幅度为 0 时按底噪处理 */
export function magnitudeToDb(mag: number, maxMag: number): number {
  if (!(maxMag > 0)) throw new Error(`最大幅度非法：${String(maxMag)}（必须为正数）`)
  if (!(mag > 0)) return DB_FLOOR
  return 20 * Math.log10(mag / maxMag)
}

/** dB → 0～1 显示强度（floorDb 以下钳为 0，0 dB 为 1） */
export function dbToNorm(db: number, floorDb: number = DB_FLOOR): number {
  if (!(floorDb < 0)) throw new Error(`dB 下限非法：${String(floorDb)}（必须为负数）`)
  if (db >= 0) return 1
  if (db <= floorDb) return 0
  return (db - floorDb) / -floorDb
}

/**
 * 伪彩色映射：0 → 深蓝，0.5 → 青，1 → 亮黄。
 * 输入钳制到 [0, 1]。
 */
export function normToRgb(norm: number): readonly [number, number, number] {
  const x = norm < 0 ? 0 : norm > 1 ? 1 : norm
  if (x < 0.5) {
    const t = x / 0.5
    return [0, Math.round(255 * t), Math.round(128 + 127 * t)]
  }
  const t = (x - 0.5) / 0.5
  return [Math.round(255 * t), 255, Math.round(255 * (1 - t))]
}

/** 频谱图文件名：原名（去扩展名）+ -spectrogram.png */
export function spectrogramFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'audio' : base}-spectrogram.png`
}
