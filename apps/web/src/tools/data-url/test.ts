import { describe, expect, it } from 'vitest'
import { encodeDataUrl, formatParsed, parseDataUrl, transform } from './utils'

const b64 = { direction: 'encode', mode: 'base64', type: 'text/plain' } as const
const url = { direction: 'encode', mode: 'url', type: 'text/plain' } as const
const dec = { direction: 'decode', mode: 'base64', type: 'text/plain' } as const

describe('data-url / 生成', () => {
  it('base64 模式生成 text/plain 的 Data URL', () => {
    expect(encodeDataUrl('工具库', 'base64', 'text/plain')).toBe(
      'data:text/plain;charset=utf-8;base64,5bel5YW35bqT',
    )
  })

  it('url 模式把非安全字符百分号转义', () => {
    expect(encodeDataUrl('工具库', 'url', 'text/plain')).toBe(
      'data:text/plain;charset=utf-8,%E5%B7%A5%E5%85%B7%E5%BA%93',
    )
  })

  it('非 text/* 类型不追加 charset', () => {
    expect(encodeDataUrl('Hi', 'base64', 'image/png')).toBe('data:image/png;base64,SGk=')
  })

  it('类型里已带参数时原样保留，不重复追加', () => {
    expect(encodeDataUrl('Hi', 'base64', 'text/plain;charset=gbk')).toBe(
      'data:text/plain;charset=gbk;base64,SGk=',
    )
  })

  it('类型留空时回落到 text/plain', () => {
    expect(encodeDataUrl('Hi', 'base64', '  ')).toBe('data:text/plain;charset=utf-8;base64,SGk=')
  })
})

describe('data-url / 解析', () => {
  it('拆出 MIME / 字符集 / base64 标记，并还原文本', () => {
    const parsed = parseDataUrl('data:text/plain;charset=utf-8;base64,5bel5YW35bqT')
    expect(parsed.mime).toBe('text/plain')
    expect(parsed.charset).toBe('utf-8')
    expect(parsed.base64).toBe(true)
    expect(parsed.binary).toBe(false)
    expect(parsed.content).toBe('工具库')
  })

  it('url 模式载荷按百分号解码还原', () => {
    expect(parseDataUrl('data:text/plain;charset=utf-8,%E4%B8%AD').content).toBe('中')
  })

  it('省略 MIME 时回落到 text/plain，且字符集标记为未指定', () => {
    const parsed = parseDataUrl('data:,Hi')
    expect(parsed.mime).toBe('text/plain')
    expect(parsed.charset).toBe('')
    expect(parsed.content).toBe('Hi')
  })

  it('二进制内容给出十六进制预览并标记 binary', () => {
    const parsed = parseDataUrl('data:application/octet-stream;base64,/w==')
    expect(parsed.binary).toBe(true)
    expect(parsed.bytes).toBe(1)
    expect(parsed.content).toBe('ff')
  })

  it('格式化输出包含各项元信息', () => {
    const text = formatParsed(parseDataUrl('data:image/png;base64,SGk='))
    expect(text).toContain('MIME 类型: image/png')
    expect(text).toContain('字符集: 未指定')
    expect(text).toContain('Base64: 是')
    expect(text).toContain('内容:\nHi')
  })
})

describe('data-url / transform', () => {
  it('按方向执行', () => {
    expect(transform({ text: '工具库' }, b64)).toBe(
      'data:text/plain;charset=utf-8;base64,5bel5YW35bqT',
    )
    expect(transform({ text: '工具库' }, url)).toBe(
      'data:text/plain;charset=utf-8,%E5%B7%A5%E5%85%B7%E5%BA%93',
    )
    expect(transform({ text: 'data:text/plain;charset=utf-8;base64,5bel5YW35bqT' }, dec)).toContain(
      '内容:\n工具库',
    )
  })

  it('生成 → 解析能拿回原文（往返一致）', () => {
    const text = '中文 abc 🚀'
    for (const mode of ['base64', 'url'] as const) {
      const dataUrl = encodeDataUrl(text, mode, 'text/plain')
      expect(parseDataUrl(dataUrl).content).toBe(text)
    }
  })

  it('url 模式下空格不被当成 +，往返不丢空格', () => {
    const parsed = parseDataUrl(encodeDataUrl('a b', 'url', 'text/plain'))
    expect(parsed.content).toBe('a b')
  })

  it('空串返回空串（边界）', () => {
    expect(transform({ text: '' }, b64)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('输入不是 Data URL 时报错', () => {
    expect(() => transform({ text: 'not-a-data-url' }, dec)).toThrow(/不是 data: 开头/)
  })

  it('base64 载荷非法时报错', () => {
    expect(() => transform({ text: 'data:text/plain;base64,!!!!' }, dec)).toThrow(
      /不是合法的 Base64/,
    )
  })

  it('百分号转义不完整时报错', () => {
    expect(() => transform({ text: 'data:text/plain,%ZZ' }, dec)).toThrow(/百分号转义不完整/)
  })
})
