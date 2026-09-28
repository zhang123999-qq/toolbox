/**
 * audio-fade —— 音频淡入淡出的纯函数层
 *
 * 对 PCM 首尾按给定曲线应用淡入 / 淡出增益，全部纯函数，
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
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

/** 音频时长（秒） */
export function durationSec(audio: PcmAudio): number {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  return audio.channels[0]!.length / audio.sampleRate
}

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
// 淡入淡出
// ---------------------------------------------------------------------------

/** 淡入淡出曲线 */
export const FADE_CURVES = ['linear', 'exponential'] as const
export type FadeCurve = (typeof FADE_CURVES)[number]

/** 曲线中文名（供界面展示） */
export const FADE_CURVE_LABELS: Record<FadeCurve, string> = {
  linear: '线性',
  exponential: '指数',
}

/** 曲线非法时抛中文错 */
export function assertValidFadeCurve(curve: string): asserts curve is FadeCurve {
  if (curve !== 'linear' && curve !== 'exponential') {
    throw new Error(`淡入淡出曲线非法：“${curve}”（可选 线性 / 指数）`)
  }
}

/** 单边淡入 / 淡出时长上限（秒） */
export const MAX_FADE_SEC = 3600

/**
 * 淡入淡出增益：position ∈ [0, 1]（0 = 淡入起点 / 淡出终点，1 = 全音量）。
 * linear：直线；exponential：指数曲线（起音更柔和，(e^3x−1)/(e^3−1)）。
 */
export function fadeGain(position: number, curve: FadeCurve): number {
  assertValidFadeCurve(curve)
  if (!Number.isFinite(position) || position < 0 || position > 1) {
    throw new Error(`淡入淡出位置非法：${String(position)}（应为 0～1）`)
  }
  if (curve === 'linear') return position
  return (Math.exp(3 * position) - 1) / (Math.exp(3) - 1)
}

/** 淡入 / 淡出时长合法性校验 */
function assertValidFadeSec(sec: number, label: string): void {
  if (!Number.isFinite(sec) || sec < 0 || sec > MAX_FADE_SEC) {
    throw new Error(`${label}时长非法：${String(sec)}（应为 0～${MAX_FADE_SEC} 秒）`)
  }
}

/**
 * 对 PCM 首尾应用淡入 / 淡出，返回新的 PcmAudio（不修改输入）。
 * 淡入 + 淡出超过音频总时长、空音频时抛中文错；各声道应用相同增益。
 */
export function applyFade(
  audio: PcmAudio,
  fadeInSec: number,
  fadeOutSec: number,
  curve: FadeCurve,
): PcmAudio {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  assertValidFadeCurve(curve)
  assertValidFadeSec(fadeInSec, '淡入')
  assertValidFadeSec(fadeOutSec, '淡出')
  const total = audio.channels[0]!.length
  if (total === 0) throw new Error('音频为空：没有可处理的内容')
  const totalSec = total / audio.sampleRate
  if (fadeInSec + fadeOutSec > totalSec) {
    throw new Error(
      `淡入（${formatSeconds(fadeInSec)}）与淡出（${formatSeconds(fadeOutSec)}）之和超过音频时长（${formatSeconds(totalSec)}）`,
    )
  }
  const inSamples = Math.round(fadeInSec * audio.sampleRate)
  const outSamples = Math.round(fadeOutSec * audio.sampleRate)
  const channels = audio.channels.map((ch) => {
    const out = ch.slice()
    for (let i = 0; i < inSamples; i++) {
      out[i] = out[i]! * fadeGain(inSamples <= 1 ? 0 : i / (inSamples - 1), curve)
    }
    for (let i = 0; i < outSamples; i++) {
      const idx = total - 1 - i
      out[idx] = out[idx]! * fadeGain(outSamples <= 1 ? 0 : i / (outSamples - 1), curve)
    }
    return out
  })
  return { sampleRate: audio.sampleRate, channels }
}

/** 淡入淡出结果文件名：原名（去扩展名）+ -fade.wav */
export function fadeFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'audio' : base}-fade.wav`
}
