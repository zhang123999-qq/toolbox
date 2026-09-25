import type { ChecksumInput, ChecksumOptions } from './schema'

/** 可选算法（与 schema、Tool.tsx 保持一致） */
export const ALGORITHMS = ['sum8', 'sum16', 'sum32', 'xor8', 'mod256', 'luhn'] as const

/** 算法说明：输出里附一行，避免「算出来了但不知道算的是什么」 */
export const DESCRIPTIONS: Record<string, string> = {
  sum8: '8 位累加和（各字节相加后 mod 256）',
  sum16: '16 位累加和（按大端 16 位字累加后 mod 65536，末字节补 0）',
  sum32: '32 位累加和（按大端 32 位字累加后 mod 2^32，末字节补 0）',
  xor8: '8 位异或（各字节依次 XOR）',
  mod256: '8 位补码校验和（256 − 累加和，常用于校验帧尾）',
  luhn: 'Luhn 校验位（银行卡 / 身份证号常用的模 10 算法）',
}

/** 算法校验 */
export function requireAlgorithm(algorithm: string): string {
  if (!(ALGORITHMS as readonly string[]).includes(algorithm)) {
    throw new Error('不支持的算法：' + algorithm + '（可选 ' + ALGORITHMS.join(' / ') + '）')
  }
  return algorithm
}

/** UTF-8 字节 */
export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** 8 位累加和 */
export function sum8(bytes: Uint8Array): number {
  let sum = 0
  for (const byte of bytes) sum = (sum + byte) & 0xff
  return sum
}

/** 16 位累加和：按大端 16 位字累加；末尾落单的字节后面补 0 */
export function sum16(bytes: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 2) {
    const word = ((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0)
    sum = (sum + word) & 0xffff
  }
  return sum
}

/** 32 位累加和：按大端 32 位字累加；不足 4 字节的尾部补 0 */
export function sum32(bytes: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 4) {
    const word =
      (((bytes[i] ?? 0) << 24) |
        ((bytes[i + 1] ?? 0) << 16) |
        ((bytes[i + 2] ?? 0) << 8) |
        (bytes[i + 3] ?? 0)) >>>
      0
    sum = (sum + word) >>> 0
  }
  return sum
}

/** 8 位异或 */
export function xor8(bytes: Uint8Array): number {
  let value = 0
  for (const byte of bytes) value = (value ^ byte) & 0xff
  return value
}

/** 8 位补码校验和：256 − 累加和（mod 256） */
export function mod256(bytes: Uint8Array): number {
  return (256 - sum8(bytes)) & 0xff
}

/** 数字 → 固定宽度十六进制 */
export function toHex(value: number, width: number, uppercase: boolean): string {
  const hex = value.toString(16).padStart(width, '0')
  return uppercase ? hex.toUpperCase() : hex
}

/**
 * Luhn 校验位。
 * 从右往左，偶数位（第 2、4、6… 位，从 1 开始数）乘 2 后若大于 9 则减 9，
 * 全部相加后取 (10 − 和 mod 10) mod 10。
 */
export function luhnCheckDigit(input: string): number {
  const digits = input.replace(/\s+/g, '')
  if (digits === '') throw new Error('Luhn 需要数字串，当前为空')
  if (!/^\d+$/.test(digits)) throw new Error('Luhn 只接受数字，请去掉字母与符号')
  let sum = 0
  let double = true
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48
    if (double) {
      value *= 2
      if (value > 9) value -= 9
    }
    sum += value
    double = !double
  }
  return (10 - (sum % 10)) % 10
}

/** 按算法算出校验和，返回 { value, note } */
export function compute(text: string, options: ChecksumOptions): { value: string; note: string } {
  const algorithm = requireAlgorithm(options.algorithm)
  const bytes = utf8Bytes(text)
  switch (algorithm) {
    case 'sum8':
      return { value: toHex(sum8(bytes), 2, options.uppercase), note: '8 位累加和（sum8）' }
    case 'sum16':
      return { value: toHex(sum16(bytes), 4, options.uppercase), note: '16 位累加和（sum16）' }
    case 'sum32':
      return { value: toHex(sum32(bytes), 8, options.uppercase), note: '32 位累加和（sum32）' }
    case 'xor8':
      return { value: toHex(xor8(bytes), 2, options.uppercase), note: '8 位异或（xor8）' }
    case 'mod256':
      return { value: toHex(mod256(bytes), 2, options.uppercase), note: '8 位补码校验和（mod256）' }
    default:
      return { value: String(luhnCheckDigit(text)), note: 'Luhn 校验位' }
  }
}

export function transform(input: ChecksumInput, options: ChecksumOptions): string {
  if (input.text === '') return ''
  const { value, note } = compute(input.text, options)
  return `${value}\n\n${note}｜${DESCRIPTIONS[requireAlgorithm(options.algorithm)] ?? ''}｜${utf8Bytes(input.text).length} 字节（UTF-8）`
}
