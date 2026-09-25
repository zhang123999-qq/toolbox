import type { Blake3Input, Blake3Options } from './schema'

/** 可选输出长度（字节） */
export const LENGTHS = ['32', '64'] as const

/** 字节 → 十六进制 */
export function toHex(bytes: Uint8Array, uppercase: boolean): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return uppercase ? out.toUpperCase() : out
}

/** 长度校验 */
export function parseLength(value: string): number {
  if (!(LENGTHS as readonly string[]).includes(value)) {
    throw new Error('不支持的输出长度：' + value + '（可选 32 / 64 字节）')
  }
  return Number(value)
}

/**
 * BLAKE3 摘要。
 * WASM 体积不小，故**按需动态 import**：只有真正点了运行才会去加载模块。
 */
export async function hashBlake3(text: string, options: Blake3Options): Promise<string> {
  const length = parseLength(options.length)
  const blake3 = await import('blake3-wasm')
  const digest = await blake3.hash(text, { length })
  return toHex(new Uint8Array(digest), options.uppercase)
}

export async function transform(input: Blake3Input, options: Blake3Options): Promise<string> {
  if (input.text === '') return ''
  return hashBlake3(input.text, options)
}
