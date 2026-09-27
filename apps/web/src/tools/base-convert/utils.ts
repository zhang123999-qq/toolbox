import type { BaseConvertInput, BaseConvertOptions } from './schema'

/** 支持的进制集合（与 optionDefs 的 values 一致） */
const SUPPORTED_BASES = [2, 8, 10, 16, 32, 36]

const DIGIT_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'

function assertBase(value: number, name: string): void {
  if (!SUPPORTED_BASES.includes(value)) {
    throw new Error(`不支持的进制："${name}"（仅支持 2/8/10/16/32/36）`)
  }
}

/** 从源进制解析整数：BigInt 累加，任意精度 */
function parseBase(text: string, from: number): bigint {
  let digits = text
  let negative = false
  if (digits.startsWith('-')) {
    negative = true
    digits = digits.slice(1)
  }
  // 前缀仅在与 from 一致时剥离：0x↔16、0b↔2、0o↔8
  const prefixOf: Record<number, RegExp> = { 16: /^0[xX]/, 2: /^0[bB]/, 8: /^0[oO]/ }
  const prefix = prefixOf[from]
  if (prefix) digits = digits.replace(prefix, '')
  if (digits === '') throw new Error('输入不能为空')

  let value = 0n
  for (const ch of digits) {
    if (ch === '.') throw new Error('仅支持整数，不支持小数')
    const digit = DIGIT_CHARS.indexOf(ch.toLowerCase())
    if (digit < 0 || digit >= from) {
      throw new Error(`数字 "${ch}" 在 ${from} 进制下非法`)
    }
    value = value * BigInt(from) + BigInt(digit)
  }
  return negative ? -value : value
}

/** T2 同步入口 */
export function transform(input: BaseConvertInput, options: BaseConvertOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const from = Number(options.from)
  const to = Number(options.to)
  assertBase(from, options.from)
  assertBase(to, options.to)
  const value = parseBase(text, from)
  const converted = value.toString(to).toUpperCase()
  return `${text} (${from}进制) = ${converted} (${to}进制)`
}
