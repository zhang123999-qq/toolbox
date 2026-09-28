/**
 * audio-format —— 音频格式识别的纯函数层
 *
 * 只看文件头魔数，不解码、不触碰浏览器 API，可在 node 下被 vitest 完整测试。
 * 调用方只需传入文件前 64 字节（HEADER_BYTES）。
 */

/** 识别所需的文件头字节数 */
export const HEADER_BYTES = 64

/** 格式识别结果 */
export interface FormatGuess {
  /** 是否识别出已知格式 */
  readonly known: boolean
  /** 格式代号：wav / mp3 / flac / ogg / m4a / aac / wma / aiff / unknown */
  readonly kind: string
  /** 中文名，如“WAV 音频” */
  readonly label: string
  /** 补充说明，如魔数依据、截断提示 */
  readonly detail: string
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

/** ASCII 标记匹配：data[offset..offset+text.length) 是否等于 text（offset 恒 ≥ 0） */
function asciiAt(data: Uint8Array, offset: number, text: string): boolean {
  if (offset + text.length > data.length) return false
  for (let i = 0; i < text.length; i++) {
    if (data[offset + i] !== text.charCodeAt(i)) return false
  }
  return true
}

/** ASF 容器 GUID（WMA）：30 26 B2 75 8E 66 CF 11 A6 D9 00 AA 00 62 CE 6C */
const ASF_GUID = [
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
] as const

function isAsf(data: Uint8Array): boolean {
  if (data.length < ASF_GUID.length) return false
  return ASF_GUID.every((b, i) => data[i] === b)
}

/**
 * 从文件头魔数识别音频格式（纯函数）。
 * 空文件抛中文错；识别不出返回 known=false 的“未知格式”，detail 说明原因。
 */
export function detectAudioFormat(data: Uint8Array): FormatGuess {
  if (data.length === 0) throw new Error('文件为空：没有可识别的内容')

  // WAV：RIFF....WAVE
  if (asciiAt(data, 0, 'RIFF')) {
    if (data.length < 12 || !asciiAt(data, 8, 'WAVE')) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: '文件以 RIFF 开头但不是 WAVE 容器（或文件头不足 12 字节），无法确认为 WAV 音频',
      }
    }
    return { known: true, kind: 'wav', label: 'WAV 音频', detail: 'RIFF/WAVE 容器（通常为 PCM）' }
  }

  // MP3：ID3v2 标签
  if (asciiAt(data, 0, 'ID3')) {
    if (data.length < 10) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: '文件以 ID3 开头但标签头不足 10 字节，疑似 MP3（ID3v2 标签不完整）',
      }
    }
    return { known: true, kind: 'mp3', label: 'MP3 音频', detail: 'ID3v2 标签头' }
  }

  // FLAC：fLaC
  if (asciiAt(data, 0, 'fLaC')) {
    return { known: true, kind: 'flac', label: 'FLAC 音频', detail: 'fLaC 魔数（无损压缩）' }
  }

  // Ogg：OggS（Vorbis / Opus / FLAC 都可能装在 Ogg 里）
  if (asciiAt(data, 0, 'OggS')) {
    return { known: true, kind: 'ogg', label: 'Ogg 音频', detail: 'OggS 容器（Vorbis / Opus 等）' }
  }

  // M4A/MP4 音频：size(4) + 'ftyp' + 主品牌(4)
  if (asciiAt(data, 4, 'ftyp')) {
    if (data.length < 12) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: 'ftyp 盒子不完整（不足 12 字节），疑似 M4A/MP4 音频',
      }
    }
    const raw = String.fromCharCode(data[8]!, data[9]!, data[10]!, data[11]!)
    if (raw === 'M4A ' || raw === 'm4a ') {
      return { known: true, kind: 'm4a', label: 'M4A 音频', detail: `ftyp 主品牌：${raw.trim()}` }
    }
    const brand = /^[\x20-\x7E]{4}$/.test(raw) && raw.trim() !== '' ? raw.trim() : '(不可读)'
    return {
      known: true,
      kind: 'm4a',
      label: 'M4A/MP4 音频',
      detail: `ftyp 主品牌：${brand}（ISO 基础媒体文件格式）`,
    }
  }

  // WMA：ASF GUID
  if (isAsf(data)) {
    return { known: true, kind: 'wma', label: 'WMA 音频', detail: 'ASF 容器 GUID' }
  }

  // AIFF：FORM....AIFF
  if (asciiAt(data, 0, 'FORM')) {
    if (data.length < 12 || !asciiAt(data, 8, 'AIFF')) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: '文件以 FORM 开头但不是 AIFF（或文件头不足 12 字节）',
      }
    }
    return { known: true, kind: 'aiff', label: 'AIFF 音频', detail: 'FORM/AIFF 容器' }
  }

  // AAC：ADTS 帧同步 0xFFF + layer 00（区别于 MP3 的 layer 非 00）
  if (
    data.length >= 2 &&
    data[0] === 0xff &&
    (data[1]! & 0xf0) === 0xf0 &&
    (data[1]! & 0x06) === 0
  ) {
    return { known: true, kind: 'aac', label: 'AAC 音频', detail: 'ADTS 帧同步字（无 ID3 标签）' }
  }

  // MP3：帧同步 0xFFE + 版本/层非保留值（无 ID3 标签的裸 MP3 流）
  if (
    data.length >= 2 &&
    data[0] === 0xff &&
    (data[1]! & 0xe0) === 0xe0 &&
    (data[1]! & 0x18) !== 0x08 &&
    (data[1]! & 0x06) !== 0
  ) {
    return { known: true, kind: 'mp3', label: 'MP3 音频', detail: 'MPEG 音频帧同步（无 ID3 标签）' }
  }

  return {
    known: false,
    kind: 'unknown',
    label: '未知格式',
    detail: '文件头与已知音频格式魔数均不匹配（WAV/MP3/FLAC/Ogg/M4A/AAC/WMA/AIFF）',
  }
}

/** 识别报告：文件名 + 大小 + 识别结果 */
export function formatReport(fileName: string, fileSize: number, guess: FormatGuess): string {
  const lines = [`文件：${fileName}`, `大小：${formatBytes(fileSize)}`, `识别结果：${guess.label}`]
  if (guess.detail) lines.push(`依据：${guess.detail}`)
  return lines.join('\n')
}
