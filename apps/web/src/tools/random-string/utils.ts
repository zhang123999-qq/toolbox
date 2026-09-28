import type { RandomStringInput, RandomStringOptions } from './schema'

/** 预设字符集 */
export const CHARSETS = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numeric: '0123456789',
  hex: '0123456789abcdef',
  base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
} as const

/** 预设字符集的可选标识 */
export const CHARSET_KEYS = [
  'alnum',
  'alpha',
  'lower',
  'upper',
  'numeric',
  'hex',
  'base64',
  'custom',
] as const
export type CharsetKey = (typeof CHARSET_KEYS)[number]

/** 长度合法区间 */
export const MIN_LENGTH = 1
export const MAX_LENGTH = 512

/** 取加密安全随机源 */
function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法安全生成')
  }
  return c
}

/**
 * 无偏取整：从 [0, maxExclusive) 均匀取一个整数（拒绝采样消除模偏差）。
 * 本工具字符集长度均 <= 64，单字节足够。
 */
export function secureRandomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('字符集不能为空')
  const c = getCrypto()
  const limit = Math.floor(256 / maxExclusive) * maxExclusive
  const buf = new Uint8Array(1)
  let value: number
  do {
    c.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % maxExclusive
}

/** 解析长度选项：1–512 整数 */
export function parseLength(raw: string): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('字符串长度必须是整数')
  }
  const n = Number(value)
  if (n < MIN_LENGTH || n > MAX_LENGTH) {
    throw new Error(`字符串长度必须在 ${MIN_LENGTH} 到 ${MAX_LENGTH} 之间`)
  }
  return n
}

/** 解析并返回实际使用的字符集；custom 为空或预设非法时抛中文错 */
export function resolveCharset(options: RandomStringOptions): string {
  const key = options.charset.trim()
  if (key === 'custom') {
    const custom = options.customCharset
    if (!custom || custom.length === 0) {
      throw new Error('自定义字符集不能为空')
    }
    return custom
  }
  if (!(CHARSET_KEYS as readonly string[]).includes(key)) {
    throw new Error('未知的字符集预设：' + key)
  }
  return CHARSETS[key as Exclude<CharsetKey, 'custom'>]
}

/** 生成指定长度的随机字符串，字符全部来自解析出的字符集 */
export function generateString(options: RandomStringOptions): string {
  const length = parseLength(options.length)
  const charset = resolveCharset(options)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += charset[secureRandomIndex(charset.length)]
  }
  return out
}

/** T2 入口：输入留空返回空串；输入任意内容即生成 */
export function transform(input: RandomStringInput, options: RandomStringOptions): string {
  if (input.text === '') return ''
  return generateString(options)
}
