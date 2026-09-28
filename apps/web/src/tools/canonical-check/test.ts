/**
 * canonical-check 单元测试
 */
import { describe, expect, it } from 'vitest'
import { CanonicalCheckError, checkCanonical, extractCanonical, renderReport } from './utils'

const PAGE = 'https://example.com/article'

describe('extractCanonical', () => {
  it('提取 canonical href', () => {
    const links = extractCanonical(
      `<head><link rel="canonical" href="https://example.com/article"></head>`,
    )
    expect(links).toEqual(['https://example.com/article'])
  })

  it('rel 大小写不敏感', () => {
    expect(extractCanonical('<link REL="Canonical" href="https://example.com/a">')).toEqual([
      'https://example.com/a',
    ])
  })

  it('非 canonical 的 link 被忽略', () => {
    expect(
      extractCanonical('<link rel="stylesheet" href="a.css"><link href="b.css">'),
    ).toEqual([])
  })

  it('无 href 的 canonical 记为空字符串', () => {
    expect(extractCanonical('<link rel="canonical">')).toEqual([''])
  })

  it('多个 canonical 全部提取', () => {
    const links = extractCanonical(
      '<link rel="canonical" href="https://a.com/"><link rel="canonical" href="https://b.com/">',
    )
    expect(links).toHaveLength(2)
  })
})

describe('checkCanonical', () => {
  it('空 HTML 抛中文错', () => {
    expect(() => checkCanonical('  ', PAGE)).toThrowError(CanonicalCheckError)
    expect(() => checkCanonical('  ', PAGE)).toThrowError('请粘贴页面 HTML')
  })

  it('自指 canonical 无问题', () => {
    const r = checkCanonical(`<link rel="canonical" href="${PAGE}">`, PAGE)
    expect(r.links).toEqual([PAGE])
    expect(r.issues).toHaveLength(0)
  })

  it('缺失 canonical 给出警告', () => {
    const r = checkCanonical('<p>无 canonical</p>', PAGE)
    expect(r.issues.some((i) => i.level === 'warning' && i.message.includes('未找到'))).toBe(true)
  })

  it('多个 canonical 报错', () => {
    const r = checkCanonical(
      '<link rel="canonical" href="https://a.com/"><link rel="canonical" href="https://b.com/">',
      PAGE,
    )
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('2 个'))).toBe(true)
  })

  it('空 href 报错', () => {
    const r = checkCanonical('<link rel="canonical">', PAGE)
    expect(r.issues.some((i) => i.message.includes('href 为空'))).toBe(true)
  })

  it('相对 URL 的 canonical 报错', () => {
    const r = checkCanonical('<link rel="canonical" href="/article">', PAGE)
    expect(r.issues.some((i) => i.message.includes('绝对 URL'))).toBe(true)
  })

  it('未填页面 URL 时提示无法判断自指', () => {
    const r = checkCanonical(`<link rel="canonical" href="${PAGE}">`, '  ')
    expect(r.issues.some((i) => i.level === 'info' && i.message.includes('无法判断'))).toBe(true)
  })

  it('页面 URL 非法报错', () => {
    const r = checkCanonical(`<link rel="canonical" href="${PAGE}">`, 'not a url')
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('页面 URL'))).toBe(true)
  })

  it('canonical 与页面不一致时提示非自指', () => {
    const r = checkCanonical('<link rel="canonical" href="https://example.com/other">', PAGE)
    expect(r.issues.some((i) => i.level === 'info' && i.message.includes('非自指'))).toBe(true)
  })

  it('无 canonical 时不做自指判断', () => {
    const r = checkCanonical('<p>x</p>', PAGE)
    expect(r.issues.some((i) => i.message.includes('非自指'))).toBe(false)
  })
})

describe('renderReport', () => {
  it('自指页面输出通过结论', () => {
    const text = renderReport(checkCanonical(`<link rel="canonical" href="${PAGE}">`, PAGE))
    expect(text).toContain('发现 canonical：1 个')
    expect(text).toContain('设置正确')
  })

  it('空 href 渲染为标记且问题带标记', () => {
    const text = renderReport(checkCanonical('<link rel="canonical">', ''))
    expect(text).toContain('（空 href）')
    expect(text).toContain('❌')
    expect(text).toContain('ℹ️')
  })

  it('缺失 canonical 的报告', () => {
    const text = renderReport(checkCanonical('<p>x</p>', PAGE))
    expect(text).toContain('发现 canonical：0 个')
    expect(text).toContain('⚠️')
  })
})
