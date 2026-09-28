/**
 * audio-mix —— 音频混音的纯函数层
 *
 * 多路 PCM 按音量配比逐采样相加后钳制到 [-1, 1]，纯函数，不触碰浏览器 API。
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
// 混音
// ---------------------------------------------------------------------------

/** 时长对齐方式 */
export const ALIGN_MODES = ['shortest', 'longest', 'loop'] as const
export type AlignMode = (typeof ALIGN_MODES)[number]

/** 对齐方式中文名（供界面展示） */
export const ALIGN_MODE_LABELS: Record<AlignMode, string> = {
  shortest: '最短对齐',
  longest: '最长对齐（缺失部分补零）',
  loop: '最长对齐（短音轨循环）',
}

/** 对齐方式非法时抛中文错 */
export function assertValidAlignMode(mode: string): asserts mode is AlignMode {
  if (mode !== 'shortest' && mode !== 'longest' && mode !== 'loop') {
    throw new Error(`对齐方式非法：“${mode}”（可选 最短对齐 / 最长对齐 / 循环）`)
  }
}

/** 音量上限倍数：2 = 200% */
export const MAX_VOLUME = 2

/** 音量配比校验：0～2 的有限数，1 = 100% */
export function assertValidVolume(volume: number): void {
  if (!Number.isFinite(volume) || volume < 0 || volume > MAX_VOLUME) {
    throw new Error(`音量非法：${String(volume)}（应为 0～${MAX_VOLUME}，1 = 100%）`)
  }
}

/** 一路参与混音的音轨：PCM + 音量配比 */
export interface MixTrack {
  readonly audio: PcmAudio
  readonly volume: number
}

/** 最多参与混音的音轨数 */
export const MAX_TRACKS = 8

/**
 * 混音：各路 PCM 按音量配比逐采样相加，超出 [-1, 1] 钳制。
 * 对齐方式：
 * - shortest：输出与最短音轨等长，多余截断
 * - longest：输出与最长音轨等长，短音轨缺失部分补零
 * - loop：输出与最长音轨等长，短音轨循环播放补齐
 * 要求：2～8 路、采样率与声道数全部一致；返回新的 PcmAudio，不修改输入。
 */
export function mixAudios(tracks: readonly MixTrack[], align: AlignMode): PcmAudio {
  assertValidAlignMode(align)
  if (tracks.length < 2) throw new Error('至少需要 2 路音频才能混音')
  if (tracks.length > MAX_TRACKS) throw new Error(`音轨过多：最多 ${MAX_TRACKS} 路`)
  const first = tracks[0]!.audio
  assertValidSampleRate(first.sampleRate)
  assertValidChannels(first.channels)
  const sampleRate = first.sampleRate
  const numChannels = first.channels.length
  let outFrames = first.channels[0]!.length
  for (const track of tracks) {
    assertValidVolume(track.volume)
    assertValidSampleRate(track.audio.sampleRate)
    assertValidChannels(track.audio.channels)
    if (track.audio.sampleRate !== sampleRate) {
      throw new Error('采样率不一致：参与混音的音频采样率必须相同')
    }
    if (track.audio.channels.length !== numChannels) {
      throw new Error('声道数不一致：参与混音的音频声道数必须相同')
    }
    const frames = track.audio.channels[0]!.length
    outFrames = align === 'shortest' ? Math.min(outFrames, frames) : Math.max(outFrames, frames)
  }
  if (outFrames === 0) throw new Error('参与混音的音频为空：没有可混音的内容')
  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) {
    const out = new Float32Array(outFrames)
    for (let i = 0; i < outFrames; i++) {
      let sum = 0
      for (const track of tracks) {
        const data = track.audio.channels[c]!
        const len = data.length
        const sample = len === 0 ? 0 : align === 'loop' ? data[i % len]! : i < len ? data[i]! : 0
        sum += sample * track.volume
      }
      out[i] = sum < -1 ? -1 : sum > 1 ? 1 : sum
    }
    channels.push(out)
  }
  return { sampleRate, channels }
}

/** 混音结果文件名（多路输入取统一命名） */
export function mixFileName(): string {
  return 'audio-mix.wav'
}
