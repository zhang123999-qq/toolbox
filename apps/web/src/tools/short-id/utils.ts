import type { ShortIdInput, ShortIdOptions } from './schema'

/** 预设字符集 */
export const CHARSETS = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  hex: '0123456789abcdef',
} as const

/** 预设字符集可选标识 */
export const CHARSET_KEYS = ['alnum', 'alpha', 'hex', 'custom'] as const
export type CharsetKey = (typeof CHARSET_KEYS)[number]

/** 易混淆字符：勾选后剔除 I/l/1、O/o/0 */
export const AMBIGUOUS = 'Il1O0o'

/** 长度合法区间 */
export const MIN_LENGTH = 4
export const MAX_LENGTH = 32

/** 取加密安全随机源 */
function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法安全生成短 ID')
  }
  return c
}

/** 无偏取整：从 [0, maxExclusive) 均匀取一个整数（拒绝采样消除模偏差） */
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

/** 解析长度选项：4–32 整数 */
export function parseLength(raw: string): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('短 ID 长度必须是整数')
  }
  const n = Number(value)
  if (n < MIN_LENGTH || n > MAX_LENGTH) {
    throw new Error(`短 ID 长度必须在 ${MIN_LENGTH} 到 ${MAX_LENGTH} 之间`)
  }
  return n
}

/** 解析并返回实际使用的字符集；custom 为空或预设非法时抛中文错；noAmbiguous 剔除易混字符 */
export function resolveCharset(options: ShortIdOptions): string {
  const key = options.charset.trim()
  let charset: string
  if (key === 'custom') {
    if (!options.customCharset || options.customCharset.length === 0) {
      throw new Error('自定义字符集不能为空')
    }
    charset = options.customCharset
  } else if ((CHARSET_KEYS as readonly string[]).includes(key)) {
    charset = CHARSETS[key as Exclude<CharsetKey, 'custom'>]
  } else {
    throw new Error('未知的字符集预设：' + key)
  }
  const filtered = options.noAmbiguous
    ? [...charset].filter((ch) => !AMBIGUOUS.includes(ch)).join('')
    : charset
  if (filtered.length === 0) {
    throw new Error('排除易混淆字符后字符集为空，请更换字符集或关闭该选项')
  }
  return filtered
}

/** 生成一个短 ID */
export function generateShortId(options: ShortIdOptions): string {
  const length = parseLength(options.length)
  const charset = resolveCharset(options)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += charset[secureRandomIndex(charset.length)]
  }
  return out
}

/** T2 入口：输入留空返回空串；输入任意内容即生成 */
export function transform(input: ShortIdInput, options: ShortIdOptions): string {
  if (input.text === '') return ''
  return generateShortId(options)
}
