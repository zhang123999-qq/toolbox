import type { TrigonometryInput, TrigonometryOptions } from './schema'

const EPS = 1e-12

/** 12 位有效数字，去尾零；|v|<EPS 视为 0（压平 sin(π) 这类浮点残余） */
function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (Math.abs(n) < EPS) return '0'
  return Number(n.toPrecision(12)).toString()
}

function isZero(n: number): boolean {
  return Math.abs(n) < EPS
}

export function parseAngle(text: string): number {
  const t = text.trim()
  if (t === '') throw new Error('角度不能为空')
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) {
    throw new Error('请输入数字角度：' + t)
  }
  const n = Number(t)
  if (!Number.isFinite(n)) throw new Error('角度不是有限数字：' + t)
  return n
}

/** T2 同步入口 */
export function transform(input: TrigonometryInput, options: TrigonometryOptions): string {
  const angleText = input.text.trim()
  if (angleText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const angle = parseAngle(input.text)
  const rad = options.unit === 'deg' ? (angle * Math.PI) / 180 : angle
  const deg = options.unit === 'deg' ? angle : (angle * 180) / Math.PI

  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  const undefined_ = '无定义'

  const tan = isZero(cos) ? undefined_ : fmt(sin / cos)
  const csc = isZero(sin) ? undefined_ : fmt(1 / sin)
  const sec = isZero(cos) ? undefined_ : fmt(1 / cos)
  const cot = isZero(sin) ? undefined_ : fmt(cos / sin)

  const lines = [
    `角度：${fmt(angle)}${options.unit === 'deg' ? '°' : ' rad'}（= ${fmt(deg)}° = ${fmt(rad)} rad）`,
    `sin = ${fmt(sin)}`,
    `cos = ${fmt(cos)}`,
    `tan = ${tan}`,
    `csc = ${csc}`,
    `sec = ${sec}`,
    `cot = ${cot}`,
  ]
  return lines.join('\n')
}
