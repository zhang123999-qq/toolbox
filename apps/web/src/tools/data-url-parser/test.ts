import { describe, expect, it } from 'vitest'
import { DataUrlParserError, hexDump, parseDataUrl, percentDecode, transform } from './utils'
import type { DataUrlParserInput, DataUrlParserOptions } from './schema'

const report: DataUrlParserOptions = { format: 'report' }
const asJson: DataUrlParserOptions = { format: 'json' }
const asRaw: DataUrlParserOptions = { format: 'raw' }

const TEXT_URL: DataUrlParserInput = {
  text: 'data:text/plain;charset=utf-8;base64,5bel5YW35bqTCg==',
}

describe('data-url-parser / transform', () => {
  it('解析出媒体类型、参数与字节数', () => {
    const parsed = parseDataUrl(TEXT_URL.text)
    expect(parsed.mediaType).toBe('text/plain;charset=utf-8')
    expect(parsed.essence).toBe('text/plain')
    expect(parsed.base64).toBe(true)
    expect(parsed.charset).toBe('utf-8')
    expect(parsed.byteLength).toBe(10)
    expect(parsed.binary).toBe(false)
    expect(parsed.text).toBe('工具库\n')
  })

  it('report 形式逐项列出关键字段', () => {
    const out = transform(TEXT_URL, report)
    expect(out).toContain('媒体类型: text/plain;charset=utf-8')
    expect(out).toContain('字节数: 10 字节')
    expect(out).toContain('内容形态: 文本（合法 UTF-8）')
    expect(out).toContain('工具库')
  })

  it('json 形式可被 JSON.parse 还原', () => {
    const parsed = JSON.parse(transform(TEXT_URL, asJson)) as Record<string, unknown>
    expect(parsed.base64).toBe(true)
    expect(parsed.byteLength).toBe(10)
    expect(parsed.text).toBe('工具库\n')
  })

  it('raw 形式只给还原出的正文', () => {
    expect(transform(TEXT_URL, asRaw)).toBe('工具库\n')
  })

  it('百分号编码分支按 UTF-8 拼字节，未转义汉字也照收', () => {
    const out = transform({ text: 'data:text/plain,hello%20世界' }, asRaw)
    expect(out).toBe('hello 世界')
    expect(parseDataUrl('data:text/plain,hi').byteLength).toBe(2)
  })

  it('Base64 带换行与 URL 安全变体都能解（边界）', () => {
    const wrapped: DataUrlParserInput = { text: 'data:application/json;base64,aGVs\n bG8g5L iW' }
    expect(transform(wrapped, asRaw)).toBe('hello 世')
    expect(transform({ text: 'data:application/octet-stream;base64,iVBORw0KGgo=' }, asRaw)).toBe(
      '89 50 4e 47 0d 0a 1a 0a',
    )
  })

  it('二进制载荷判为 binary 并给出十六进制转储', () => {
    const parsed = parseDataUrl('data:image/png;base64,iVBORw0KGgo=')
    expect(parsed.binary).toBe(true)
    expect(transform({ text: 'data:image/png;base64,iVBORw0KGgo=' }, report)).toContain(
      '内容形态: 二进制',
    )
    expect(transform({ text: 'data:image/png;base64,iVBORw0KGgo=' }, asRaw)).toContain('89 50')
  })

  it('缺少媒体类型时回落到 text/plain（边界）', () => {
    expect(parseDataUrl('data:,abc').mediaType).toBe('text/plain')
    expect(parseDataUrl('data:;charset=utf-8,abc').charset).toBe('utf-8')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, report)).toBe('')
    expect(transform({ text: '   ' }, report)).toBe('')
  })

  it('不是 Data URL 时抛 DataUrlParserError（异常）', () => {
    expect(() => transform({ text: 'https://example.com/a.png' }, report)).toThrow(
      DataUrlParserError,
    )
  })

  it('缺少逗号、百分号转义不完整都抛错（异常）', () => {
    expect(() => transform({ text: 'data:text/plainabc' }, report)).toThrow(DataUrlParserError)
    expect(() => transform({ text: 'data:text/plain,%E4%B' }, report)).toThrow(DataUrlParserError)
    expect(() => transform({ text: 'data:text/plain;base64,@@@@' }, report)).toThrow(
      DataUrlParserError,
    )
  })

  it('超长输入抛出中文上限提示（边界）', () => {
    expect(() => transform({ text: 'data:text/plain,' + 'a'.repeat(2_000_000) }, report)).toThrow(
      DataUrlParserError,
    )
  })

  it('hexDump 超过上限时截断并标注总量', () => {
    const bytes = new Uint8Array(10).fill(0xff)
    expect(hexDump(bytes, 4)).toContain('共 10 字节')
    expect(percentDecode('%41')).toEqual(Uint8Array.from([0x41]))
  })
})
