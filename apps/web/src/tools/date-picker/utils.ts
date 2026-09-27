/**
 * date-picker 纯逻辑：闰年判断、当月天数、月历网格生成、日期格式化。
 * 日历 UI 在 Tool.tsx 里渲染。
 */

/** 闰年判断 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** 某年某月的天数（month 为 1-12） */
export function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1]
}

/**
 * 生成月历网格（周一开头）。
 * 返回按周分组的数组，每个元素是 0-42 个格子；当月以外的格子为 null。
 */
export function buildCalendar(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month - 1, 1)
  // getDay(): 周日=0…周六=6；转成周一开头的偏移
  const offset = (first.getDay() + 6) % 7
  const total = daysInMonth(year, month)
  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i += 1) cells.push(null)
  for (let d = 1; d <= total; d += 1) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const WEEKDAYS_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 星期中文名（getDay 0=周日） */
export function weekdayCn(date: Date): string {
  return WEEKDAYS_CN[date.getDay()]
}

/** 格式化为本地 ISO 日期 YYYY-MM-DD */
export function toISODate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate())
}

/** 判断某天是否是今天（本地） */
export function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day
}

/** 选中日期的汇总文本（供复制 / 下载） */
export function selectedInfo(date: Date): string {
  return (
    toISODate(date) +
    '（' +
    weekdayCn(date) +
    '） 时间戳 ' +
    Math.floor(date.getTime() / 1000) +
    '（' +
    date.getTime() +
    ' 毫秒）'
  )
}
