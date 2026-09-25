import type { BinaryInput, BinaryOptions } from './schema'

/**
 * 各进制允许的数字表（小写）。校验与求值共用同一份，
 * 避免「校验通过但求值时按另一套字符解释」这类不一致。
 */
const DIGITS: Record<number, string> = {
  2: '01',
  8: '01234567',
  10: '0123456789',
  16: '0123456789abcdef',
}

const RADIX: Record<string, number> = { '2': 2, '8': 8, '10': 10, '16': 16 }

/** 去掉正负号并逐字符校验；返回符号与（小写化的）纯数字部分 */
function splitDigits(raw: string, radix: number): { negative: boolean; digits: string } {
  let body = raw
  let negative = false
  if (body.startsWith('-') || body.startsWith('+')) {
    negative = body.startsWith('-')
    body = body.slice(1)
  }
  const alphabet = DIGITS[radix] ?? ''
  const lower = body.toLowerCase()
  for (const ch of lower) {
    if (!alphabet.includes(ch)) {
      throw new Error(`字符“${ch}”不是合法的 ${radix} 进制数字`)
    }
  }
  return { negative, digits: lower }
}

/**
 * 数字串 → BigInt：逐位累乘，长度再长也不会溢出（任意精度）。
 * 刻意不用 Number / parseInt：它们会在超过 2^53 时静默丢精度。
 */
export function parseRadix(digits: string, radix: number): bigint {
  const alphabet = DIGITS[radix] ?? ''
  const base = BigInt(radix)
  let value = 0n
  for (const ch of digits) {
    value = value * base + BigInt(alphabet.indexOf(ch))
  }
  return value
}

/** BigInt → 指定进制的绝对值字符串（字母用小写），符号由调用方处理 */
function toUnsignedRadix(value: bigint, radix: number): string {
  if (value === 0n) return '0'
  const alphabet = DIGITS[radix] ?? ''
  const base = BigInt(radix)
  let rest = value
  let out = ''
  while (rest > 0n) {
    out = (alphabet[Number(rest % base)] ?? '') + out
    rest /= base
  }
  return out
}

/** 从右往左按固定宽度分组，组间用空格分隔 */
function group(digits: string, size: number): string {
  const parts: string[] = []
  for (let end = digits.length; end > 0; end -= size) {
    parts.unshift(digits.slice(Math.max(0, end - size), end))
  }
  return parts.join(' ')
}

/** 把一个整数渲染成目标进制，并按选项决定是否分组 */
export function formatRadix(value: bigint, radix: number, separator: string): string {
  const negative = value < 0n
  const body = toUnsignedRadix(negative ? -value : value, radix)
  const rendered = separator === 'none' ? body : group(body, Number(separator))
  return negative ? '-' + rendered : rendered
}

/**
 * 逐行转换：一行一个数值，多值用换行分隔。
 * 行内的空白会被忽略，因此从代码/日志里复制「1010 1010」这类分组写法也能直接吃下。
 * 空行直接跳过，不会变成数值 0。
 */
export function transform(input: BinaryInput, options: BinaryOptions): string {
  if (input.text === '') return ''
  const sourceRadix = RADIX[options.source] ?? 10
  const targetRadix = RADIX[options.target] ?? 10
  const lines = input.text.split(/\r\n|\r|\n/)
  const output: string[] = []

  lines.forEach((line, index) => {
    const compact = line.replace(/\s+/g, '')
    if (compact === '') return
    try {
      const { negative, digits } = splitDigits(compact, sourceRadix)
      if (digits === '') throw new Error('缺少数字部分')
      const value = parseRadix(digits, sourceRadix)
      output.push(formatRadix(negative ? -value : value, targetRadix, options.separator))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // 保留原始错误，便于在 devtools 里追到具体是哪一步失败
      throw new Error(`第 ${index + 1} 行：${message}`, { cause: error })
    }
  })

  return output.join('\n')
}
