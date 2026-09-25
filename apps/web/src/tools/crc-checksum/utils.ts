import type { CrcInput, CrcOptions } from './schema'

/** 支持的算法（全部是参数完全确定的常见变体） */
export const ALGORITHMS = ['crc32', 'crc32c', 'crc16-modbus', 'crc16-ccitt'] as const

/** 支持的输出进制 */
export const MODES = ['hex', 'dec'] as const

/** 反射式多项式（用于 CRC-32 / CRC-32C / CRC-16/MODBUS）：每次处理最低位 */
function buildReflectedTable(polynomial: number): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let crc = n
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? polynomial ^ (crc >>> 1) : crc >>> 1
    }
    table[n] = crc >>> 0
  }
  return table
}

/** 普通式多项式（用于 CRC-16/CCITT-FALSE）：每次处理最高位 */
function buildNormalTable(polynomial: number): Uint16Array {
  const table = new Uint16Array(256)
  for (let n = 0; n < 256; n += 1) {
    let crc = n << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ polynomial) & 0xffff : (crc << 1) & 0xffff
    }
    table[n] = crc
  }
  return table
}

/** 四张查找表在模块加载时一次性算好（纯计算，不涉及随机数） */
const CRC32_TABLE = buildReflectedTable(0xedb88320) // CRC-32/IEEE，poly 反向写法
const CRC32C_TABLE = buildReflectedTable(0x82f63b78) // CRC-32C/Castagnoli，poly 反向写法
const CRC16_MODBUS_TABLE = buildReflectedTable(0xa001) // CRC-16/MODBUS，poly 0x8005 反向写法
const CRC16_CCITT_TABLE = buildNormalTable(0x1021) // CRC-16/CCITT-FALSE，poly 0x1021

/** 反射式双字算法（CRC-32 / CRC-32C）：init 全 1，收尾再取反 */
function crc32Like(table: Uint32Array, bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

/** CRC-32（IEEE 802.3，zlib / gzip / PNG 用的就是它） */
export function crc32(bytes: Uint8Array): number {
  return crc32Like(CRC32_TABLE, bytes)
}

/** CRC-32C（Castagnoli，iSCSI / ext4 / SSE4.2 硬件指令） */
export function crc32c(bytes: Uint8Array): number {
  return crc32Like(CRC32C_TABLE, bytes)
}

/** CRC-16/MODBUS：反射式，init 0xFFFF，无 xorout */
export function crc16Modbus(bytes: Uint8Array): number {
  let crc = 0xffff
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC16_MODBUS_TABLE[(crc ^ byte) & 0xff]
  return crc & 0xffff
}

/** CRC-16/CCITT-FALSE：普通式，init 0xFFFF，无 xorout */
export function crc16Ccitt(bytes: Uint8Array): number {
  let crc = 0xffff
  for (const byte of bytes) {
    crc = ((crc << 8) ^ CRC16_CCITT_TABLE[((crc >>> 8) ^ byte) & 0xff]) & 0xffff
  }
  return crc
}

/** 按算法名计算校验和；参数组已固定，因此不需要「字节反射」之类可调选项 */
export function compute(algorithm: string, bytes: Uint8Array): number {
  switch (algorithm) {
    case 'crc32':
      return crc32(bytes)
    case 'crc32c':
      return crc32c(bytes)
    case 'crc16-modbus':
      return crc16Modbus(bytes)
    case 'crc16-ccitt':
      return crc16Ccitt(bytes)
    default:
      throw new Error('不支持的校验算法：' + algorithm)
  }
}

/** 数值 → 输出字符串：hex 带 0x 前缀并按位宽补零，dec 用十进制 */
export function format(algorithm: string, mode: string, value: number): string {
  if (mode === 'hex') {
    const width = algorithm.startsWith('crc32') ? 8 : 4
    return '0x' + value.toString(16).toUpperCase().padStart(width, '0')
  }
  if (mode === 'dec') return String(value)
  throw new Error('不支持的输出格式：' + mode)
}

export function transform(input: CrcInput, options: CrcOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const bytes = new TextEncoder().encode(input.text)
  return format(options.algorithm, options.mode, compute(options.algorithm, bytes))
}
