import type { CronGeneratorInput, CronGeneratorOptions } from './schema'

/** 周字段 0/7 均代表周日，中文名表 */
const DOW_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/**
 * 校验单个 cron 字段并返回命中集合。支持星号/问号、每 N、单值、区间、列表、区间步长。
 * 非法输入抛中文错误。
 */
export function parseField(expr: string, min: number, max: number): Set<number> {
  const out = new Set<number>()
  for (const part of expr.split(',')) {
    const seg = part.trim()
    if (seg === '') throw new Error('cron 字段为空')
    const [rangePart, stepPart] = seg.split('/')
    const step = stepPart === undefined ? 1 : Number(stepPart)
    if (!Number.isInteger(step) || step <= 0) throw new Error('cron 步长非法：' + seg)
    let lo: number
    let hi: number
    if (rangePart === '*' || rangePart === '?') {
      lo = min
      hi = max
    } else {
      // 仅允许 a 或 a-b；拒绝 -1 / 1-2-3 等畸形写法（否则会拼出看似通过校验实则非法的 cron）
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

/** 把 5 个选项拼成 cron 表达式并校验 */
export function buildCron(o: CronGeneratorOptions): string {
  parseField(o.minute, 0, 59)
  parseField(o.hour, 0, 23)
  parseField(o.dom, 1, 31)
  parseField(o.month, 1, 12)
  parseField(o.dow, 0, 7)
  return `${o.minute.trim()} ${o.hour.trim()} ${o.dom.trim()} ${o.month.trim()} ${o.dow.trim()}`
}

function isStar(expr: string): boolean {
  const v = expr.trim()
  return v === '*' || v === '?'
}

/** 生成简短中文描述 */
export function describe(o: CronGeneratorOptions): string {
  const parts: string[] = []
  if (!isStar(o.month)) parts.push(o.month.trim() + ' 月')
  if (!isStar(o.dom)) {
    parts.push(isStar(o.month) ? `每月 ${o.dom.trim()} 号` : o.dom.trim() + ' 号')
  }
  if (!isStar(o.dow)) {
    const nums = [...parseField(o.dow, 0, 7)].map((v) => (v === 7 ? 0 : v))
    const uniq = [...new Set(nums)].sort((a, b) => a - b)
    if (uniq.length === 1) parts.push('每' + DOW_NAMES[uniq[0]])
    else if (uniq.length === 5 && uniq[0] === 1 && uniq[4] === 5) parts.push('周一到周五')
    else parts.push(uniq.map((v) => DOW_NAMES[v]).join('、'))
  }
  // 时间
  const mAll = isStar(o.minute)
  const hAll = isStar(o.hour)
  if (mAll && hAll) {
    parts.push('每分钟')
  } else if (!mAll && !hAll) {
    const m = parseField(o.minute, 0, 59)
    const h = parseField(o.hour, 0, 23)
    if (m.size === 1 && h.size === 1) {
      parts.push(`${pad2([...h][0])}:${pad2([...m][0])}`)
    } else {
      parts.push(`${o.hour.trim()} 点 ${o.minute.trim()} 分`)
    }
  } else if (hAll) {
    parts.push(`每小时 ${o.minute.trim()} 分`)
  } else {
    // 分钟为 *（每分钟）、小时固定：避免把原始 * 泄漏进描述
    parts.push(`${o.hour.trim()} 点每分钟`)
  }
  return parts.join(' ')
}

/** T2 同步入口 */
export function transform(input: CronGeneratorInput, options: CronGeneratorOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const cron = buildCron(options)
  const desc = describe(options)
  return `${cron}\n\n# 描述\n${desc}`
}
