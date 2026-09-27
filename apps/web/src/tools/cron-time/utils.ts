/**
 * cron-time 纯逻辑：自研 5 段 cron 解析 + 下次 N 次运行时间计算。
 *
 * 不依赖任何 cron 库，也不与域 04 的 cron-parser / cron-next 共享代码。
 * 字段顺序：分 时 日 月 周（minute hour day-of-month month day-of-week）。
 * 支持语法：`*` `?` `,` `-` `/` 步长。
 */

/** 单个 cron 字段解析后的取值集合，以及该字段是否被「真正限制」（非 * 非 ?） */
export interface ParsedField {
  /** 允许的取值（已归一化，例如周 7 会被并入 0） */
  values: Set<number>
  /** 该字段是否写死了取值（`*` / `?` 视为不限制） */
  restricted: boolean
}

export interface ParsedCron {
  minute: ParsedField
  hour: ParsedField
  dom: ParsedField
  month: ParsedField
  dow: ParsedField
}

/** 各字段的合法取值区间（闭区间） */
export const FIELD_RANGE = {
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [0, 7],
} as const

function isStar(token: string): boolean {
  return token === '*' || token === '?'
}

/**
 * 解析单个 cron 字段为取值集合。
 *
 * 支持写法：
 * - `*` / `?`：整个区间
 * - `a`：单值
 * - `a-b`：区间
 * - `a/b`：从 a 到区间末尾按步长（常见于 `5/10` 这类「从某点开始每 n」）
 * - `a-b/n`：区间内按步长
 * - 星号加步长：整个区间按步长
 * - 逗号并列上述任意形式
 *
 * 任何非法写法（越界、非数字、步长 <=0、缺值）都抛中文错误。
 */
export function parseField(raw: string, min: number, max: number): ParsedField {
  const values = new Set<number>()
  const parts = raw.split(',')
  for (const part of parts) {
    const token = part.trim()
    if (token === '') {
      throw new Error('cron 字段为空段："' + raw + '"')
    }
    const slash = token.indexOf('/')
    const rangePart = slash >= 0 ? token.slice(0, slash) : token
    const stepPart = slash >= 0 ? token.slice(slash + 1) : ''

    let start: number
    let end: number
    if (isStar(rangePart)) {
      start = min
      end = max
    } else {
      const dash = rangePart.indexOf('-')
      if (dash >= 0) {
        start = toInt(rangePart.slice(0, dash), raw)
        end = toInt(rangePart.slice(dash + 1), raw)
      } else {
        start = toInt(rangePart, raw)
        // 单值带步长（如 5/10）时结束于区间末尾，而不是停在该值
        end = stepPart !== '' ? max : start
      }
    }

    const step = stepPart === '' ? 1 : toInt(stepPart, raw)
    if (step <= 0) {
      throw new Error('cron 步长必须为正整数："' + raw + '"')
    }
    if (start < min || end > max || start > end) {
      throw new Error('cron 字段越界："' + raw + '"（应为 ' + min + '-' + max + '）')
    }
    for (let v = start; v <= end; v += step) values.add(v)
  }
  return { values, restricted: !isStar(raw.trim()) }
}

function toInt(text: string, raw: string): number {
  if (!/^\d+$/.test(text)) {
    throw new Error('cron 字段含非数字字符："' + raw + '"（"' + text + '"）')
  }
  return Number(text)
}

/** 解析整条 5 段表达式；周字段把 7（周日）归一为 0。 */
export function parseCron(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) {
    throw new Error('cron 表达式必须是 5 段（分 时 日 月 周），当前为 ' + fields.length + ' 段')
  }
  const minute = parseField(fields[0], FIELD_RANGE.minute[0], FIELD_RANGE.minute[1])
  const hour = parseField(fields[1], FIELD_RANGE.hour[0], FIELD_RANGE.hour[1])
  const dom = parseField(fields[2], FIELD_RANGE.dom[0], FIELD_RANGE.dom[1])
  const month = parseField(fields[3], FIELD_RANGE.month[0], FIELD_RANGE.month[1])
  const dowRaw = parseField(fields[4], FIELD_RANGE.dow[0], FIELD_RANGE.dow[1])
  // 0 与 7 都表示周日：把 7 合并进 0
  const dowValues = new Set<number>()
  for (const v of dowRaw.values) dowValues.add(v === 7 ? 0 : v)
  const dow: ParsedField = { values: dowValues, restricted: dowRaw.restricted }
  return { minute, hour, dom, month, dow }
}

/**
 * 判断某一分钟是否命中。
 *
 * Vixie cron 日 / 周 OR 语义：
 * - 日（dom）与周（dow）都不限制 → 每天都可能命中；
 * - 只有一边限制 → 被限制的那边必须命中；
 * - 两边都限制 → 取并集（dom 命中 或 dow 命中都算）。
 */
export function matches(date: Date, cron: ParsedCron): boolean {
  if (!cron.month.values.has(date.getMonth() + 1)) return false
  if (!cron.hour.values.has(date.getHours())) return false
  if (!cron.minute.values.has(date.getMinutes())) return false

  const domOk = cron.dom.values.has(date.getDate())
  const dowOk = cron.dow.values.has(date.getDay())
  if (cron.dom.restricted && cron.dow.restricted) {
    return domOk || dowOk
  }
  if (cron.dom.restricted) return domOk
  if (cron.dow.restricted) return dowOk
  return true
}

/** 把日期格式化为 `YYYY-MM-DD HH:mm:ss`（本地时区） */
export function formatRun(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  )
}

/**
 * 从 `from` 之后（不含当分钟）逐分钟扫描，收集接下来 `count` 次命中。
 * 扫描上限约 5 年，避免无匹配表达式死循环。
 */
export function nextRuns(expr: string, count: number, from: Date): Date[] {
  const cron = parseCron(expr)
  const result: Date[] = []
  const cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)
  const guardMax = 366 * 24 * 60 * 5
  let guard = 0
  while (result.length < count && guard < guardMax) {
    if (matches(cursor, cron)) result.push(new Date(cursor))
    cursor.setMinutes(cursor.getMinutes() + 1)
    guard += 1
  }
  if (result.length === 0) {
    throw new Error('在未来 5 年内没有找到匹配的运行时间，请检查表达式')
  }
  return result
}

/** 选项里的 count 是字符串文本框：解析为 1-50 的整数，非法则报错 */
export function normalizeCount(raw: string): number {
  const text = raw.trim()
  if (text === '') return 5
  if (!/^\d+$/.test(text)) {
    throw new Error('次数必须是正整数："' + raw + '"')
  }
  const n = Number(text)
  if (n < 1) throw new Error('次数至少为 1')
  if (n > 50) throw new Error('次数最多为 50')
  return n
}

/** T2 同步入口：空输入返回空串，其余计算下次 N 次运行 */
export function transform(
  input: { text: string },
  options: { count: string },
  now: Date = new Date(),
): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const count = normalizeCount(options.count)
  const runs = nextRuns(input.text, count, now)
  const lines = runs.map((d, i) => `${i + 1}. ${formatRun(d)}`)
  return ['下次 ' + runs.length + ' 次运行（从 ' + formatRun(now) + ' 起）：', ...lines].join('\n')
}
