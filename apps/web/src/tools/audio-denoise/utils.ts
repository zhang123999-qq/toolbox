/**
 * audio-denoise —— 降噪的纯函数层
 *
 * 纯 JS 实现谱减法/噪声门 DSP（FFT 就地迭代实现，无第三方依赖），
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
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
// 降噪 DSP（纯函数）：谱减法 + 噪声门
// ---------------------------------------------------------------------------

/** 降噪方法：spectral 谱减法 / gate 噪声门 */
export const DENOISE_METHODS = ['spectral', 'gate'] as const
export type DenoiseMethod = (typeof DENOISE_METHODS)[number]

export interface DenoiseOptions {
  readonly method: DenoiseMethod
  /** 谱减法：用音频开头多少秒估计噪声谱（默认 0.5；开头请留一段纯噪声） */
  readonly calibrationSeconds?: number
  /** 谱减法：过减因子（默认 2.0，越大去噪越狠、失真越大） */
  readonly oversubtraction?: number
  /** 谱减法：谱下限（默认 0.1，保留 10% 底噪以抑制音乐噪声） */
  readonly spectralFloor?: number
  /** 噪声门：门限 dB（默认 -40） */
  readonly thresholdDb?: number
  /** 噪声门：门限以下衰减到的倍数（默认 0.05） */
  readonly gateAttenuation?: number
}

interface ResolvedDenoiseOptions {
  readonly method: DenoiseMethod
  readonly calibrationSeconds: number
  readonly oversubtraction: number
  readonly spectralFloor: number
  readonly thresholdDb: number
  readonly gateAttenuation: number
}

/** 方法白名单校验 */
export function validateDenoiseMethod(method: string): asserts method is DenoiseMethod {
  if (method !== 'spectral' && method !== 'gate') {
    throw new Error(`降噪方法非法：${String(method)}（应为 spectral 谱减法 / gate 噪声门）`)
  }
}

/** 选项填充默认值并校验（中文错） */
export function resolveDenoiseOptions(options: DenoiseOptions): ResolvedDenoiseOptions {
  validateDenoiseMethod(options.method)
  const calibrationSeconds = options.calibrationSeconds ?? 0.5
  const oversubtraction = options.oversubtraction ?? 2
  const spectralFloor = options.spectralFloor ?? 0.1
  const thresholdDb = options.thresholdDb ?? -40
  const gateAttenuation = options.gateAttenuation ?? 0.05
  if (!Number.isFinite(calibrationSeconds) || calibrationSeconds <= 0 || calibrationSeconds > 10) {
    throw new Error(`噪声校准时长非法：${String(options.calibrationSeconds)}（应为 (0, 10] 秒）`)
  }
  if (!Number.isFinite(oversubtraction) || oversubtraction < 0.5 || oversubtraction > 10) {
    throw new Error(`过减因子非法：${String(options.oversubtraction)}（应为 0.5～10）`)
  }
  if (!Number.isFinite(spectralFloor) || spectralFloor < 0 || spectralFloor > 1) {
    throw new Error(`谱下限非法：${String(options.spectralFloor)}（应为 0～1）`)
  }
  if (!Number.isFinite(thresholdDb) || thresholdDb < -80 || thresholdDb > 0) {
    throw new Error(`门限非法：${String(options.thresholdDb)}（应为 -80～0 dB）`)
  }
  if (!Number.isFinite(gateAttenuation) || gateAttenuation < 0 || gateAttenuation > 1) {
    throw new Error(`门衰减非法：${String(options.gateAttenuation)}（应为 0～1）`)
  }
  return {
    method: options.method,
    calibrationSeconds,
    oversubtraction,
    spectralFloor,
    thresholdDb,
    gateAttenuation,
  }
}

/** 2 的幂校验（FFT 点数用） */
function assertPowerOfTwo(n: number): void {
  if (!Number.isInteger(n) || n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`FFT 点数非法：${String(n)}（应为 ≥2 的 2 的幂）`)
  }
}

/**
 * 基 2 FFT（就地迭代）：re/im 等长且为 2 的幂；
 * inverse=true 做 IFFT（结果除以 N）。
 */
export function fft(re: Float32Array, im: Float32Array, inverse = false): void {
  if (re.length !== im.length) throw new Error('FFT 实部与虚部长度不一致')
  const n = re.length
  assertPowerOfTwo(n)
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
  const sign = inverse ? 1 : -1
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (sign * 2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cwr = 1
      let cwi = 0
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k]!
        const ui = im[i + k]!
        const vr = re[i + k + len / 2]! * cwr - im[i + k + len / 2]! * cwi
        const vi = re[i + k + len / 2]! * cwi + im[i + k + len / 2]! * cwr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr
        im[i + k + len / 2] = ui - vi
        const nwr = cwr * wr - cwi * wi
        cwi = cwr * wi + cwi * wr
        cwr = nwr
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n
      im[i] = im[i]! / n
    }
  }
}

/** Hann 窗（点数须为 2 的幂，供 FFT 用） */
export function hannWindow(n: number): Float32Array {
  assertPowerOfTwo(n)
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  return w
}

/** 单帧幅度谱与相位谱（加窗 + FFT；超界补 0） */
function frameMagnitude(
  data: Float32Array,
  start: number,
  window: Float32Array,
): { mag: Float32Array; phase: Float32Array } {
  const n = window.length
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const s = start + i < data.length ? data[start + i]! : 0
    re[i] = s * window[i]!
  }
  fft(re, im)
  const mag = new Float32Array(n / 2 + 1)
  const phase = new Float32Array(n / 2 + 1)
  for (let k = 0; k <= n / 2; k++) {
    mag[k] = Math.hypot(re[k]!, im[k]!)
    phase[k] = Math.atan2(im[k]!, re[k]!)
  }
  return { mag, phase }
}

/**
 * 单声道谱减法：先用开头 calibrationSeconds 估计噪声幅度谱，
 * 再逐帧做 |X| - α·|N|（下限为 β·|X|），保留相位，经 IFFT + 加权交叠相加还原。
 * 输出按窗平方和归一化，保证无处理时完美重建。
 */
function spectralSubtractChannel(
  data: Float32Array,
  sampleRate: number,
  opts: ResolvedDenoiseOptions,
  frameSize: number,
): Float32Array {
  const n = frameSize
  const hop = n / 2
  const window = hannWindow(n)
  const out = new Float32Array(data.length)
  const norm = new Float32Array(data.length)
  const noiseMag = new Float32Array(n / 2 + 1)
  const calibFrames = Math.max(
    1,
    Math.min(
      Math.floor((opts.calibrationSeconds * sampleRate) / hop),
      Math.ceil(data.length / hop),
    ),
  )
  for (let f = 0; f < calibFrames; f++) {
    const { mag } = frameMagnitude(data, f * hop, window)
    for (let k = 0; k < mag.length; k++) noiseMag[k]! += mag[k]!
  }
  for (let k = 0; k < noiseMag.length; k++) noiseMag[k]! /= calibFrames
  const numFrames = Math.max(1, Math.ceil(data.length / hop))
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let f = 0; f < numFrames; f++) {
    const start = f * hop
    const { mag, phase } = frameMagnitude(data, start, window)
    for (let k = 0; k <= n / 2; k++) {
      const clean = Math.max(
        mag[k]! - opts.oversubtraction * noiseMag[k]!,
        opts.spectralFloor * mag[k]!,
      )
      re[k] = clean * Math.cos(phase[k]!)
      im[k] = clean * Math.sin(phase[k]!)
      if (k > 0 && k < n / 2) {
        re[n - k] = re[k]!
        im[n - k] = -im[k]!
      }
    }
    fft(re, im, true)
    for (let i = 0; i < n; i++) {
      const pos = start + i
      if (pos < data.length) {
        out[pos]! += re[i]! * window[i]!
        norm[pos]! += window[i]! * window[i]!
      }
    }
  }
  // 加窗叠加重构：累加值除以窗函数平方和。首尾边缘处窗叠加和很小，
  // 频谱修改后时域帧不再与窗函数严格成比例，直接相除会放大数值误差
  // （如输出 -55 这种爆炸值），因此用下限做平滑衰减而非硬截断。
  // 内部区域窗平方和 ≥ 0.5（Hann 窗 50% 重叠），不受下限影响。
  for (let i = 0; i < out.length; i++) {
    out[i] = out[i]! / Math.max(norm[i]!, 0.05)
  }
  return out
}

/**
 * 单声道噪声门：20ms 分帧算峰值，低于门限的帧衰减到 gateAttenuation，
 * 增益变化经 attack（开门快）/ release（关门慢）平滑，避免咔哒声。
 */
function noiseGateChannel(
  data: Float32Array,
  sampleRate: number,
  opts: ResolvedDenoiseOptions,
): Float32Array {
  const frameLen = Math.max(1, Math.floor(sampleRate * 0.02))
  const threshold = Math.pow(10, opts.thresholdDb / 20)
  const attack = 0.3
  const release = 0.05
  const out = new Float32Array(data.length)
  let gain = 1
  for (let start = 0; start < data.length; start += frameLen) {
    const end = Math.min(start + frameLen, data.length)
    let peak = 0
    for (let i = start; i < end; i++) {
      const v = Math.abs(data[i]!)
      if (v > peak) peak = v
    }
    const target = peak >= threshold ? 1 : opts.gateAttenuation
    for (let i = start; i < end; i++) {
      gain += (target - gain) * (target > gain ? attack : release)
      out[i] = data[i]! * gain
    }
  }
  return out
}

/**
 * 降噪入口：各声道独立处理，返回新 PcmAudio（不修改输入）。
 * frameSize 为谱减法帧长（须为 2 的幂，默认 1024；噪声门忽略此参数）。
 * 空输入（0 采样）直接返回空拷贝，不抛错。
 */
export function denoiseAudio(audio: PcmAudio, options: DenoiseOptions, frameSize = 1024): PcmAudio {
  assertValidSampleRate(audio.sampleRate)
  assertValidChannels(audio.channels)
  const opts = resolveDenoiseOptions(options)
  if (opts.method === 'spectral') assertPowerOfTwo(frameSize)
  const process =
    opts.method === 'spectral'
      ? (ch: Float32Array): Float32Array =>
          spectralSubtractChannel(ch, audio.sampleRate, opts, frameSize)
      : (ch: Float32Array): Float32Array => noiseGateChannel(ch, audio.sampleRate, opts)
  return { sampleRate: audio.sampleRate, channels: audio.channels.map(process) }
}

/** 降噪结果文件名：原名-denoised.wav */
export function denoiseFileName(inputName: string, method: DenoiseMethod): string {
  validateDenoiseMethod(method)
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'audio' : base}-denoised.wav`
}
