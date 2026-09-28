import { describe, expect, it } from 'vitest'
import type { StructuredDataOptions } from './schema'
import {
  analyzeStructuredData,
  extractJsonLd,
  jsonErrorHint,
  renderReport,
  transform,
  validateJsonLd,
} from './utils'

const htmlSource: StructuredDataOptions = { source: '网页 HTML' }
const jsonSource: StructuredDataOptions = { source: 'JSON-LD 文本' }

const VALID = '{"@context":"https://schema.org","@type":"Article","headline":"Hi"}'

describe('structured-data / extractJsonLd', () => {
  it('提取多块并去空', () => {
    const html = `<html><head>
      <script type="application/ld+json">${VALID}</script>
      <script type="application/ld+json">   </script>
      <script type="text/javascript">var a = 1;</script>
      <script TYPE="application/ld+json">{"@type":"WebSite"}</script>
    </head></html>`
    const blocks = extractJsonLd(html)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toBe(VALID)
  })

  it('无匹配返回空数组', () => {
    expect(extractJsonLd('<html><body>no ld</body></html>')).toEqual([])
  })

  it('属性顺序打乱也能提取', () => {
    const html = `<script async type="application/ld+json">${VALID}</script>`
    expect(extractJsonLd(html)).toHaveLength(1)
  })
})

describe('structured-data / jsonErrorHint', () => {
  it('无位置信息时原样返回', () => {
    expect(jsonErrorHint(new Error('Unexpected end of JSON input'))).toBe(
      'JSON 解析失败：Unexpected end of JSON input',
    )
  })
  it('at position 提示字符位置', () => {
    expect(jsonErrorHint(new Error('Unexpected token } in JSON at position 12'))).toContain(
      '约第 12 个字符附近',
    )
  })
  it('line/column 提示行列', () => {
    expect(jsonErrorHint(new Error('Error at line 3 column 7'))).toContain('第 3 行第 7 列')
  })
  it('非 Error 输入转字符串', () => {
    expect(jsonErrorHint('boom')).toBe('JSON 解析失败：boom')
  })
})

describe('structured-data / validateJsonLd', () => {
  it('空内容失败', () => {
    const r = validateJsonLd('   ')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('为空')
  })

  it('非法 JSON 失败', () => {
    const r = validateJsonLd('{"a":}')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('JSON 解析失败')
  })

  it('顶层非对象失败：字符串 / null / 数组', () => {
    expect(validateJsonLd('"str"').error).toContain('顶层必须是对象')
    expect(validateJsonLd('null').error).toContain('顶层必须是对象')
    expect(validateJsonLd('[1,2]').error).toContain('顶层必须是对象')
  })

  it('完整合法通过且无备注', () => {
    const r = validateJsonLd(VALID)
    expect(r).toMatchObject({
      ok: true,
      type: 'Article',
      context: 'https://schema.org',
      note: '',
      error: null,
    })
  })

  it('缺 @type 与 @context 给备注', () => {
    const r = validateJsonLd('{"name":"x"}')
    expect(r.ok).toBe(true)
    expect(r.type).toBe('（缺失 @type）')
    expect(r.context).toBe('（缺失 @context）')
    expect(r.note).toContain('@context')
    expect(r.note).toContain('@type')
  })

  it('@type 非字符串视作缺失', () => {
    const r = validateJsonLd('{"@context":"https://schema.org","@type":42}')
    expect(r.type).toBe('（缺失 @type）')
    expect(r.note).toContain('@type')
  })

  it('@type 空字符串视作缺失', () => {
    const r = validateJsonLd('{"@context":"https://schema.org","@type":""}')
    expect(r.type).toBe('（缺失 @type）')
  })

  it('只缺 @context', () => {
    const r = validateJsonLd('{"@type":"Article"}')
    expect(r.context).toBe('（缺失 @context）')
    expect(r.note).not.toContain('@type')
  })
})

describe('structured-data / analyzeStructuredData', () => {
  it('HTML 模式逐块校验并编号', () => {
    const html = `<script type="application/ld+json">${VALID}</script><script type="application/ld+json">bad</script>`
    const blocks = analyzeStructuredData(html, '网页 HTML')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ index: 1, ok: true })
    expect(blocks[1]).toMatchObject({ index: 2, ok: false })
  })

  it('JSON 模式整段作一块', () => {
    const blocks = analyzeStructuredData(VALID, 'JSON-LD 文本')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].ok).toBe(true)
  })
})

describe('structured-data / renderReport', () => {
  it('无块时提示未找到', () => {
    const out = renderReport([], '网页 HTML')
    expect(out).toContain('未找到')
  })

  it('混合结果渲染统计与明细', () => {
    const blocks = analyzeStructuredData(
      `<script type="application/ld+json">${VALID}</script><script type="application/ld+json">{"@type":"X"}</script><script type="application/ld+json">bad</script>`,
      '网页 HTML',
    )
    const out = renderReport(blocks, '网页 HTML')
    expect(out).toContain('共 3 块 JSON-LD：2 通过 / 1 失败')
    expect(out).toContain('[#1] 通过')
    expect(out).toContain('@type：Article')
    expect(out).toContain('[#2] 通过')
    expect(out).toContain('备注：缺少 @context')
    expect(out).toContain('[#3] 失败')
    expect(out).toContain('错误：JSON 解析失败')
  })

  it('通过且无备注时不渲染备注行', () => {
    const out = renderReport(analyzeStructuredData(VALID, 'JSON-LD 文本'), 'x')
    expect(out).not.toContain('备注：')
  })
})

describe('structured-data / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '   ' }, htmlSource)).toBe('')
  })
  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(500001) }, htmlSource)).toThrow(/上限/)
  })
  it('HTML 模式', () => {
    const out = transform(
      { text: `<script type="application/ld+json">${VALID}</script>` },
      htmlSource,
    )
    expect(out).toContain('来源：网页 HTML')
    expect(out).toContain('1 通过')
  })
  it('HTML 模式无块', () => {
    const out = transform({ text: '<html></html>' }, htmlSource)
    expect(out).toContain('未找到')
  })
  it('JSON 模式', () => {
    const out = transform({ text: VALID }, jsonSource)
    expect(out).toContain('来源：粘贴的 JSON-LD 文本')
    expect(out).toContain('@type：Article')
  })
})
