import type { BinaryViewerInput, BinaryViewerOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class BinaryViewError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BinaryViewError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 1_000_000

/** 文件上限：再大的文件应该用命令行 xxd + less，浏览器里全量读进内存只会卡死标签页 */
export const MAX_FILE_BYTES = 16 * 1024 * 1024

/** 转储的字节上限：16 列时约 4000 行，再多在文本框里也翻不动了 */
export const MAX_DUMP_BYTES = 65_536

/** 每行字节数的兜底上限 */
const MAX_COLUMNS = 64

/** 常见文件签名：按字节数从长到短排列，先命中先用 */
const SIGNATURES: readonly (readonly [number[], string])[] = [
  [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'PNG 图片'],
  [[0x25, 0x50, 0x44, 0x46, 0x2d], 'PDF 文档'],
  [[0x50, 0x4b, 0x03, 0x04], 'ZIP 压缩包（docx / jar / epub / xlsx 等同族）'],
  [[0x50, 0x4b, 0x05, 0x06], 'ZIP 空归档'],
  [[0x1f, 0x8b], 'Gzip 压缩包'],
  [[0x42, 0x5a, 0x68], 'Bzip2 压缩包'],
  [[0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], 'XZ 压缩包'],
  [[0x28, 0xb5, 0x2f, 0xfd], 'Zstandard 压缩包'],
  [[0x7f, 0x45, 0x4c, 0x46], 'ELF 可执行文件'],
  [[0x4d, 0x5a], 'DOS/Windows 可执行文件（MZ）'],
  [[0xca, 0xfe, 0xba, 0xbe], 'Java class 文件或 Mach-O Fat 二进制'],
  [[0x00, 0x61, 0x73, 0x6d], 'WebAssembly 模块'],
  [[0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66], 'SQLite 数据库'],
  [[0x47, 0x49, 0x46, 0x38], 'GIF 图片'],
  [[0xff, 0xd8, 0xff], 'JPEG 图片'],
  [[0x52, 0x49, 0x46, 0x46], 'RIFF 容器（WAV / AVI / WEBP）'],
  [[0xef, 0xbb, 0xbf], 'UTF-8 带 BOM 的文本'],
  [[0xff, 0xfe], 'UTF-16LE 带 BOM 的文本'],
  [[0xfe, 0xff], 'UTF-16BE 带 BOM 的文本'],
]

/** 千分位整数 */
export function group(value: number): string {
  return value.toLocaleString('en-US')
}

/** 字节数转人类可读体积 */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

/** 行的千分位比率，保留一位小数 */
function percent(part: number, total: number): string {
  if (total === 0) return '0.0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

/** 可打印 ASCII 原样显示，其余一律 `.`：把所有不可见字符都露出来会干扰快速扫读 */
function printable(byte: number): string {
  if (byte >= 0x20 && byte <= 0x7e) return String.fromCharCode(byte)
  return '.'
}

/** 两位十六进制（小写） */
function hex2(byte: number): string {
  return byte.toString(16).padStart(2, '0')
}

/**
 * 从一段可能来自 hexdump / xxd / 网页转储的文本里还原字节。
 * 现实里的粘贴内容常带偏移列与 ASCII 栏，所以先把这两列去掉，再统一收十六进制字符。
 */
export function bytesFromHex(text: string): Uint8Array {
  const digits = text
    .split(/\r\n|\r|\n/)
    .map((line) => {
      // 去掉 `|......|` 形式的 ASCII 栏
      const withoutAscii = line.replace(/\|[^|]*\|/g, ' ')
      // 去掉行首的偏移地址（`00000000`、`0000:0010`）；要求后面还跟着字节时才删
      const withoutOffset = withoutAscii.replace(
        /^\s*[0-9a-fA-F]{4,16}[:：]?\s+(?=[0-9a-fA-F]{2})/,
        '',
      )
      return withoutOffset.replace(/[^0-9a-fA-F]/g, '')
    })
    .join('')

  if (digits === '') return new Uint8Array(0)
  if (digits.length % 2 !== 0) {
    throw new BinaryViewError(`十六进制长度必须是偶数（每 2 位一个字节），当前 ${digits.length} 位`)
  }
  const bytes = new Uint8Array(digits.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(digits.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** 文本自身的 UTF-8 字节 */
export function bytesFromText(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** 按选项得到要查看的字节 */
export function bytesOf(input: BinaryViewerInput, options: BinaryViewerOptions): Uint8Array {
  return options.direction === 'fromHex' ? bytesFromHex(input.text) : bytesFromText(input.text)
}

/**
 * 香农熵（bit/字节）：接近 8 说明数据高度随机（已压缩或已加密），
 * 远低于 8 则是文本或有大量重复结构 —— 是判断“这是不是明文”最快的单一指标。
 */
export function entropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0
  const counts = new Uint32Array(256)
  for (const byte of bytes) counts[byte] += 1
  let bits = 0
  for (const count of counts) {
    if (count === 0) continue
    const p = count / bytes.length
    bits -= p * Math.log2(p)
  }
  return bits
}

/** 字节分布统计 */
export interface ByteStats {
  readonly total: number
  readonly distinct: number
  readonly printable: number
  readonly zeros: number
  readonly highBytes: number
  readonly entropy: number
  /** 出现次数最多的三个字节，形如 `0x00 ×128` */
  readonly top: readonly string[]
}

/** 统计字节分布 */
export function statsOf(bytes: Uint8Array): ByteStats {
  const counts = new Uint32Array(256)
  let printableCount = 0
  let zeroCount = 0
  let highCount = 0
  for (const byte of bytes) {
    counts[byte] += 1
    if (byte >= 0x20 && byte <= 0x7e) printableCount += 1
    if (byte === 0x00) zeroCount += 1
    if (byte >= 0x80) highCount += 1
  }
  const top = [...counts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([value, count]) => `0x${hex2(value)} ×${count}`)

  return {
    total: bytes.length,
    distinct: [...counts].filter((count) => count > 0).length,
    printable: printableCount,
    zeros: zeroCount,
    highBytes: highCount,
    entropy: entropy(bytes),
    top,
  }
}

/** 按文件头猜一种可能的文件类型 */
export function detectMagic(bytes: Uint8Array): string {
  for (const [signature, label] of SIGNATURES) {
    if (signature.length > bytes.length) continue
    const hit = signature.every((byte, index) => bytes[index] === byte)
    if (hit) return label
  }
  return '未命中已知文件头（可能是文本或自定义格式）'
}

/** 单行的偏移量：按最大偏移宽度补零，保持列对齐 */
function offsetLabel(offset: number, width: number): string {
  return offset.toString(16).toUpperCase().padStart(Math.max(8, width), '0')
}

/**
 * 十六进制 + ASCII 双栏视图。
 * 转储行数过多时只出前 MAX_DUMP_BYTES 字节 —— 用户更关心文件头与结构，而不是几万行输出。
 */
export function dumpBytes(bytes: Uint8Array, columns: number): string {
  const width = Math.max(1, Math.min(MAX_COLUMNS, Math.floor(columns) || 16))
  const shown = Math.min(bytes.length, MAX_DUMP_BYTES)
  const scope = bytes.subarray(0, shown)
  const lines: string[] = []

  for (let offset = 0; offset < scope.length; offset += width) {
    const row = scope.subarray(offset, offset + width)
    const hexPart: string[] = []
    let asciiPart = ''
    for (const byte of row) {
      hexPart.push(hex2(byte))
      asciiPart += printable(byte)
    }
    // 末行不足 width 时用空格补足，ASCII 栏贴右对齐，读起来仍是规整的两栏
    const padded = hexPart.join(' ').padEnd(width * 3 - 1, ' ')
    lines.push(`${offsetLabel(offset, 8)}  ${padded}  |${asciiPart}|`)
  }

  if (bytes.length > shown) {
    lines.push(
      `… 仅显示前 ${group(shown)} 字节，共 ${group(bytes.length)} 字节（${humanSize(bytes.length)}）`,
    )
  }
  return lines.join('\n')
}

/** 统计区块：一行一条，便于直接看结论 */
export function formatStats(stats: ByteStats): string {
  return [
    `总字节数: ${group(stats.total)}`,
    `不同字节值: ${stats.distinct} / 256`,
    `可打印 ASCII: ${group(stats.printable)}（${percent(stats.printable, stats.total)}）`,
    `零字节 0x00: ${group(stats.zeros)}（${percent(stats.zeros, stats.total)}）`,
    `高位字节 ≥ 0x80: ${group(stats.highBytes)}（${percent(stats.highBytes, stats.total)}）`,
    `香农熵: ${stats.entropy.toFixed(2)} bit/字节`,
    `最高频字节: ${stats.top.join('  ') || '（无）'}`,
  ].join('\n')
}

/** 完整报告：来源说明 + 统计 + 类型线索 + 双栏视图 */
export function describeBytes(
  source: string,
  bytes: Uint8Array,
  options: BinaryViewerOptions,
): string {
  if (bytes.length === 0) return source === '' ? '' : `${source}\n\n字节数为 0，没有可查看的内容。`
  const stats = statsOf(bytes)
  return [
    source,
    '',
    '== 字节统计 ==',
    formatStats(stats),
    '',
    '== 文件类型线索 ==',
    detectMagic(bytes),
    '',
    '== 十六进制视图 ==',
    dumpBytes(bytes, Number(options.columns)),
  ].join('\n')
}

/** 文本模式：说明来源是粘贴内容 */
export function transform(input: BinaryViewerInput, options: BinaryViewerOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new BinaryViewError('输入超过 1,000,000 字符上限')
  }

  const bytes = bytesOf(input, options)
  const source =
    options.direction === 'fromHex'
      ? `来源：粘贴的十六进制文本（还原出 ${group(bytes.length)} 字节）`
      : `来源：输入文本的 UTF-8 字节（${group(bytes.length)} 字节）`
  return describeBytes(source, bytes, options)
}

/**
 * 文件模式：把 File 读成字节后产出同一份报告。
 * 读文件只能在 Tool.tsx 拿到 File 之后发生；utils 只提供「字节 → 报告」这条纯路径。
 */
export async function describeFile(file: File, options: BinaryViewerOptions): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new BinaryViewError(
      `文件过大：${humanSize(file.size)}，超过 ${humanSize(MAX_FILE_BYTES)} 上限（大文件请用命令行 xxd）`,
    )
  }
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new BinaryViewError(`读取文件失败：${file.name} 可能无法访问或已被移动`)
  }
  const bytes = new Uint8Array(buffer)
  const source = `文件：${file.name}\n类型：${file.type === '' ? '（未提供）' : file.type}\n大小：${group(file.size)} 字节（${humanSize(file.size)}）`
  return describeBytes(source, bytes, options)
}
