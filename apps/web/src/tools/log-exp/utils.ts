import type { LogExpInput, LogExpOptions } from './schema'
import { FUNCTION_LABELS } from './schema'

/** 12 位有效数字，去尾零 */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (n === 0) return '0'
  return Number(n.toPrecision(12)).toString()
}

function parseNumber(text: string, name: string): number {
  const t = text.trim()
  if (t === '') throw new Error(name + '不能为空')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
    throw new Error('请输入数字' + name + '：' + t)
  }
  const n = Number(t)
  if (!Number.isFinite(n)) throw new Error(name + '不是有限数字：' + t)
  return n
}

/** T2 同步入口 */
export function transform(input: LogExpInput, options: LogExpOptions): string {
  const xText = input.text.trim()
  if (xText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const x = parseNumber(input.text, 'x')
  const fn = options.function
  const label = FUNCTION_LABELS[fn]

  switch (fn) {
    case 'log10':
    case 'ln':
    case 'log2': {
      if (x <= 0) throw new Error('对数的真数必须为正数：' + xText)
      const base = fn === 'log10' ? 10 : fn === 'ln' ? Math.E : 2
      const baseName = fn === 'log10' ? '10' : fn === 'ln' ? 'e' : '2'
      const value = Math.log(x) / Math.log(base)
      return [`函数：${label}`, `log_${baseName}(${fmt(x)}) = ${fmt(value)}`].join('\n')
    }
    case 'logbase': {
      const bText = input.textB.trim()
      if (bText === '') throw new Error('自定义底数模式需要填写底数')
      const b = parseNumber(input.textB, '底数')
      if (b <= 0 || b === 1) throw new Error('底数必须为正数且不等于 1：' + bText)
      if (x <= 0) throw new Error('对数的真数必须为正数：' + xText)
      const value = Math.log(x) / Math.log(b)
      return [`函数：${label}`, `log_${fmt(b)}(${fmt(x)}) = ${fmt(value)}`].join('\n')
    }
    case 'exp': {
      return [`函数：${label}`, `e^${fmt(x)} = ${fmt(Math.exp(x))}`].join('\n')
    }
    case 'pow10': {
      return [`函数：${label}`, `10^${fmt(x)} = ${fmt(10 ** x)}`].join('\n')
    }
    case 'pow2': {
      return [`函数：${label}`, `2^${fmt(x)} = ${fmt(2 ** x)}`].join('\n')
    }
  }
}
