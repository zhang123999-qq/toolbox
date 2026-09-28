/**
 * video-format —— 视频格式识别的纯函数层
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
  /** 格式代号：mp4 / mov / webm / mkv / avi / flv / ts / wmv / ogv / unknown */
  readonly kind: string
  /** 中文名，如“MP4 视频” */
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

/** ASF 容器 GUID（WMV）：30 26 B2 75 8E 66 CF 11 A6 D9 00 AA 00 62 CE 6C */
const ASF_GUID = [
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00, 0x62, 0xce, 0x6c,
] as const

function isAsf(data: Uint8Array): boolean {
  if (data.length < ASF_GUID.length) return false
  return ASF_GUID.every((b, i) => data[i] === b)
}

/** ftyp 主品牌是否可读（4 个可打印 ASCII） */
function readableBrand(data: Uint8Array): string {
  const raw = String.fromCharCode(data[8]!, data[9]!, data[10]!, data[11]!)
  return /^[\x20-\x7E]{4}$/.test(raw) && raw.trim() !== '' ? raw.trim() : '(不可读)'
}

/** MP4 系主品牌（ISO 基础媒体文件格式） */
const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso5',
  'iso6',
  'mp41',
  'mp42',
  'avc1',
  'dash',
  'mmp4',
  'M4V',
  'M4A',
])

/**
 * EBML 头里找 DocType：扫描 0x42 0x82 后跟 1 字节 vint 长度，再读 ASCII。
 * 找到返回 'webm' / 'matroska' / 其他字符串；找不到返回 null。
 */
function findEbmlDocType(data: Uint8Array): string | null {
  for (let i = 0; i + 3 < data.length; i++) {
    if (data[i] === 0x42 && data[i + 1] === 0x82) {
      const sizeByte = data[i + 2]!
      // 只处理 1 字节 vint（首位为 1）：长度 = sizeByte & 0x7F
      if ((sizeByte & 0x80) === 0) return null
      const len = sizeByte & 0x7f
      if (len === 0 || len > 16 || i + 3 + len > data.length) return null
      let s = ''
      for (let j = 0; j < len; j++) s += String.fromCharCode(data[i + 3 + j]!)
      return s
    }
  }
  return null
}

/**
 * 从文件头魔数识别视频格式（纯函数）。
 * 空文件抛中文错；识别不出返回 known=false 的“未知格式”，detail 说明原因。
 */
export function detectVideoFormat(data: Uint8Array): FormatGuess {
  if (data.length === 0) throw new Error('文件为空：没有可识别的内容')

  // MP4 / MOV / 3GP：size(4) + 'ftyp' + 主品牌(4)
  if (asciiAt(data, 4, 'ftyp')) {
    if (data.length < 12) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: 'ftyp 盒子不完整（不足 12 字节），疑似 MP4/MOV 视频',
      }
    }
    const brand = readableBrand(data)
    if (brand === 'qt') {
      return { known: true, kind: 'mov', label: 'MOV 视频', detail: 'ftyp 主品牌：qt（QuickTime）' }
    }
    if (brand === '3gp4' || brand === '3gp5' || brand === '3g2a' || brand === '3g2b') {
      return { known: true, kind: 'mp4', label: '3GP 视频', detail: `ftyp 主品牌：${brand}` }
    }
    if (MP4_BRANDS.has(brand)) {
      return { known: true, kind: 'mp4', label: 'MP4 视频', detail: `ftyp 主品牌：${brand}` }
    }
    return {
      known: true,
      kind: 'mp4',
      label: 'MP4 系视频',
      detail: `ftyp 主品牌：${brand}（ISO 基础媒体文件格式，未在常见品牌表内）`,
    }
  }

  // WebM / MKV：EBML 头 0x1A 0x45 0xDF 0xA3
  if (
    data.length >= 4 &&
    data[0] === 0x1a &&
    data[1] === 0x45 &&
    data[2] === 0xdf &&
    data[3] === 0xa3
  ) {
    const docType = findEbmlDocType(data)
    if (docType === 'webm') {
      return { known: true, kind: 'webm', label: 'WebM 视频', detail: 'EBML 头，DocType=webm' }
    }
    if (docType === 'matroska') {
      return { known: true, kind: 'mkv', label: 'MKV 视频', detail: 'EBML 头，DocType=matroska' }
    }
    return {
      known: true,
      kind: 'mkv',
      label: 'MKV/WebM 系视频',
      detail:
        docType === null
          ? 'EBML 头（文件头内未找到 DocType 元素）'
          : `EBML 头，DocType=${docType}（非常见 webm/matroska）`,
    }
  }

  // AVI：RIFF....AVI
  if (asciiAt(data, 0, 'RIFF')) {
    if (data.length < 12 || !asciiAt(data, 8, 'AVI ')) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: '文件以 RIFF 开头但不是 AVI 容器（或文件头不足 12 字节）',
      }
    }
    return { known: true, kind: 'avi', label: 'AVI 视频', detail: 'RIFF/AVI 容器' }
  }

  // FLV：'FLV' + 版本 0x01
  if (asciiAt(data, 0, 'FLV')) {
    if (data.length < 4 || data[3] !== 0x01) {
      return {
        known: false,
        kind: 'unknown',
        label: '未知格式',
        detail: '文件以 FLV 开头但版本号不是 0x01（或文件头不足 4 字节）',
      }
    }
    return { known: true, kind: 'flv', label: 'FLV 视频', detail: 'FLV 文件头（版本 1）' }
  }

  // WMV：ASF GUID
  if (isAsf(data)) {
    return { known: true, kind: 'wmv', label: 'WMV 视频', detail: 'ASF 容器 GUID' }
  }

  // MPEG-TS：0x47 同步字节（188 字节包长，校验第二个包头提高置信度）
  if (data.length >= 1 && data[0] === 0x47) {
    const confident = data.length > 188 && data[188] === 0x47
    return {
      known: true,
      kind: 'ts',
      label: 'TS 视频流',
      detail: confident
        ? 'MPEG-TS 同步字节 0x47（188 字节包对齐已确认）'
        : '首字节为 MPEG-TS 同步字节 0x47（文件头过短，未做包对齐确认）',
    }
  }

  // Ogg 视频：OggS
  if (asciiAt(data, 0, 'OggS')) {
    return { known: true, kind: 'ogv', label: 'Ogg 视频', detail: 'OggS 容器（Theora 等）' }
  }

  return {
    known: false,
    kind: 'unknown',
    label: '未知格式',
    detail: '文件头与已知视频格式魔数均不匹配（MP4/MOV/WebM/MKV/AVI/FLV/TS/WMV/Ogg）',
  }
}

/** 识别报告：文件名 + 大小 + 识别结果 */
export function formatReport(fileName: string, fileSize: number, guess: FormatGuess): string {
  const lines = [`文件：${fileName}`, `大小：${formatBytes(fileSize)}`, `识别结果：${guess.label}`]
  if (guess.detail) lines.push(`依据：${guess.detail}`)
  return lines.join('\n')
}
