/**
 * audio-extract —— 音轨提取的纯函数层
 *
 * 本文件只放纯函数：格式校验、ffmpeg 参数组装、输出文件名与 MIME。
 * 真正的 ffmpeg.wasm 调用（动态 import）在 Tool.tsx 中，try/catch 失败时中文提示并优雅降级。
 * 附带的 WAV 编解码器供「示例音频」生成与单测使用。
 */
// ---------------------------------------------------------------------------
// PCM 与 WAV 编解码（纯函数）
// ---------------------------------------------------------------------------

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

/** 读 ASCII 标记 */
function readAscii(view: DataView, offset: number, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i))
  return out
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
 * WAV 解码器（纯函数）：WAV 文件字节 → PcmAudio。
 * 仅支持 16 位 PCM（编码 1）与 32 位浮点（编码 3）；容忍 fmt 之前的扩展 chunk。
 */
export function decodeWavPcm(bytes: Uint8Array): PcmAudio {
  if (bytes.length < 44) throw new Error('不是合法的 WAV 文件：文件过短')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    throw new Error('不是合法的 WAV 文件：缺少 RIFF/WAVE 标记')
  }
  let pos = 12
  let foundFmt = false
  let audioFormat = 0
  let numChannels = 0
  let sampleRate = 0
  let bitsPerSample = 0
  let dataOffset = -1
  let dataSize = 0
  while (pos + 8 <= bytes.length) {
    const id = readAscii(view, pos, 4)
    const size = view.getUint32(pos + 4, true)
    if (id === 'fmt ') {
      foundFmt = true
      audioFormat = view.getUint16(pos + 8, true)
      numChannels = view.getUint16(pos + 10, true)
      sampleRate = view.getUint32(pos + 12, true)
      bitsPerSample = view.getUint16(pos + 22, true)
    } else if (id === 'data') {
      dataOffset = pos + 8
      dataSize = size
      break
    }
    pos += 8 + size + (size % 2)
  }
  if (!foundFmt) throw new Error('不是合法的 WAV 文件：缺少 fmt chunk')
  if (dataOffset < 0) throw new Error('不是合法的 WAV 文件：缺少 data chunk')
  if (audioFormat !== 1 && audioFormat !== 3) {
    throw new Error(`不支持的 WAV 编码格式：${audioFormat}（仅支持 16 位 PCM / 32 位浮点）`)
  }
  if (audioFormat === 1 && bitsPerSample !== 16) {
    throw new Error(`不支持的位深：${bitsPerSample}（PCM 仅支持 16 位）`)
  }
  if (audioFormat === 3 && bitsPerSample !== 32) {
    throw new Error(`不支持的位深：${bitsPerSample}（浮点仅支持 32 位）`)
  }
  if (numChannels < 1 || numChannels > 32) {
    throw new Error(`声道数非法：${numChannels}（应为 1～32）`)
  }
  if (dataOffset + dataSize > bytes.length) {
    throw new Error('WAV 文件损坏：data chunk 超出文件范围')
  }
  const bytesPerSample = bitsPerSample / 8
  const numFrames = Math.floor(dataSize / (numChannels * bytesPerSample))
  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(new Float32Array(numFrames))
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const off = dataOffset + (i * numChannels + c) * bytesPerSample
      channels[c]![i] =
        audioFormat === 3 ? view.getFloat32(off, true) : view.getInt16(off, true) / 32768
    }
  }
  assertValidSampleRate(sampleRate)
  return { sampleRate, channels }
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
// 音轨提取（纯函数：参数组装与校验）
// ---------------------------------------------------------------------------

/** 支持的输出格式 */
export const EXTRACT_FORMATS = ['mp3', 'wav', 'ogg', 'm4a', 'flac'] as const
export type ExtractFormat = (typeof EXTRACT_FORMATS)[number]

/** 输出格式白名单校验 */
export function validateExtractFormat(format: string): asserts format is ExtractFormat {
  if (!(EXTRACT_FORMATS as readonly string[]).includes(format)) {
    throw new Error(`不支持的输出格式：${format}（支持：${EXTRACT_FORMATS.join(' / ')}）`)
  }
}

/** 输入文件名 → 音轨输出文件名：原名-track.mp3 */
export function extractFileName(inputName: string, format: string): string {
  validateExtractFormat(format)
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'audio' : base}-track.${format}`
}

/**
 * 组装 ffmpeg 参数：['-i', 输入, '-vn', …音频编码参数, 输出]。
 * -vn 去掉视频流，只保留音频；有损格式固定 192k 比特率。
 */
export function buildExtractArgs(
  inputName: string,
  outputName: string,
  format: ExtractFormat,
): string[] {
  const args = ['-i', inputName, '-vn']
  switch (format) {
    case 'mp3':
      args.push('-c:a', 'libmp3lame', '-b:a', '192k')
      break
    case 'm4a':
      args.push('-c:a', 'aac', '-b:a', '192k')
      break
    case 'ogg':
      args.push('-c:a', 'libvorbis', '-b:a', '192k')
      break
    case 'wav':
      args.push('-c:a', 'pcm_s16le')
      break
    case 'flac':
      args.push('-c:a', 'flac')
      break
  }
  args.push(outputName)
  return args
}

/** 输出格式 → Blob MIME（供下载） */
export function extractMimeType(format: ExtractFormat): string {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'm4a':
      return 'audio/mp4'
    case 'flac':
      return 'audio/flac'
  }
}
