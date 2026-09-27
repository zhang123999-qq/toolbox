import type { WorkdayInput, WorkdayOptions } from './schema'

const DAY_MS = 86400000

/** 解析 YYYY-MM-DD 为 UTC 时间戳；非法抛中文错误 */
export function parseDate(text: string): number {
  const m = text.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (!m) throw new Error(`无法识别日期「${text.trim()}」，请用 YYYY-MM-DD`)
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error(`非法日期：${text.trim()}`)
  const ms = Date.UTC(y, mo - 1, d)
  const back = new Date(ms)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new Error(`非法日期：${text.trim()}`)
  }
  return ms
}

export function fmt(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function dayKey(ms: number): string {
  return fmt(ms)
}

/** 周一=1 … 周五=5；周日=0、周六=6 */
export function isWeekday(ms: number): boolean {
  const wd = new Date(ms).getUTCDay()
  return wd >= 1 && wd <= 5
}

function isWorkday(ms: number, excluded: Set<string>): boolean {
  return isWeekday(ms) && !excluded.has(dayKey(ms))
}

export interface ParsedWorkdayInput {
  readonly start: number
  readonly count: number
  readonly excluded: Set<string>
}

/** 解析多行输入 */
export function parseInput(text: string): ParsedWorkdayInput {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length < 2) throw new Error('至少给出开始日期与工作日天数（各占一行）')
  const start = parseDate(lines[0])
  const count = Number(lines[1])
  if (!Number.isInteger(count) || Math.abs(count) > 100000) {
    throw new Error('工作日天数须为 -100000 到 100000 之间的整数')
  }
  const excluded = new Set<string>()
  for (let i = 2; i < lines.length; i++) {
    excluded.add(dayKey(parseDate(lines[i])))
  }
  return { start, count: Math.abs(count), excluded }
}

/** 从 start 出发，向 direction 数 count 个工作日（不计 start 当天） */
export function addWorkdays(
  start: number,
  count: number,
  direction: 'add' | 'subtract',
  excluded: Set<string>,
): number {
  const step = direction === 'add' ? DAY_MS : -DAY_MS
  let cur = start
  let counted = 0
  while (counted < count) {
    cur += step
    if (isWorkday(cur, excluded)) counted++
  }
  return cur
}

/** 主转换 */
export function transform(input: WorkdayInput, options: WorkdayOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const { start, count, excluded } = parseInput(input.text)
  const result = addWorkdays(start, count, options.direction, excluded)
  const dirText = options.direction === 'add' ? '加' : '减'
  return [
    `开始日期：${fmt(start)}`,
    `${dirText}工作日：${count} 天（排除周末${excluded.size ? `与 ${excluded.size} 个自定义排除日` : ''}）`,
    `结果日期：${fmt(result)}`,
  ].join('\n')
}
