import type { UlidInput, UlidOptions } from './schema'

/** Crockford Base32 字母表：排除 I、L、O、U，全大写 */
export const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

/** 数量合法区间 */
export const MIN_COUNT = 1
export const MAX_COUNT = 100

/** ULID 固定长度（字符数）：48bit 时间戳 + 80bit 随机 = 128bit，编码为 26 个 Base32 字符 */
export const ULID_LENGTH = 26

/** 取加密安全随机源 */
function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法生成 ULID')
  }
  return c
}

/** 解析数量选项：1–100 整数 */
export function parseCount(raw: string): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('生成数量必须是整数')
  }
  const n = Number(value)
  if (n < MIN_COUNT || n > MAX_COUNT) {
    throw new Error(`生成数量必须在 ${MIN_COUNT} 到 ${MAX_COUNT} 之间`)
  }
  return n
}

/**
 * 把 16 字节大端缓冲区（前 6 字节 = 48bit 时间戳，后 10 字节 = 80bit 随机）
 * 编码为 26 个 Crockford Base32 字符。整个 128bit 视作一个大整数，
 * 最高位优先输出；因 130bit = 26×5，前补 2 个零位。
 */
export function encodeUlid(timestampMs: number, randomBytes: Uint8Array): string {
  const bytes = new Uint8Array(16)
  // 时间戳写入前 6 字节（大端）
  let t = BigInt(Math.floor(timestampMs))
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = Number(t & 0xffn)
    t >>= 8n
  }
  // 随机数写入后 10 字节
  for (let i = 0; i < 10; i += 1) {
    bytes[6 + i] = randomBytes[i] ?? 0
  }
  // 位流编码：前补 2 个零位凑满 130bit
  let out = ''
  let buffer = 0
  let bits = 2
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i]
    for (let b = 7; b >= 0; b -= 1) {
      buffer = (buffer << 1) | ((byte >> b) & 1)
      bits += 1
      if (bits === 5) {
        out += CROCKFORD[buffer]
        buffer = 0
        bits = 0
      }
    }
  }
  return out
}

/** 生成单个 ULID：时间戳取 Date.now()，随机 80bit 取 crypto.getRandomValues */
export function generateUlid(): string {
  const randomBytes = new Uint8Array(10)
  getCrypto().getRandomValues(randomBytes)
  return encodeUlid(Date.now(), randomBytes)
}

/** 生成 count 个 ULID */
export function generateUlids(options: UlidOptions): string[] {
  const count = parseCount(options.count)
  const list: string[] = []
  for (let i = 0; i < count; i += 1) {
    list.push(generateUlid())
  }
  return list
}

/** T2 入口：输入留空返回空串；否则每行一个 ULID */
export function transform(input: UlidInput, options: UlidOptions): string {
  if (input.text === '') return ''
  return generateUlids(options).join('\n')
}
