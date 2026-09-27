import { describe, expect, it } from 'vitest'
import type { DateFmtOptions } from './schema'
import { formatDate, parseDate, transform } from './utils'

const d = parseDate('2026-09-27 08:05:09')
const opts = (pattern: string): DateFmtOptions => ({ pattern })

describe('date-format / token', () => {
  it('默认串完整补零', () => {
    expect(formatDate('YYYY-MM-DD HH:mm:ss', d)).toBe('2026-09-27 08:05:09')
  })

  it('中文组合 + 星期', () => {
    expect(formatDate('YYYY年M月D日 dddd', d)).toBe('2026年9月27日 星期日')
  })

  it('月份与星期缩写', () => {
    expect(formatDate('MMM ddd', d)).toBe('9月 周日')
    expect(formatDate('MMMM', d)).toBe('九月')
  })

  it('两位年与上午/下午', () => {
    expect(formatDate('YY-MM-DD A', d)).toBe('26-09-27 上午')
  })

  it('字面量字符原样输出（斜杠、空格）', () => {
    expect(formatDate('YYYY/MM/DD', d)).toBe('2026/09/27')
    expect(formatDate('D日', d)).toBe('27日')
  })

  it('不补零的单字符 token', () => {
    expect(formatDate('M/D H:m:s', d)).toBe('9/27 8:5:9')
  })
})

describe('date-format / 解析与边界', () => {
  it('闰年 2024-02-29 合法', () => {
    expect(parseDate('2024-02-29').getFullYear()).toBe(2024)
  })

  it('非闰年 2 月 29 日被回读校验拦下', () => {
    expect(() => parseDate('2026-02-29')).toThrow(/非法日期/)
  })

  it('解析不了的日期抛中文错误', () => {
    expect(() => parseDate('随便哪天')).toThrow(/无法解析的日期/)
  })

  it('空格式串报错', () => {
    expect(() => transform({ text: '2026-09-27' }, opts('   '))).toThrow(/格式串不能为空/)
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts('YYYY-MM-DD'))).toBe('')
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, opts('YYYY'))).toThrow(/上限/)
  })
})
