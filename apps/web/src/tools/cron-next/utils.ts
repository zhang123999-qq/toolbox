import type { CronNextInput, CronNextOptions } from './schema'

/** 单个 cron 字段解析为命中集合；越界/非法抛中文错误 */
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
      // 仅允许 a 或 a-b；拒绝 -1 / 1-2-3 等畸形写法被静默误解析
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

function isStar(expr: string): boolean {
  const v = expr.trim()
  return v === '*' || v === '?'
}

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 把 Date 格式化为本地 `YYYY-MM-DD HH:MM` */
export function formatDate(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  )
}

/**
 * 计算从 `from` 之后（不含 from 当分钟）的接下来 count 次触发时间。
 * 标准 5 段 cron：日与周同时被限制时取并集（OR）。
 */
export function nextRuns(expr: string, count: number, from: Date): Date[] {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) throw new Error('cron 表达式必须是 5 段（分 时 日 月 周）')
  const [mExpr, hExpr, domExpr, monExpr, dowExpr] = fields
  const minSet = parseField(mExpr, 0, 59)
  const hourSet = parseField(hExpr, 0, 23)
  const domSet = parseField(domExpr, 1, 31)
  const monSet = parseField(monExpr, 1, 12)
  const dowRaw = parseField(dowExpr, 0, 7)
  // getDay() 返回 0-6，把 7 归并到 0
  const dowSet = new Set<number>()
  for (const v of dowRaw) dowSet.add(v === 7 ? 0 : v)

  const domRestricted = !isStar(domExpr)
  const dowRestricted = !isStar(dowExpr)

  const cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const out: Date[] = []
  // 最多向后扫 5 年（按分钟），防止死循环
  const guard = 5 * 366 * 24 * 60
  for (let i = 0; i < guard && out.length < count; i++) {
    const m = cursor.getMinutes()
    const h = cursor.getHours()
    const dom = cursor.getDate()
    const mon = cursor.getMonth() + 1
    const dow = cursor.getDay()
    if (minSet.has(m) && hourSet.has(h) && monSet.has(mon)) {
      let dayOk: boolean
      if (!domRestricted && !dowRestricted) {
        dayOk = true
      } else if (domRestricted && !dowRestricted) {
        dayOk = domSet.has(dom)
      } else if (!domRestricted && dowRestricted) {
        dayOk = dowSet.has(dow)
      } else {
        // 两者都被限制：取并集（Vixie cron 语义）
        dayOk = domSet.has(dom) || dowSet.has(dow)
      }
      if (dayOk) out.push(new Date(cursor))
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  if (out.length < count) throw new Error('在可计算时间范围内未找到足够的触发时间')
  return out
}

/** T2 同步入口：基于当前时间计算 */
export function transform(input: CronNextInput, options: CronNextOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const count = Number(options.count)
  if (!Number.isInteger(count) || count <= 0 || count > 100) {
    throw new Error('次数须为 1-100 之间的整数')
  }
  const runs = nextRuns(input.text, count, new Date())
  return runs.map((d, i) => `${i + 1}. ${formatDate(d)}`).join('\n')
}
