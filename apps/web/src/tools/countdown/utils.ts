import type { CountdownInput, CountdownOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

export function local(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  )
}

/** 严格解析日期时间，越界中文报错 */
export function parseDateTime(text: string): Date {
  const t = text.trim()
  if (t === '') throw new Error('日期时间不能为空')
  if (/^\d{4}-\d{2}-\d{2}T/.test(t) || /Z$/.test(t)) {
    const d = new Date(t)
    if (!Number.isNaN(d.getTime())) return d
    throw new Error('无法解析的日期时间格式：' + t)
  }
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (m) {
    const [, ys, mos, ds, h = '0', mi = '0', s = '0'] = m
    const y = Number(ys)
    const mo = Number(mos)
    const da = Number(ds)
    if (mo < 1 || mo > 12) throw new Error('月份越界：' + mo + '（应为 1-12）')
    if (da < 1 || da > 31) throw new Error('日期越界：' + da)
    const hh = Number(h)
    const mm = Number(mi)
    const ss = Number(s)
    if (hh > 23 || mm > 59 || ss > 59) throw new Error('时间越界：' + t)
    const d = new Date(y, mo - 1, da, hh, mm, ss)
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) {
      throw new Error('日期越界：' + y + ' 年 ' + mo + ' 月没有 ' + da + ' 日')
    }
    if (!Number.isNaN(d.getTime())) return d
  }
  throw new Error('无法解析的日期时间格式：' + t)
}

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const MIN_MS = 60_000

/** 把毫秒差格式化为 "X 天 HH:mm:ss" */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms)
  const days = Math.floor(abs / DAY_MS)
  const hours = Math.floor((abs % DAY_MS) / HOUR_MS)
  const mins = Math.floor((abs % HOUR_MS) / MIN_MS)
  const secs = Math.floor((abs % MIN_MS) / 1000)
  return `${days} 天 ${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`
}

/** T2 同步入口（以打开页面时刻为「现在」算静态倒计时） */
export function transform(input: CountdownInput, options: CountdownOptions): string {
  const targetText = input.text.trim()
  if (targetText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const target = parseDateTime(targetText)
  const now = new Date()
  const title = options.title.trim() || '倒数日'

  const diffMs = target.getTime() - now.getTime()
  const lines: string[] = [`标题：${title}`, `目标：${local(target)}`]

  if (diffMs > 0) {
    lines.push(`状态：未开始`)
    lines.push(`剩余：${formatDuration(diffMs)}`)
  } else if (diffMs === 0) {
    lines.push(`状态：就是现在！`)
  } else {
    lines.push(`状态：已过期`)
    lines.push(`已过去：${formatDuration(diffMs)}`)
  }

  // 进度百分比（需要开始日期）
  const startText = input.textB.trim()
  if (startText !== '') {
    const start = parseDateTime(startText)
    const total = target.getTime() - start.getTime()
    if (total <= 0) {
      lines.push('进度：开始日期不早于目标日期，无法计算百分比')
    } else {
      const done = now.getTime() - start.getTime()
      const pct = Math.min(100, Math.max(0, (done / total) * 100))
      lines.push(`开始：${local(start)}`)
      lines.push(`进度：${pct.toFixed(2)}%`)
    }
  }
  return lines.join('\n')
}
