import { describe, expect, it } from 'vitest'
import { escapeHtml, escapeJs, escapeSql, transform, unescapeHtml, unescapeSql } from './utils'
import type { EscapeOptions } from './schema'

const html: EscapeOptions = { type: 'html', mode: 'escape' }
const htmlBack: EscapeOptions = { type: 'html', mode: 'unescape' }
const js: EscapeOptions = { type: 'js', mode: 'escape' }
const jsBack: EscapeOptions = { type: 'js', mode: 'unescape' }

describe('escape / html', () => {
  it('转义五个 XML 实体', () => {
    expect(escapeHtml('<a href="x">a & b</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;a &amp; b&lt;/a&gt;',
    )
  })

  it('& 不会被二次转义', () => {
    expect(unescapeHtml(escapeHtml('a & b'))).toBe('a & b')
  })

  it('往返可逆', () => {
    expect(unescapeHtml(escapeHtml("<p>'x'</p>"))).toBe("<p>'x'</p>")
  })
})

describe('escape / js', () => {
  it('转义引号与换行', () => {
    expect(escapeJs('a"b\nc')).toBe('a\\"b\\nc')
  })

  it('反斜杠先转义', () => {
    expect(escapeJs('a\\b')).toBe('a\\\\b')
  })
})

describe('escape / json 与 sql', () => {
  it('JSON 转义带引号输出', () => {
    expect(transform({ text: 'a"b' }, { type: 'json', mode: 'escape' })).toBe('"a\\"b"')
  })

  it('JSON 反转义', () => {
    expect(transform({ text: '"a\\nb"' }, { type: 'json', mode: 'unescape' })).toBe('a\nb')
  })

  it('非法 JSON 抛出可读错误（异常路径）', () => {
    expect(() => transform({ text: '{bad' }, { type: 'json', mode: 'unescape' })).toThrow(
      '不是合法的 JSON 字符串',
    )
  })

  it('SQL 单引号翻倍', () => {
    expect(escapeSql("a'b")).toBe("a''b")
    expect(unescapeSql("a''b")).toBe("a'b")
  })
})

describe('escape / transform', () => {
  it('默认 HTML 转义', () => {
    expect(transform({ text: '<b>' }, html)).toBe('&lt;b&gt;')
  })

  it('反转义模式', () => {
    expect(transform({ text: '&lt;b&gt;' }, htmlBack)).toBe('<b>')
  })

  it('JS 往返可逆', () => {
    expect(transform({ text: transform({ text: 'a"b' }, js) }, jsBack)).toBe('a"b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, html)).toBe('')
  })
})
