import type { NanoidInput, NanoidOptions } from './schema'

/** 默认 URL 安全字母表：A–Z a–z 0–9 _ -（共 64 个） */
export const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

/** 长度合法区间 */
export const MIN_LENGTH = 1
export const MAX_LENGTH = 64

/** 取加密安全随机源 */
function getCrypto(): Crypto {
  const c = globalThis.crypto
  if (!c?.getRandomValues) {
    throw new Error('当前环境不支持 crypto.getRandomValues，无法安全生成 ID')
  }
  return c
}

/**
 * 无偏取整：从 [0, maxExclusive) 均匀取一个整数（拒绝采样消除模偏差）。
 * 默认字母表 64 个，单字节无拒绝；自定义字母表经 zod 限制在 200 字符内，单字节足够。
 */
export function secureRandomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('字母表不能为空')
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

/** 解析长度选项：1–64 整数 */
export function parseLength(raw: string): number {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) {
    throw new Error('ID 长度必须是整数')
  }
  const n = Number(value)
  if (n < MIN_LENGTH || n > MAX_LENGTH) {
    throw new Error(`ID 长度必须在 ${MIN_LENGTH} 到 ${MAX_LENGTH} 之间`)
  }
  return n
}

/** 解析字母表：默认 URL 安全字母表；为空抛错 */
export function resolveAlphabet(options: NanoidOptions): string {
  const alphabet = options.alphabet
  if (!alphabet || alphabet.length === 0) {
    throw new Error('字母表不能为空')
  }
  return alphabet
}

/** 生成一个 NanoID 风格随机 ID */
export function generateNanoId(options: NanoidOptions): string {
  const length = parseLength(options.length)
  const alphabet = resolveAlphabet(options)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[secureRandomIndex(alphabet.length)]
  }
  return out
}

/** T2 入口：输入留空返回空串；输入任意内容即生成 */
export function transform(input: NanoidInput, options: NanoidOptions): string {
  if (input.text === '') return ''
  return generateNanoId(options)
}
