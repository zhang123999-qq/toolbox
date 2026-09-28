/**
 * audio-record —— 录音的纯函数层
 *
 * 录音状态机、MIME 选择、时长格式化均为纯函数；
 * MediaRecorder / getUserMedia 只在 Tool.tsx 用，可在 node 下被 vitest 完整测试。
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
// 录音状态机与时长格式化（纯函数；MediaRecorder / getUserMedia 只在 Tool.tsx 用）
// ---------------------------------------------------------------------------

export const RECORDER_STATUSES = ['idle', 'recording', 'paused', 'stopped'] as const
export type RecorderStatus = (typeof RECORDER_STATUSES)[number]

export const RECORDER_EVENTS = ['start', 'pause', 'resume', 'stop', 'reset'] as const
export type RecorderEvent = (typeof RECORDER_EVENTS)[number]

/** 状态中文文案 */
export const RECORDER_STATUS_TEXT: Record<RecorderStatus, string> = {
  idle: '待机',
  recording: '录音中',
  paused: '已暂停',
  stopped: '已停止',
}

/** 事件中文文案 */
export function recorderEventText(event: RecorderEvent): string {
  switch (event) {
    case 'start':
      return '开始'
    case 'pause':
      return '暂停'
    case 'resume':
      return '继续'
    case 'stop':
      return '停止'
    case 'reset':
      return '重置'
  }
}

/**
 * 录音状态机：idle → recording ⇄ paused → stopped → idle。
 * 非法迁移（如待机时点暂停）抛中文错。
 */
export function nextRecorderStatus(status: RecorderStatus, event: RecorderEvent): RecorderStatus {
  switch (status) {
    case 'idle':
      if (event === 'start') return 'recording'
      break
    case 'recording':
      if (event === 'pause') return 'paused'
      if (event === 'stop') return 'stopped'
      break
    case 'paused':
      if (event === 'resume') return 'recording'
      if (event === 'stop') return 'stopped'
      break
    case 'stopped':
      if (event === 'reset') return 'idle'
      if (event === 'start') return 'recording'
      break
  }
  throw new Error(
    `当前状态「${RECORDER_STATUS_TEXT[status]}」下不能执行「${recorderEventText(event)}」`,
  )
}

/** 候选录音 MIME（按优先级）：挑浏览器支持的第一个 */
export const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
] as const

/**
 * 纯函数：从候选列表挑第一个被支持的 MIME。
 * isSupported 由调用方传入（如 MediaRecorder.isTypeSupported），便于单测。
 * 都不支持返回 undefined，调用方应中文提示并降级。
 */
export function pickMimeType(isSupported: (mime: string) => boolean): string | undefined {
  for (const mime of RECORDER_MIME_CANDIDATES) {
    if (isSupported(mime)) return mime
  }
  return undefined
}

/** MIME → 文件扩展名 */
export function mimeToExtension(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('wav')) return 'wav'
  return 'bin'
}

/** 毫秒 → 'MM:SS'（≥1 小时则 'H:MM:SS'） */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error(`时长非法：${String(ms)}（应为非负有限数字，单位毫秒）`)
  }
  const totalSec = Math.floor(ms / 1000)
  const sec = totalSec % 60
  const min = Math.floor(totalSec / 60) % 60
  const hour = Math.floor(totalSec / 3600)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return hour > 0 ? `${hour}:${pad(min)}:${pad(sec)}` : `${pad(min)}:${pad(sec)}`
}

/** 录音结果文件名：recording-20260928-101530.webm（now 参数便于单测定） */
export function recordFileName(mime: string, now: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  return `recording-${stamp}.${mimeToExtension(mime)}`
}
