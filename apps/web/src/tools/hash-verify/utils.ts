import type { HashVerifyInput, HashVerifyOptions } from './schema'

export const ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'] as const
export type Algorithm = (typeof ALGORITHMS)[number]

export const FORMATS = ['text', 'hex'] as const
export type DataFormat = (typeof FORMATS)[number]

/** 算法 → 期望 hex 长度 */
const DIGEST_HEX_LEN: Record<Algorithm, number> = {
  'SHA-1': 40,
  'SHA-256': 64,
  'SHA-384': 96,
  'SHA-512': 128,
}

/** digest 函数类型：默认走 WebCrypto，测试可注入 */
export type DigestFn = (algo: Algorithm, data: Uint8Array) => Promise<Uint8Array>

async function webCryptoDigest(algo: Algorithm, data: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 WebCrypto')
  }
  const buf = await crypto.subtle.digest(algo, data as BufferSource)
  return new Uint8Array(buf)
}

export function bytesToHex(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s
}

/** 解析输入数据：text=原文 UTF-8，hex=hex 字节串 */
export function parseData(text: string, format: DataFormat): Uint8Array {
  if (format === 'text') return new TextEncoder().encode(text)
  const h = text.trim().startsWith('0x') || text.trim().startsWith('0X') ? text.trim().slice(2) : text.trim()
  const clean = h.replace(/\s+/g, '')
  if (clean === '') throw new Error('hex 输入为空')
  if (clean.length % 2 !== 0) throw new Error('hex 长度须为偶数')
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('hex 含非法字符')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

/** 规范化期望哈希：去空白 / 0x / 转小写 */
export function normalizeHash(hash: string): string {
  return hash.replace(/\s+/g, '').replace(/^0x/i, '').toLowerCase()
}

export interface VerifyResult {
  readonly match: boolean
  readonly actual: string
  readonly expected: string
  readonly algo: Algorithm
  readonly note?: string
}

/**
 * 校验哈希。digestFn 可注入（测试用），默认 WebCrypto。
 * 期望哈希长度与算法不符时直接判不匹配并给出提示，不抛错。
 */
export async function verifyHash(
  input: HashVerifyInput,
  options: HashVerifyOptions,
  digestFn: DigestFn = webCryptoDigest,
): Promise<VerifyResult> {
  const data = parseData(input.text, options.format)
  const expected = normalizeHash(options.expected)
  if (expected === '') throw new Error('期望哈希不能为空')
  if (!/^[0-9a-f]*$/.test(expected)) throw new Error('期望哈希含非法 hex 字符')
  const actual = bytesToHex(await digestFn(options.algo, data))
  if (expected.length !== DIGEST_HEX_LEN[options.algo]) {
    return {
      match: false,
      actual,
      expected,
      algo: options.algo,
      note: `期望哈希长度 ${expected.length} 与 ${options.algo} 应有长度 ${DIGEST_HEX_LEN[options.algo]} 不符`,
    }
  }
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  return { match: diff === 0, actual, expected, algo: options.algo }
}
