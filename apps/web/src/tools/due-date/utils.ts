import type { DueDateInput, DueDateOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 日期 → YYYY-MM-DD（本地时区） */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * 严格解析 YYYY-MM-DD。
 * 先正则定形，再用「构造后回读」校验 2 月 30 日这类不存在的日期，
 * 顺带挡掉 new Date 对 0–99 年的 1900 偏移坑。
 */
export function parseDateStrict(text: string): Date {
  const t = text.trim()
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) throw new Error(`无法解析的日期格式：${t}（应为 YYYY-MM-DD）`)
  const y = Number(m[1])
  const mo = Number(m[2])
  const da = Number(m[3])
  if (mo < 1 || mo > 12) throw new Error(`月份越界：${mo}（应为 1-12）`)
  if (da < 1 || da > 31) throw new Error(`日期越界：${da}`)
  const d = new Date(y, mo - 1, da)
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) {
    throw new Error(`日期越界：${y} 年 ${mo} 月没有 ${da} 日`)
  }
  return d
}

/** 预产期计算结果 */
export interface DueInfo {
  /** 预产期（末次月经 + 280 天） */
  readonly due: Date
  /** 当前孕周：整周数 */
  readonly weeks: number
  /** 当前孕周：余天数 */
  readonly days: number
  /** 距预产期天数（已过预产期则为负数） */
  readonly daysToDue: number
}

/** 去掉时分秒，只留本地日期部分 */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * 末次月经 → 预产期与当前孕周（Naegele 规则：+280 天）。
 *
 * - 加天数用 setDate（自动处理跨月 / 跨年 / 闰年）；
 * - 日期差用 UTC 午夜相减：DST 切换日「本地午夜到午夜」不是严格 24 小时，
 *   直接 ms / 86400000 会差 ±1 天，用 UTC 午夜则恒为整天数。
 */
export function calcDue(lmp: Date, now: Date): DueInfo {
  const lmpDay = startOfDay(lmp)
  const nowDay = startOfDay(now)
  if (lmpDay.getTime() > nowDay.getTime()) throw new Error('末次月经日期不能晚于今天')
  const due = new Date(lmpDay.getFullYear(), lmpDay.getMonth(), lmpDay.getDate())
  due.setDate(due.getDate() + 280)
  const daysBetween = (a: Date, b: Date): number =>
    Math.round(
      (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
        86400000,
    )
  const gestDays = daysBetween(lmpDay, nowDay)
  return {
    due,
    weeks: Math.floor(gestDays / 7),
    days: gestDays % 7,
    daysToDue: daysBetween(nowDay, due),
  }
}

/** T2 同步入口 */
export function transform(input: DueDateInput, _options: DueDateOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const lmp = parseDateStrict(text)
  const info = calcDue(lmp, new Date())
  const tail =
    info.daysToDue < 0
      ? `已超过预产期 ${-info.daysToDue} 天`
      : `距预产期：还有 ${info.daysToDue} 天`
  return (
    `末次月经：${formatDate(lmp)}\n` +
    `预产期：${formatDate(info.due)}\n` +
    `当前孕周：${info.weeks} 周 ${info.days} 天\n` +
    tail
  )
}
