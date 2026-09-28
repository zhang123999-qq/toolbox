/**
 * media-metadata —— 媒体元数据的纯函数层
 *
 * 约定：浏览器 API（audio/video 元素探测时长）只出现在 Tool.tsx，
 * 本文件只做文件头识别 / WAV / MP3 / MP4 解析 / 格式化，可在 node 下被 vitest 完整测试。
 * 只读文件头部（Tool 侧切片传入），不依赖完整文件。
 */

// ---------------------------------------------------------------------------
// 基础读写
// ---------------------------------------------------------------------------

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[offset + i]!)
  return out
}

function dataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

// ---------------------------------------------------------------------------
// 容器识别
// ---------------------------------------------------------------------------

/** 支持识别的媒体容器 */
export type MediaKind = 'wav' | 'mp3' | 'mp4' | 'webm' | 'ogg' | 'flac' | 'unknown'

/** 容器中文名 */
export function mediaKindLabel(kind: MediaKind): string {
  const labels: Record<MediaKind, string> = {
    wav: 'WAV（无压缩音频）',
    mp3: 'MP3（音频）',
    mp4: 'MP4（音视频容器）',
    webm: 'WebM / MKV（EBML 容器）',
    ogg: 'Ogg（音频容器）',
    flac: 'FLAC（无损音频）',
    unknown: '未知格式',
  }
  return labels[kind]
}

/** 按文件头魔数识别容器；字节不足时返回 'unknown' */
export function detectMediaKind(bytes: Uint8Array): MediaKind {
  if (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === 'RIFF' &&
    readAscii(bytes, 8, 4) === 'WAVE'
  ) {
    return 'wav'
  }
  if (bytes.length >= 4 && readAscii(bytes, 0, 4) === 'fLaC') return 'flac'
  if (bytes.length >= 4 && readAscii(bytes, 0, 4) === 'OggS') return 'ogg'
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return 'webm'
  }
  if (bytes.length >= 12 && readAscii(bytes, 4, 4) === 'ftyp') return 'mp4'
  if (bytes.length >= 3 && readAscii(bytes, 0, 3) === 'ID3') return 'mp3'
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0) return 'mp3'
  return 'unknown'
}

// ---------------------------------------------------------------------------
// WAV 解析
// ---------------------------------------------------------------------------

export interface WavInfo {
  readonly sampleRate: number
  readonly channels: number
  readonly bitsPerSample: number
  readonly durationSec: number
  readonly dataBytes: number
}

/** 解析 WAV 头：采样率 / 声道 / 位深 / 时长；非法头抛中文错 */
export function parseWavInfo(bytes: Uint8Array): WavInfo {
  if (detectMediaKind(bytes) !== 'wav') throw new Error('不是合法的 WAV 文件头')
  const view = dataView(bytes)
  let pos = 12
  let sampleRate = 0
  let channels = 0
  let bitsPerSample = 0
  let dataBytes = -1
  let foundFmt = false
  while (pos + 8 <= bytes.length) {
    const id = readAscii(bytes, pos, 4)
    const size = view.getUint32(pos + 4, true)
    if (id === 'fmt ') {
      foundFmt = true
      channels = view.getUint16(pos + 10, true)
      sampleRate = view.getUint32(pos + 12, true)
      bitsPerSample = view.getUint16(pos + 22, true)
    } else if (id === 'data') {
      dataBytes = size
      break
    }
    pos += 8 + size + (size % 2)
  }
  if (!foundFmt) throw new Error('WAV 文件头损坏：缺少 fmt chunk')
  if (dataBytes < 0) throw new Error('WAV 文件头损坏：缺少 data chunk')
  if (channels < 1 || sampleRate <= 0 || bitsPerSample <= 0) {
    throw new Error('WAV 文件头损坏：音频参数非法')
  }
  const durationSec = dataBytes / ((sampleRate * channels * bitsPerSample) / 8)
  return { sampleRate, channels, bitsPerSample, durationSec, dataBytes }
}

// ---------------------------------------------------------------------------
// MP3 解析（首帧头）
// ---------------------------------------------------------------------------

export interface Mp3Info {
  readonly mpegVersion: string
  readonly bitrateKbps: number
  readonly sampleRateHz: number
  readonly channels: number
}

const MP3_BITRATES: Record<string, readonly number[]> = {
  '1/3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  '2/3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
}

const MP3_SAMPLE_RATES: Record<string, readonly number[]> = {
  '1': [44100, 48000, 32000, 0],
  '2': [22050, 24000, 16000, 0],
  '2.5': [11025, 12000, 8000, 0],
}

function mpegVersionLabel(versionBits: number): string {
  if (versionBits === 3) return '1'
  if (versionBits === 2) return '2'
  if (versionBits === 0) return '2.5'
  return ''
}

/** 跳过 ID3v2 标签，返回首个可能帧头的偏移 */
function skipId3v2(bytes: Uint8Array): number {
  if (bytes.length < 10 || readAscii(bytes, 0, 3) !== 'ID3') return 0
  const size =
    ((bytes[6]! & 0x7f) << 21) |
    ((bytes[7]! & 0x7f) << 14) |
    ((bytes[8]! & 0x7f) << 7) |
    (bytes[9]! & 0x7f)
  return 10 + size
}

/**
 * 解析 MP3 首帧头：MPEG 版本 / 码率 / 采样率 / 声道数。
 * 仅支持 Layer III；找不到帧头或参数非法时抛中文错。
 */
export function parseMp3Info(bytes: Uint8Array): Mp3Info {
  const start = skipId3v2(bytes)
  let pos = -1
  const limit = Math.min(bytes.length - 3, start + 65536)
  for (let i = start; i < limit; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1]! & 0xe0) === 0xe0) {
      pos = i
      break
    }
  }
  if (pos < 0) throw new Error('未找到 MP3 音频帧：文件可能已损坏')
  const b1 = bytes[pos + 1]!
  const b2 = bytes[pos + 2]!
  const b3 = bytes[pos + 3]!
  const version = mpegVersionLabel((b1 >> 3) & 0x03)
  if (version === '') throw new Error('不支持的 MP3 MPEG 版本')
  const layer = (b1 >> 1) & 0x03
  if (layer !== 1) throw new Error('仅支持 MP3 Layer III，暂不支持该 Layer')
  const bitrateTable = version === '1' ? MP3_BITRATES['1/3']! : MP3_BITRATES['2/3']!
  const bitrateKbps = bitrateTable[(b2 >> 4) & 0x0f]!
  const sampleRateHz = MP3_SAMPLE_RATES[version]![(b2 >> 2) & 0x03]!
  if (bitrateKbps === 0 || sampleRateHz === 0)
    throw new Error('MP3 帧头参数非法（码率/采样率索引无效）')
  const channels = ((b3 >> 6) & 0x03) === 3 ? 1 : 2
  return { mpegVersion: version, bitrateKbps, sampleRateHz, channels }
}

// ---------------------------------------------------------------------------
// MP4 解析（ftyp / mvhd / tkhd）
// ---------------------------------------------------------------------------

export interface Mp4Info {
  readonly majorBrand: string
  /** 时长（秒）；读不到时为 null */
  readonly durationSec: number | null
  /** 分辨率；读不到时为 null */
  readonly width: number | null
  readonly height: number | null
}

interface BoxHeader {
  readonly size: number
  readonly type: string
  readonly headerSize: number
}

function readBoxHeader(view: DataView, bytes: Uint8Array, pos: number): BoxHeader | null {
  let size = view.getUint32(pos)
  const type = readAscii(bytes, pos + 4, 4)
  let headerSize = 8
  if (size === 1) {
    if (pos + 16 > bytes.length) return null
    const high = view.getUint32(pos + 8)
    const low = view.getUint32(pos + 12)
    if (high !== 0) return null
    size = low
    headerSize = 16
  } else if (size === 0) {
    size = bytes.length - pos
  }
  if (size < headerSize) return null
  return { size, type, headerSize }
}

function parseMvhd(view: DataView, bytes: Uint8Array, pos: number, size: number): number | null {
  if (pos + 20 > bytes.length) return null
  const version = view.getUint8(pos)
  if (version === 0) {
    const timescale = view.getUint32(pos + 12)
    const duration = view.getUint32(pos + 16)
    if (timescale === 0) return null
    return duration / timescale
  }
  if (version === 1) {
    if (pos + 32 > bytes.length || pos + size > bytes.length) return null
    const timescale = view.getUint32(pos + 20)
    const high = view.getUint32(pos + 24)
    const low = view.getUint32(pos + 28)
    if (timescale === 0 || high !== 0) return null
    return low / timescale
  }
  return null
}

function parseTkhd(
  view: DataView,
  bytes: Uint8Array,
  pos: number,
  size: number,
): { width: number; height: number } | null {
  if (pos + 84 > bytes.length || pos + size > bytes.length) return null
  const version = view.getUint8(pos)
  const base = version === 1 ? pos + 12 : pos
  const width = view.getUint32(base + 76) / 65536
  const height = view.getUint32(base + 80) / 65536
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

/**
 * 解析 MP4 头部：主品牌 / 时长（mvhd）/ 分辨率（首个 tkhd）。
 * 读不到的字段为 null，不抛错（头部切片可能不完整）。
 */
export function parseMp4Info(bytes: Uint8Array): Mp4Info {
  const view = dataView(bytes)
  let majorBrand = ''
  let durationSec: number | null = null
  let width: number | null = null
  let height: number | null = null
  let pos = 0
  while (pos + 8 <= bytes.length) {
    const header = readBoxHeader(view, bytes, pos)
    if (!header) break
    const end = Math.min(pos + header.size, bytes.length)
    const contentPos = pos + header.headerSize
    if (header.type === 'ftyp' && contentPos + 4 <= pos + header.size) {
      majorBrand = readAscii(bytes, contentPos, 4)
    } else if (header.type === 'moov') {
      let inner = contentPos
      while (inner + 8 <= end) {
        const child = readBoxHeader(view, bytes, inner)
        if (!child) break
        const childEnd = Math.min(inner + child.size, end)
        const childContent = inner + child.headerSize
        if (child.type === 'mvhd' && durationSec === null) {
          durationSec = parseMvhd(view, bytes, childContent, child.size - child.headerSize)
        } else if (child.type === 'trak' && width === null) {
          let trackPos = childContent
          while (trackPos + 8 <= childEnd) {
            const trackChild = readBoxHeader(view, bytes, trackPos)
            if (!trackChild) break
            if (trackChild.type === 'tkhd') {
              const wh = parseTkhd(
                view,
                bytes,
                trackPos + trackChild.headerSize,
                trackChild.size - trackChild.headerSize,
              )
              if (wh) {
                width = wh.width
                height = wh.height
                break
              }
            }
            trackPos += trackChild.size
          }
        }
        inner += child.size
      }
    }
    pos += header.size
  }
  return { majorBrand, durationSec, width, height }
}

// ---------------------------------------------------------------------------
// 格式化与报告
// ---------------------------------------------------------------------------

/** 字节数 → 人类可读（B / KiB / MiB / GiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
}

/** 秒数 → "83.50 秒"；null → "未知" */
export function formatDuration(sec: number | null): string {
  if (sec === null) return '未知'
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`时长非法：${String(sec)}`)
  return `${sec.toFixed(2)} 秒`
}

/** 码率 → "128 kbps" */
export function formatBitrate(kbps: number): string {
  if (!Number.isFinite(kbps) || kbps < 0) throw new Error(`码率非法：${String(kbps)}`)
  return `${kbps} kbps`
}

/** 元信息行 → 多行文本报告 */
export function buildMetadataReport(rows: ReadonlyArray<readonly [string, string]>): string {
  if (rows.length === 0) throw new Error('没有可展示的元信息')
  return rows.map(([label, value]) => `${label}：${value}`).join('\n')
}
