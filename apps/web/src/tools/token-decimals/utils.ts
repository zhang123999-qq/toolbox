import type { TokenDecimalsInput, TokenDecimalsOptions } from './schema'

/**
 * token-decimals（#699）工具函数：
 * Token 精度换算——wei / gwei / ether / 自定义 decimals 互转。
 * 全部用 BigInt 精确计算，无浮点误差。全部纯函数，便于单测。
 */

/** 预置单位的 decimals */
export const UNIT_DECIMALS: Record<string, number> = {
  wei: 0,
  gwei: 9,
  ether: 18,
}

export const UNIT_OPTIONS = ['wei', 'gwei', 'ether', '自定义'] as const

/** 解析单位 → decimals；自定义时校验 custom 输入 */
export function resolveDecimals(unit: string, custom: string): number {
  if (unit === '自定义') {
    const t = custom.trim()
    if (t === '') throw new Error('自定义单位请输入 decimals（0–255 的整数）')
    if (!/^\d+$/.test(t)) throw new Error('decimals 须为非负整数')
    const n = parseInt(t, 10)
    if (n > 255) throw new Error('decimals 过大（须 ≤ 255）')
    return n
  }
  const d = UNIT_DECIMALS[unit]
  if (d === undefined) throw new Error(`未知单位：${unit}`)
  return d
}

/** 把「decimals 精度下的十进制数」格式化为字符串（去尾零） */
function formatScaled(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString(10)
  const s = raw.toString(10).padStart(decimals + 1, '0')
  const intPart = s.slice(0, s.length - decimals)
  const fracPart = s.slice(s.length - decimals).replace(/0+$/, '')
  return fracPart === '' ? intPart : `${intPart}.${fracPart}`
}

/**
 * 小数部分按源精度归一化：超出源精度的位数须全为零（无精度损失），否则抛错（不做静默截断）。
 */
function normalizeFrac(fracPart: string, fromDec: number): string {
  if (fracPart.length > fromDec) {
    if (!/^0+$/.test(fracPart.slice(fromDec))) {
      throw new Error(`小数位数超出源精度：源单位仅支持 ${fromDec} 位小数`)
    }
    return fracPart.slice(0, fromDec)
  }
  return fracPart
}

/**
 * 精度换算：value（fromDec 精度下的十进制数）→ toDec 精度下的十进制字符串。
 * 小数位数超出源精度且会丢精度时抛错（不做静默截断）。
 */
export function convertTokenAmount(value: string, fromDec: number, toDec: number): string {
  const v = value.trim().replace(/,/g, '')
  if (v === '') throw new Error('请输入要换算的数值')
  const m = /^(\d+)(?:\.(\d+))?$/.exec(v)
  if (!m) throw new Error('数值格式错误：须为非负十进制数')
  const intPart = m[1]
  const fracPart = normalizeFrac(m[2] ?? '', fromDec)
  const fracPadded = fracPart.padEnd(fromDec, '0')
  const raw =
    BigInt(intPart) * 10n ** BigInt(fromDec) + BigInt(fracPadded === '' ? '0' : fracPadded)
  return formatScaled(raw, toDec)
}

/** 以 fromDec 精度计的最小单位整数（raw 值） */
export function toRawInteger(value: string, fromDec: number): string {
  const v = value.trim().replace(/,/g, '')
  if (v === '') throw new Error('请输入要换算的数值')
  const m = /^(\d+)(?:\.(\d+))?$/.exec(v)
  if (!m) throw new Error('数值格式错误：须为非负十进制数')
  const fracPart = normalizeFrac(m[2] ?? '', fromDec)
  const fracPadded = fracPart.padEnd(fromDec, '0')
  const raw = BigInt(m[1]) * 10n ** BigInt(fromDec) + BigInt(fracPadded === '' ? '0' : fracPadded)
  return raw.toString(10)
}

export function transform(input: TokenDecimalsInput, options: TokenDecimalsOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const fromDec = resolveDecimals(options.fromUnit, options.customFrom)
  const toDec = resolveDecimals(options.toUnit, options.customTo)
  const result = convertTokenAmount(input.text, fromDec, toDec)
  const lines = [
    `输入：${input.text.trim()}（${options.fromUnit === '自定义' ? `${fromDec} decimals` : options.fromUnit}）`,
    `结果：${result}（${options.toUnit === '自定义' ? `${toDec} decimals` : options.toUnit}）`,
  ]
  if (fromDec > 0) {
    lines.push(`最小单位整数：${toRawInteger(input.text, fromDec)}`)
  }
  return lines.join('\n')
}
