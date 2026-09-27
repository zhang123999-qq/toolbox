import type { DateFmtInput, DateFmtOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

const MONTHS_SHORT = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]
const MONTHS_LONG = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
]
const WEEKDAYS_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

/**
 * 解析日期串为本地 Date。
 * 支持 YYYY-MM-DD / YYYY/MM/DD，可附 HH:mm[:ss]；解析不了或非法日期抛中文错误。
 */
export function parseDate(text: string): Date {
  const t = text.trim()
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (!m) throw new Error(`无法解析的日期：${text}（示例：2026-09-27 15:30:00）`)
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  // 回读校验，避免 2 月 30 日被静默进位
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(d)
  ) {
    throw new Error(`非法日期：${text}`)
  }
  return date
}

/** token → 取值函数 */
function tokenValue(token: string, d: Date): string {
  switch (token) {
    case 'YYYY':
      return String(d.getFullYear())
    case 'YY':
      return String(d.getFullYear() % 100).padStart(2, '0')
    case 'MMMM':
      return MONTHS_LONG[d.getMonth()]
    case 'MMM':
      return MONTHS_SHORT[d.getMonth()]
    case 'MM':
      return pad2(d.getMonth() + 1)
    case 'M':
      return String(d.getMonth() + 1)
    case 'DD':
      return pad2(d.getDate())
    case 'D':
      return String(d.getDate())
    case 'dddd':
      return WEEKDAYS_LONG[d.getDay()]
    case 'ddd':
      return WEEKDAYS_SHORT[d.getDay()]
    case 'HH':
      return pad2(d.getHours())
    case 'H':
      return String(d.getHours())
    case 'mm':
      return pad2(d.getMinutes())
    case 'm':
      return String(d.getMinutes())
    case 'ss':
      return pad2(d.getSeconds())
    case 's':
      return String(d.getSeconds())
    case 'A':
      return d.getHours() < 12 ? '上午' : '下午'
    case 'a':
      return d.getHours() < 12 ? '上午' : '下午'
    default:
      return token
  }
}

/** 已知 token，按长度从长到短排列，避免 DD 被 D 抢先吃掉 */
const TOKENS = [
  'YYYY',
  'MMMM',
  'dddd',
  'MMM',
  'ddd',
  'YY',
  'HH',
  'mm',
  'ss',
  'MM',
  'DD',
  'H',
  'm',
  's',
  'M',
  'D',
  'A',
  'a',
] as const

/**
 * 用格式串格式化日期。
 * 从左到右扫描：能匹配已知 token 就替换，否则把当前字符当字面量原样输出。
 */
export function formatDate(pattern: string, d: Date): string {
  let out = ''
  let i = 0
  while (i < pattern.length) {
    let matched = false
    for (const token of TOKENS) {
      if (pattern.startsWith(token, i)) {
        out += tokenValue(token, d)
        i += token.length
        matched = true
        break
      }
    }
    if (!matched) {
      out += pattern[i]
      i += 1
    }
  }
  return out
}

/** T2 同步入口 */
export function transform(input: DateFmtInput, options: DateFmtOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const pattern = options.pattern
  if (pattern.trim() === '') throw new Error('格式串不能为空（如 YYYY-MM-DD HH:mm:ss）')
  const d = parseDate(input.text)
  return formatDate(pattern, d)
}
