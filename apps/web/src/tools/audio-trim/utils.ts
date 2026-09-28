/**
 * audio-trim —— 音频去静音的纯函数层
 *
 * 以 10ms 为分析帧计算 RMS → dBFS，帧能量低于阈值的判为静音；
 * 检测首尾连续静音段，仅当其时长 ≥ 最小时长时才裁掉。
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

/**
 * 生成「前导静音 + 正弦 + 尾部静音」测试音（纯函数）：供单测与示例音频使用。
 */
export function makeToneWithSilence(
  sampleRate: number,
  leadSilSec: number,
  toneSec: number,
  trailSilSec: number,
  freqHz = 440,
  channels = 1,
): PcmAudio {
  assertValidSampleRate(sampleRate)
  if (!Number.isFinite(leadSilSec) || leadSilSec < 0) {
    throw new Error('前导静音时长非法：不能为负数')
  }
  if (!Number.isFinite(trailSilSec) || trailSilSec < 0) {
    throw new Error('尾部静音时长非法：不能为负数')
  }
  const tone = makeSineTone(sampleRate, toneSec, freqHz, channels)
  const leadFrames = Math.floor(leadSilSec * sampleRate)
  const trailFrames = Math.floor(trailSilSec * sampleRate)
  const total = leadFrames + tone.channels[0]!.length + trailFrames
  return {
    sampleRate,
    channels: tone.channels.map((ch) => {
      const out = new Float32Array(total)
      out.set(ch, leadFrames)
      return out
    }),
  }
}

// ---------------------------------------------------------------------------
// 静音检测与裁剪
// ---------------------------------------------------------------------------

/** 静音阈值（dBFS）：-90～-10 */
export const MIN_THRESHOLD_DB = -90
export const MAX_THRESHOLD_DB = -10

/** 静音阈值非法时抛中文错 */
export function assertValidThresholdDb(db: number): void {
  if (!Number.isFinite(db) || db < MIN_THRESHOLD_DB || db > MAX_THRESHOLD_DB) {
    throw new Error(
      `静音阈值非法：${String(db)}（应为 ${MIN_THRESHOLD_DB}～${MAX_THRESHOLD_DB} dB）`,
    )
  }
}

/** 最小静音时长（秒）：0.05～10 */
export const MIN_SILENCE_SEC = 0.05
export const MAX_SILENCE_SEC = 10

/** 最小时长非法时抛中文错 */
export function assertValidMinSilenceSec(sec: number): void {
  if (!Number.isFinite(sec) || sec < MIN_SILENCE_SEC || sec > MAX_SILENCE_SEC) {
    throw new Error(
      `最小时长非法：${String(sec)}（应为 ${MIN_SILENCE_SEC}～${MAX_SILENCE_SEC} 秒）`,
    )
  }
}

/** 单分析帧能量 → dBFS（多声道取平均功率）；全零帧返回 -Infinity */
function frameDb(audio: PcmAudio, frameIndex: number, frameSize: number): number {
  const total = audio.channels[0]!.length
  const start = frameIndex * frameSize
  const end = Math.min(start + frameSize, total)
  let sum = 0
  let n = 0
  for (let i = start; i < end; i++) {
    for (const ch of audio.channels) {
      const s = ch[i]!
      sum += s * s
      n++
    }
  }
  if (sum <= 0) return Number.NEGATIVE_INFINITY
  return 10 * Math.log10(sum / n)
}

/** 首尾静音检测结果（秒） */
export interface SilenceInfo {
  readonly leadingSec: number
  readonly trailingSec: number
}

/**
 * 检测音频首尾的连续静音时长（秒）。
 * 分析帧长 10ms；帧 dBFS < thresholdDb 判为静音。空音频抛中文错。
 */
export function detectSilence(audio: PcmAudio, thresholdDb: number): SilenceInfo {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  assertValidThresholdDb(thresholdDb)
  const total = audio.channels[0]!.length
  if (total === 0) throw new Error('音频为空：没有可检测的内容')
  const frameSize = Math.max(1, Math.round(audio.sampleRate / 100))
  const numFrames = Math.ceil(total / frameSize)
  let leading = 0
  while (leading < numFrames && frameDb(audio, leading, frameSize) < thresholdDb) leading++
  let trailing = 0
  while (
    trailing < numFrames - leading &&
    frameDb(audio, numFrames - 1 - trailing, frameSize) < thresholdDb
  ) {
    trailing++
  }
  return {
    leadingSec: Math.min(leading * frameSize, total) / audio.sampleRate,
    trailingSec: Math.min(trailing * frameSize, total) / audio.sampleRate,
  }
}

/** 去静音结果 */
export interface TrimResult {
  readonly audio: PcmAudio
  /** 实际裁掉的首 / 尾静音时长（秒） */
  readonly leadingRemovedSec: number
  readonly trailingRemovedSec: number
  /** 检测到的首 / 尾静音时长（秒，含因未达最小时长而保留的部分） */
  readonly leadingDetectedSec: number
  readonly trailingDetectedSec: number
}

/**
 * 自动裁掉首尾静音：仅当某端静音时长 ≥ minSilenceSec 时才裁掉该端。
 * 全静音时抛中文错；返回新 PcmAudio，不修改输入。
 */
export function trimSilence(
  audio: PcmAudio,
  thresholdDb: number,
  minSilenceSec: number,
): TrimResult {
  assertValidMinSilenceSec(minSilenceSec)
  const { leadingSec, trailingSec } = detectSilence(audio, thresholdDb)
  const total = durationSec(audio)
  if (leadingSec + trailingSec >= total) {
    throw new Error(
      '音频全部为静音：没有可保留的内容，请降低静音阈值（改为更负的 dB 数值）或更换音频',
    )
  }
  const leadCut = leadingSec >= minSilenceSec ? leadingSec : 0
  const trailCut = trailingSec >= minSilenceSec ? trailingSec : 0
  const from = Math.floor(leadCut * audio.sampleRate)
  const to = audio.channels[0]!.length - Math.floor(trailCut * audio.sampleRate)
  return {
    audio: {
      sampleRate: audio.sampleRate,
      channels: audio.channels.map((ch) => ch.slice(from, to)),
    },
    leadingRemovedSec: leadCut,
    trailingRemovedSec: trailCut,
    leadingDetectedSec: leadingSec,
    trailingDetectedSec: trailingSec,
  }
}

/** 去静音结果文件名：原名（去扩展名）+ -trimmed.wav */
export function trimFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'audio' : base}-trimmed.wav`
}
