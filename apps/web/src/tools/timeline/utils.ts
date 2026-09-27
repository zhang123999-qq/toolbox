import type { TimelineInput, TimelineOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

interface Event {
  key: number
  title: string
  order: number
}

/** 解析 `YYYY-MM-DD`（支持 `/`），非法返回 null */
function parseDateKey(text: string): number | null {
  const m = text.trim().match(/(\d{4})\s*[-/](\d{1,2})\s*[-/](\d{1,2})/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const probe = new Date(y, mo - 1, d)
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null
  return Date.UTC(y, mo - 1, d)
}

/** 把一组事件渲染成文本时间线（按日期升序，标注相邻事件间隔天数） */
export function buildTimeline(text: string): string {
  const events: Event[] = []
  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const idx = trimmed.indexOf('|')
    if (idx < 0) continue
    const datePart = trimmed.slice(0, idx)
    const titlePart = trimmed.slice(idx + 1)
    const key = parseDateKey(datePart)
    if (key === null) continue
    events.push({ key, title: titlePart.trim() || '(未命名事件)', order: events.length })
  }

  if (events.length === 0) return ''

  events.sort((a, b) => a.key - b.key || a.order - b.order)

  const out: string[] = []
  let prev: number | null = null
  for (const ev of events) {
    const dt = new Date(ev.key)
    const dateStr = `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
    if (prev === null) {
      out.push(`${dateStr}  ${ev.title}`)
    } else {
      const gap = Math.round((ev.key - prev) / 86400000)
      out.push(`${dateStr}  ${ev.title}   (+${gap} 天)`)
    }
    prev = ev.key
  }
  return out.join('\n')
}

/** T2 同步入口 */
export function transform(input: TimelineInput, _options: TimelineOptions): string {
  const text = input.text
  if (text.trim() === '') return ''
  if (text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return buildTimeline(text)
}
