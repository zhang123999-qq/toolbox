import type { DateParseInput, DateParseOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

const WEEKDAYS_CN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

/** 今天 0 点（本地） */
export function today(base?: Date): Date {
  const now = base ?? new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

/** 周一=0 … 周日=6 */
function monIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

const WEEKDAY_CHAR: Record<string, number> = {
  一: 0,
  二: 1,
  三: 2,
  四: 3,
  五: 4,
  六: 5,
  日: 6,
  天: 6,
}

/**
 * 把自然语言日期解析为本地 0 点的 Date。
 * 解析不了直接抛中文错误，绝不把 Invalid Date 放出去。
 *
 * @param text 输入
 * @param base 基准「今天」，默认现在（可注入便于测试）
 */
export function parseNaturalDate(text: string, base?: Date): Date {
  const t = text.trim()
  const todayDate = today(base)

  // 1) 绝对日期：2026-09-27 / 2026/9/27 / 2026年9月27日
  const abs = t.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?$/)
  if (abs) {
    const [, y, mo, d] = abs
    const date = new Date(Number(y), Number(mo) - 1, Number(d))
    if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) {
      throw new Error(`非法日期：${text}`)
    }
    return date
  }

  // 2) 固定相对词
  const fixed: Record<string, number> = {
    今天: 0,
    今日: 0,
    明天: 1,
    明日: 1,
    后天: 2,
    大后天: 3,
    昨天: -1,
    昨日: -1,
    前天: -2,
  }
  if (t in fixed) return addDays(todayDate, fixed[t])

  // 3) n 天前 / n 天后
  const rel = t.match(/^(\d+)\s*(?:天|日)\s*(后|以后|前)$/)
  if (rel) {
    const n = Number(rel[1])
    return addDays(todayDate, rel[2] === '前' ? -n : n)
  }

  // 4) 下周（单独出现 = 下周一）
  if (/^下\s*(周|星期)$/.test(t)) {
    return addDays(todayDate, 7 - monIndex(todayDate))
  }

  // 5) (本周|这周|下周)周X / 周X / 星期X
  const wd = t.match(/^(下\s*周|下\s*星期|本\s*周|这\s*周|这\s*星期|周|星期)([一二三四五六日天])$/)
  if (wd) {
    const scope = wd[1].replace(/\s/g, '')
    const target = WEEKDAY_CHAR[wd[2]]
    if (scope === '下周' || scope === '下星期') {
      // 下周X = 下周一 再 + target
      return addDays(todayDate, 7 - monIndex(todayDate) + target)
    }
    if (scope === '本周' || scope === '这周' || scope === '这星期') {
      return addDays(todayDate, -monIndex(todayDate) + target)
    }
    // 裸「周X / 星期X」：下一次出现（今天命中则算今天）
    const cur = monIndex(todayDate)
    let diff = target - cur
    if (diff < 0) diff += 7
    return addDays(todayDate, diff)
  }

  throw new Error(`无法解析的日期：${text}（支持 2026-09-27、今天、明天、3天后、下周一 等）`)
}

function fmt(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** T2 同步入口 */
export function transform(input: DateParseInput, _options: DateParseOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const todayDate = today()
  const date = parseNaturalDate(input.text, todayDate)
  const daysOffset = Math.round((date.getTime() - todayDate.getTime()) / 86400000)

  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.round((date.getTime() - startOfYear.getTime()) / 86400000) + 1

  const offsetLabel =
    daysOffset === 0 ? '今天' : daysOffset > 0 ? `+${daysOffset} 天` : `${daysOffset} 天`

  return [
    `解析结果：${fmt(date)}（${WEEKDAYS_CN[date.getDay()]}）`,
    `相对今天：${offsetLabel}`,
    `当年第 ${dayOfYear} 天`,
    `Unix 秒：${Math.round(date.getTime() / 1000)}`,
  ].join('\n')
}
