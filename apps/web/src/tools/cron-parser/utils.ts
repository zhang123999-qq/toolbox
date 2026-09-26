import type { CronParserInput, CronParserOptions } from './schema'

/** cron 五个字段的取值范围（含端点）。周字段 0/7 均代表周日。 */
const FIELD_RANGE = {
  minute: [0, 59],
  hour: [0, 23],
  dom: [1, 31],
  month: [1, 12],
  dow: [0, 7],
} as const

const DOW_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 数字补零到两位（用于时分展示） */
function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/**
 * 解析单个 cron 字段为命中的数值集合。
 * 支持：星号/问号（等同「每」）、每 N 步长、单值 a、区间 a-b、列表 a,b,c、区间步长 a-b/N。
 * 越界或非法字符直接抛中文错误。
 */
export function parseField(expr: string, min: number, max: number): Set<number> {
  const out = new Set<number>()
  const parts = expr.split(',')
  for (const part of parts) {
    const seg = part.trim()
    if (seg === '') throw new Error('cron 字段为空')
    // `?` 在 Quartz 语义里等同于「不指定」，这里当作 `*`
    const [rangePart, stepPart] = seg.split('/')
    const step = stepPart === undefined ? 1 : Number(stepPart)
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error('cron 步长非法：' + seg)
    }
    let lo: number
    let hi: number
    if (rangePart === '*' || rangePart === '?') {
      lo = min
      hi = max
    } else {
      // 仅允许纯数字单值 a 或区间 a-b；拒绝 -1（前导空）、1-2-3（多段）等畸形写法
      const m = rangePart.match(/^(\d+)(?:-(\d+))?$/)
      if (!m) throw new Error('cron 字段非法：' + seg)
      lo = Number(m[1])
      hi = m[2] === undefined ? lo : Number(m[2])
    }
    if (!Number.isInteger(lo) || !Number.isInteger(hi)) {
      throw new Error('cron 字段含非整数：' + seg)
    }
    if (lo < min || hi > max || lo > hi) {
      throw new Error(`cron 字段越界：${seg}（允许 ${min}-${max}）`)
    }
    for (let v = lo; v <= hi; v += step) out.add(v)
  }
  if (out.size === 0) throw new Error('cron 字段未命中任何值：' + expr)
  return out
}

interface FieldInfo {
  all: boolean
  step: number | null
  values: number[]
}

/** 汇总字段：是否为「全部」、是否为固定步长、命中值排序 */
function summarize(expr: string, set: Set<number>, min: number, max: number): FieldInfo {
  const all = expr === '*' || expr === '?'
  const values = [...set].sort((a, b) => a - b)
  let step: number | null = null
  const stepMatch = expr.match(/^\*\/(\d+)$|^\d+(?:-\d+)?\/(\d+)$/)
  if (stepMatch) step = Number(stepMatch[1] ?? stepMatch[2])
  void min
  void max
  return { all, step, values }
}

/** 把数值列表压成简短串：1,2,3 → "1-3" 否则逗号拼 */
function listOrRange(values: number[], unit: string): string {
  if (values.length === 0) return ''
  const contiguous = values.every((v, i) => i === 0 || v === values[i - 1] + 1) && values.length > 1
  if (contiguous) return `${values[0]}-${values[values.length - 1]} ${unit}`
  return values.join(',') + ' ' + unit
}

/** 分钟片段 */
function minutePhrase(info: FieldInfo): string {
  if (info.all) return ''
  if (info.step !== null) return `每 ${info.step} 分钟`
  if (info.values.length === 1) return `${pad2(info.values[0])} 分`
  return `第 ${listOrRange(info.values, '分')}`
}

/** 小时片段 */
function hourPhrase(info: FieldInfo): string {
  if (info.all) return ''
  if (info.step !== null) return `每 ${info.step} 小时`
  if (info.values.length === 1) return `${pad2(info.values[0])} 点`
  return listOrRange(info.values, '点')
}

/** 拼装「时间」短语：小时+分钟。能拼成 HH:MM 就优先时钟表。 */
function timePhrase(minInfo: FieldInfo, hourInfo: FieldInfo): string {
  if (minInfo.all && hourInfo.all) return '每分钟'
  // 每小时跑（小时为 *）、分钟固定单值 → “每小时整点 / 每小时 MM 分”
  if (hourInfo.all && minInfo.step === null && minInfo.values.length === 1) {
    const mm = pad2(minInfo.values[0])
    return mm === '00' ? '每小时整点' : `每小时 ${mm} 分`
  }
  const h = hourPhrase(hourInfo)
  const m = minutePhrase(minInfo)
  // 整点时分都为单值 → "HH:MM"
  if (hourInfo.values.length === 1 && minInfo.values.length === 1) {
    return `${pad2(hourInfo.values[0])}:${pad2(minInfo.values[0])}`
  }
  return [h, m].filter(Boolean).join(' ')
}

/** 日（几号）片段 */
function domPhrase(info: FieldInfo, monthAll: boolean): string {
  if (info.all) return ''
  if (info.step !== null) return `每 ${info.step} 天`
  const body = listOrRange(info.values, '号')
  return monthAll ? `每月 ${body}` : body
}

/** 月片段 */
function monthPhrase(info: FieldInfo): string {
  if (info.all) return ''
  return listOrRange(info.values, '月')
}

/** 周片段：1-5 → 周一到周五，0/6 → 周末，单值 → 每周X */
function dowPhrase(info: FieldInfo): string {
  if (info.all) return ''
  const norm = info.values.map((v) => (v === 7 ? 0 : v)).sort((a, b) => a - b)
  const uniq = [...new Set(norm)]
  if (uniq.length === 1) return `每${DOW_NAMES[uniq[0]]}`
  // 周一到周五
  if (uniq.length === 5 && uniq[0] === 1 && uniq[4] === 5) return '周一到周五'
  // 周末（周日 0 + 周六 6）
  if (uniq.length === 2 && uniq.includes(0) && uniq.includes(6)) return '周末'
  return uniq.map((v) => DOW_NAMES[v]).join('、')
}

/**
 * 解析并生成中文描述。输入为空返回空串；非法格式抛中文错误。
 */
export function describeCron(expr: string): string {
  const trimmed = expr.trim()
  if (trimmed === '') return ''
  if (trimmed.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const fields = trimmed.split(/\s+/)
  if (fields.length !== 5) {
    throw new Error('cron 表达式必须是 5 段（分 时 日 月 周）：' + trimmed)
  }
  const [mExpr, hExpr, domExpr, monExpr, dowExpr] = fields
  const minSet = parseField(mExpr, ...FIELD_RANGE.minute)
  const hourSet = parseField(hExpr, ...FIELD_RANGE.hour)
  const domSet = parseField(domExpr, ...FIELD_RANGE.dom)
  const monSet = parseField(monExpr, ...FIELD_RANGE.month)
  const dowSet = parseField(dowExpr, ...FIELD_RANGE.dow)

  const minInfo = summarize(mExpr, minSet, ...FIELD_RANGE.minute)
  const hourInfo = summarize(hExpr, hourSet, ...FIELD_RANGE.hour)
  const domInfo = summarize(domExpr, domSet, ...FIELD_RANGE.dom)
  const monInfo = summarize(monExpr, monSet, ...FIELD_RANGE.month)
  const dowInfo = summarize(dowExpr, dowSet, ...FIELD_RANGE.dow)

  const parts: string[] = []
  const mon = monthPhrase(monInfo)
  if (mon) parts.push(mon)
  const dom = domPhrase(domInfo, monInfo.all)
  if (dom) parts.push(dom)
  const dow = dowPhrase(dowInfo)
  if (dow) parts.push(dow)
  parts.push(timePhrase(minInfo, hourInfo))
  return parts.filter(Boolean).join(' ')
}

/** T2 同步入口 */
export function transform(input: CronParserInput, _options: CronParserOptions): string {
  if (input.text === '') return ''
  return describeCron(input.text)
}
