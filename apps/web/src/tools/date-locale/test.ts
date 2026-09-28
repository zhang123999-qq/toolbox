/**
* date-locale（#723）utils 单测：Intl 真实调用。
*/
import { describe, expect, it} from 'vitest'
import {
LOCALES,
formatDateLocaleResults,
formatDateLocales,
relativeTimeZh,
resolveLocales,
} from './utils'

describe('LOCALES', () => {
it('不少于 20 个', () => {
expect(LOCALES.length).toBeGreaterThanOrEqual(20)
})
})

describe('resolveLocales', () => {
it('解析逗号分隔并去重', () => {
const out = resolveLocales('zh-CN, en-US,zh-CN')
expect(out.map((o) => o.code)).toEqual(['zh-CN', 'en-US'])
})
it('大小写不敏感', () => {
expect(resolveLocales('EN-us').map((o) => o.code)).toEqual(['en-US'])
})
it('支持中文分隔符', () => {
expect(resolveLocales('zh-CN，ja-JP、ko-KR').map((o) => o.code)).toEqual(['zh-CN', 'ja-JP', 'ko-KR'])
})
it('空输入抛中文错', () => {
expect(() => resolveLocales('')).toThrow('请至少选择一个语言区域')
expect(() => resolveLocales(', ')).toThrow('请至少选择一个语言区域')
})
it('未知代码抛中文错', () => {
expect(() => resolveLocales('zh-CN,xx-YY')).toThrow('未知语言区域：xx-YY')
})
})

describe('formatDateLocales', () => {
it('多 locale 并排输出', () => {
const rs = formatDateLocales('2026-09-28T15:30:00', 'zh-CN,en-US')
expect(rs).toHaveLength(2)
expect(rs[0].locale).toBe('zh-CN')
expect(rs[0].label).toBe('简体中文（中国大陆）')
expect(rs[0].date).toContain('2026')
expect(rs[1].locale).toBe('en-US')
expect(rs[1].date).toContain('2026')
})
it('ar-EG 与 zh-CN 日期格式不同', () => {
const rs = formatDateLocales('2026-09-28T15:30:00', 'zh-CN,ar-EG')
expect(rs[0].datetime).not.toBe(rs[1].datetime)
})
it('空日期抛中文错', () => {
expect(() => formatDateLocales('', 'zh-CN')).toThrow('请输入日期')
})
it('非法日期抛中文错', () => {
expect(() => formatDateLocales('不是日期', 'zh-CN')).toThrow('无法解析日期')
})
it('非法 locale 透出中文错', () => {
expect(() => formatDateLocales('2026-09-28', 'xx-YY')).toThrow('未知语言区域')
})
})

describe('relativeTimeZh', () => {
const now = new Date('2026-09-28T12:00:00')
it('各时间单位', () => {
expect(relativeTimeZh('2025-09-28T12:00:00', now)).toBe('去年')
expect(relativeTimeZh('2026-07-28T12:00:00', now)).toBe('2个月前')
expect(relativeTimeZh('2026-09-25T12:00:00', now)).toBe('3天前')
expect(relativeTimeZh('2026-09-28T09:00:00', now)).toBe('3小时前')
expect(relativeTimeZh('2026-09-28T11:30:00', now)).toBe('30分钟前')
expect(relativeTimeZh('2026-09-28T11:59:30', now)).toBe('30秒钟前')
})
it('未来时间', () => {
expect(relativeTimeZh('2026-09-30T12:00:00', now)).toBe('后天')
})
it('现在', () => {
expect(relativeTimeZh('2026-09-28T12:00:00', now)).toBe('现在')
})
it('空与非法抛中文错', () => {
expect(() => relativeTimeZh('', now)).toThrow('请输入日期')
expect(() => relativeTimeZh('xxx', now)).toThrow('无法解析日期')
})
})

describe('formatDateLocaleResults', () => {
it('文本包含相对时间与各 locale 块', () => {
const rs = formatDateLocales('2026-09-28T15:30:00', 'zh-CN,en-US')
const text = formatDateLocaleResults(rs, '3天前')
expect(text).toContain('相对时间：3天前')
expect(text).toContain('[' + '简体中文（中国大陆） | zh-CN]')
expect(text).toContain('[' + '英语（美国） | en-US]')
expect(text).toContain('日期：')
expect(text).toContain('时间：')
expect(text).toContain('日期时间：')
})
})
