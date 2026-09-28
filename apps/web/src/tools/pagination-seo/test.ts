/**
 * pagination-seo 单元测试
 */
import { describe, expect, it } from 'vitest'
import {
  checkPagination,
  extractPaginationLinks,
  getPageNumber,
  PaginationError,
  renderReport,
} from './utils'

describe('extractPaginationLinks', () => {
  it('提取 prev/next', () => {
    const { prev, next } = extractPaginationLinks(
      '<link rel="prev" href="https://example.com/list?page=1"><link rel="next" href="https://example.com/list?page=3">',
    )
    expect(prev).toEqual(['https://example.com/list?page=1'])
    expect(next).toEqual(['https://example.com/list?page=3'])
  })

  it('无 rel 与非分页 rel 被忽略', () => {
    const { prev, next } = extractPaginationLinks(
      '<link href="a.css"><link rel="stylesheet" href="b.css"><link rel="canonical" href="c">',
    )
    expect(prev).toEqual([])
    expect(next).toEqual([])
  })

  it('无 href 记为空字符串', () => {
    const { prev } = extractPaginationLinks('<link rel="prev">')
    expect(prev).toEqual([''])
  })
})

describe('getPageNumber', () => {
  it('识别 ?page=N', () => {
    expect(getPageNumber('https://example.com/list?page=3')).toBe(3)
  })

  it('识别 /page/N/ 路径', () => {
    expect(getPageNumber('https://example.com/list/page/2/')).toBe(2)
    expect(getPageNumber('https://example.com/list/page/2')).toBe(2)
  })

  it('非法页码返回 null', () => {
    expect(getPageNumber('https://example.com/list?page=abc')).toBeNull()
    expect(getPageNumber('https://example.com/list?page=2.5')).toBeNull()
    expect(getPageNumber('https://example.com/list?page=0')).toBeNull()
    expect(getPageNumber('https://example.com/list/page/0/')).toBeNull()
    expect(getPageNumber('https://example.com/list')).toBeNull()
    expect(getPageNumber('not a url')).toBeNull()
  })
})

describe('checkPagination', () => {
  const CANON = (u: string) => `<link rel="canonical" href="${u}">`
  const page2 = 'https://example.com/list?page=2'

  it('空 HTML 抛中文错', () => {
    expect(() => checkPagination('  ', page2)).toThrowError(PaginationError)
    expect(() => checkPagination('  ', page2)).toThrowError('请粘贴页面 HTML')
  })

  it('规范的第 2 页无问题', () => {
    const html = [
      CANON(page2),
      '<link rel="prev" href="https://example.com/list?page=1">',
      '<link rel="next" href="https://example.com/list?page=3">',
    ].join('')
    const r = checkPagination(html, page2)
    expect(r.page).toBe(2)
    expect(r.issues).toHaveLength(0)
  })

  it('重复 prev/next 报错', () => {
    const html =
      '<link rel="prev" href="https://example.com/list?page=1"><link rel="prev" href="https://example.com/list?page=1">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('rel="prev"'))).toBe(true)
  })

  it('重复 next 报错', () => {
    const html =
      '<link rel="next" href="https://example.com/list?page=3"><link rel="next" href="https://example.com/list?page=3">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.level === 'error' && i.message.includes('rel="next"'))).toBe(true)
  })

  it('无法识别页码时给出提示', () => {
    const r = checkPagination('<p>x</p>', 'https://example.com/list')
    expect(r.page).toBeNull()
    expect(r.issues.some((i) => i.message.includes('未能从页面 URL 识别'))).toBe(true)
  })

  it('第一页缺少 next 时提示', () => {
    const r = checkPagination(
      CANON('https://example.com/list?page=1'),
      'https://example.com/list?page=1',
    )
    expect(r.page).toBe(1)
    expect(r.issues.some((i) => i.message.includes('未发现 rel="next"'))).toBe(true)
  })

  it('第一页带 next 且无 prev 时无警告', () => {
    const r = checkPagination(
      CANON('https://example.com/list?page=1') +
        '<link rel="next" href="https://example.com/list?page=2">',
      'https://example.com/list?page=1',
    )
    expect(r.issues).toHaveLength(0)
  })

  it('第一页（?page=1）出现 prev 警告', () => {
    const r = checkPagination(
      '<link rel="prev" href="https://example.com/list">' +
        CANON('https://example.com/list?page=1'),
      'https://example.com/list?page=1',
    )
    expect(r.page).toBe(1)
    expect(r.issues.some((i) => i.message.includes('第一页不应出现'))).toBe(true)
  })

  it('第 3 页缺少 prev 警告、缺少 next 提示', () => {
    const r = checkPagination(
      CANON('https://example.com/list?page=3'),
      'https://example.com/list?page=3',
    )
    expect(r.issues.some((i) => i.message.includes('缺少 rel="prev"'))).toBe(true)
    expect(r.issues.some((i) => i.message.includes('缺少 rel="next"'))).toBe(true)
  })

  it('prev 未指向上页警告', () => {
    const html = CANON(page2) + '<link rel="prev" href="https://example.com/list?page=5">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.message.includes('未指向上页'))).toBe(true)
  })

  it('next 未指向下页警告', () => {
    const html =
      CANON(page2) +
      '<link rel="prev" href="https://example.com/list?page=1">' +
      '<link rel="next" href="https://example.com/list?page=9">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.message.includes('未指向下页'))).toBe(true)
  })

  it('prev href 为空警告', () => {
    const html = CANON(page2) + '<link rel="prev">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.message.includes('rel="prev" 的 href 为空'))).toBe(true)
  })

  it('prev href 无法识别为分页 URL 时提示', () => {
    const html = CANON(page2) + '<link rel="prev" href=":::">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.message.includes('无法识别为分页 URL'))).toBe(true)
  })

  it('prev href 完全非法时解析失败同样提示', () => {
    const html = CANON(page2) + '<link rel="prev" href="http://[invalid">'
    const r = checkPagination(html, page2)
    expect(r.issues.some((i) => i.message.includes('无法识别为分页 URL'))).toBe(true)
  })

  it('next href 为空警告、无法识别提示', () => {
    const withEmpty = checkPagination(CANON(page2) + '<link rel="next">', page2)
    expect(withEmpty.issues.some((i) => i.message.includes('rel="next" 的 href 为空'))).toBe(true)
    const badHref = checkPagination(CANON(page2) + '<link rel="next" href=":::">', page2)
    expect(badHref.issues.some((i) => i.message.includes('rel="next" 的 href 无法识别'))).toBe(true)
  })

  it('canonical 非法 URL 时跳过自指判断', () => {
    const r = checkPagination('<link rel="canonical" href="not-a-url">', page2)
    expect(r.issues.some((i) => i.message.includes('建议自指'))).toBe(false)
  })

  it('相对路径的 prev/next 正常解析', () => {
    const html =
      CANON(page2) +
      '<link rel="prev" href="/list?page=1">' +
      '<link rel="next" href="/list?page=3">'
    const r = checkPagination(html, page2)
    expect(r.issues).toHaveLength(0)
  })

  it('缺少 canonical 警告', () => {
    const r = checkPagination('<link rel="prev" href="https://example.com/list?page=1">', page2)
    expect(r.issues.some((i) => i.message.includes('缺少 canonical'))).toBe(true)
  })

  it('canonical 与当前页不一致提示自指', () => {
    const r = checkPagination(CANON('https://example.com/other'), page2)
    expect(r.issues.some((i) => i.message.includes('建议自指'))).toBe(true)
  })

  it('canonical 为空 href 时跳过自指判断', () => {
    const r = checkPagination('<link rel="canonical">' + CANON(page2).replace(page2, ''), page2)
    expect(r.issues.some((i) => i.message.includes('建议自指'))).toBe(false)
  })

  it('未填页面 URL 时跳过相邻页与自指判断', () => {
    const r = checkPagination(CANON(page2), '   ')
    expect(r.page).toBeNull()
    expect(r.issues.some((i) => i.message.includes('建议自指'))).toBe(false)
  })

  it('页面 URL 非法时 canonical 自指判断跳过', () => {
    const r = checkPagination(CANON(page2), 'not a url')
    expect(r.issues.some((i) => i.message.includes('建议自指'))).toBe(false)
  })

  it('多个 canonical 时跳过自指判断', () => {
    const r = checkPagination(CANON(page2) + CANON('https://example.com/other'), page2)
    expect(r.issues.some((i) => i.message.includes('建议自指'))).toBe(false)
  })
})

describe('renderReport', () => {
  it('规范页面输出通过结论', () => {
    const page2 = 'https://example.com/list?page=2'
    const html = [
      `<link rel="canonical" href="${page2}">`,
      '<link rel="prev" href="https://example.com/list?page=1">',
      '<link rel="next" href="https://example.com/list?page=3">',
    ].join('')
    const text = renderReport(checkPagination(html, page2))
    expect(text).toContain('第 2 页')
    expect(text).toContain('设置正确')
  })

  it('问题报告带级别标记', () => {
    const text = renderReport(
      checkPagination(
        '<link rel="prev" href="x"><link rel="prev" href="x">',
        'https://example.com/l',
      ),
    )
    expect(text).toContain('❌')
    expect(text).toContain('（未能识别）')
  })

  it('空 prev/next/canonical 渲染为"无"', () => {
    const page2 = 'https://example.com/list?page=2'
    const text = renderReport(checkPagination('<p>x</p>', page2))
    expect(text).toContain('rel="prev"：无')
    expect(text).toContain('rel="next"：无')
    expect(text).toContain('canonical：无')
  })
})
