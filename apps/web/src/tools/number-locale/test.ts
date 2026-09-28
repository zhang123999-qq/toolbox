/**
 * number-locale（#724）utils 单测：Intl 真实调用。
 */
import { describe, expect, it } from 'vitest'
import { LOCALES, formatNumberLocaleResults, formatNumberLocales, resolveLocales } from './utils'

describe('LOCALES', () => {
  it('不少于 20 个', () => {
    expect(LOCALES.length).toBeGreaterThanOrEqual(20)
  })
})

describe('resolveLocales', () => {
  it('解析并去重', () => {
    expect(resolveLocales('zh-CN,AR-eg,zh-CN').map((o) => o.code)).toEqual(['zh-CN', 'ar-EG'])
  })
  it('空输入抛中文错', () => {
    expect(() => resolveLocales('')).toThrow('请至少选择一个语言区域')
  })
  it('未知代码抛中文错', () => {
    expect(() => resolveLocales('xx-YY')).toThrow('未知语言区域：xx-YY')
  })
})

describe('formatNumberLocales', () => {
  it('多 locale 并排输出', () => {
    const rs = formatNumberLocales('1234567.89', 'en-US,de-DE')
    expect(rs).toHaveLength(2)
    expect(rs[0].decimal).toBe('1,234,567.89')
    expect(rs[1].decimal).toBe('1.234.567,89')
  })
  it('ar-EG 使用阿拉伯-印度数字', () => {
    const rs = formatNumberLocales('123', 'ar-EG')
    expect(rs[0].decimal).toBe('١٢٣')
  })
  it('en-IN 使用 lakh/crore 分组', () => {
    const rs = formatNumberLocales('12345678', 'en-IN')
    expect(rs[0].decimal).toBe('1,23,45,678')
  })
  it('百分比与紧凑表示', () => {
    const rs = formatNumberLocales('0.1234', 'en-US')
    expect(rs[0].percent).toBe('12.34%')
    expect(formatNumberLocales('1200', 'en-US')[0].compact).toBe('1.2K')
  })
  it('空输入抛中文错', () => {
    expect(() => formatNumberLocales('', 'en-US')).toThrow('请输入数字')
  })
  it('非法数字抛中文错', () => {
    expect(() => formatNumberLocales('abc', 'en-US')).toThrow('无法解析数字')
    expect(() => formatNumberLocales('Infinity', 'en-US')).toThrow('无法解析数字')
  })
  it('非法 locale 透出中文错', () => {
    expect(() => formatNumberLocales('123', 'xx')).toThrow('未知语言区域')
  })
})

describe('formatNumberLocaleResults', () => {
  it('文本包含各 locale 块', () => {
    const text = formatNumberLocaleResults(formatNumberLocales('1234.5', 'zh-CN,fr-FR'))
    expect(text).toContain('[' + '简体中文（中国大陆） | zh-CN]')
    expect(text).toContain('十进制：1,234.5')
    expect(text).toContain('百分比：')
    expect(text).toContain('紧凑表示：')
  })
})
