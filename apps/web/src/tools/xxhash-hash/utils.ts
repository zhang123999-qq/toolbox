import type { XxhashInput, XxhashOptions } from './schema'

/** 可选位宽 */
export const BITS = ['32', '64'] as const

/** 位宽校验 */
export function parseBits(value: string): string {
  if (!(BITS as readonly string[]).includes(value)) {
    throw new Error('不支持的位宽：' + value + '（可选 32 / 64）')
  }
  return value
}

/** 数值 → 固定宽度的十六进制（32 位补 8 位，64 位补 16 位） */
export function formatHex(value: number | bigint, bits: string, uppercase: boolean): string {
  const width = bits === '64' ? 16 : 8
  const hex = (typeof value === 'bigint' ? value : BigInt(value)).toString(16).padStart(width, '0')
  return uppercase ? hex.toUpperCase() : hex
}

/**
 * xxHash。
 * WASM 按需加载：只有点「运行」才去 import 模块，不占首屏体积。
 */
export async function hashXxhash(text: string, options: XxhashOptions): Promise<string> {
  const bits = parseBits(options.bits)
  const xxhash = (await import('xxhash-wasm')).default
  const hasher = await xxhash()
  const value = bits === '64' ? hasher.h64(text) : hasher.h32(text)
  return formatHex(value, bits, options.uppercase)
}

export async function transform(input: XxhashInput, options: XxhashOptions): Promise<string> {
  if (input.text === '') return ''
  return hashXxhash(input.text, options)
}
