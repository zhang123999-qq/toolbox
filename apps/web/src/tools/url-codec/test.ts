import { describe, expect, it } from 'vitest'
import { decodeUrl, encodeUrl, transform } from './utils'

const cEnc = { direction: 'encode', mode: 'component' } as const
const cDec = { direction: 'decode', mode: 'component' } as const
const uEnc = { direction: 'encode', mode: 'uri' } as const
const uDec = { direction: 'decode', mode: 'uri' } as const

describe('url-codec / encode', () => {
  it('component 模式转义结构字符', () => {
    expect(encodeUrl('a b&c=d', 'component')).toBe('a%20b%26c%3Dd')
  })

  it('uri 模式保留 URL 结构字符', () => {
    expect(encodeUrl('https://a.com/b?c=1&d=2', 'uri')).toBe('https://a.com/b?c=1&d=2')
  })

  it('中文按 UTF-8 百分号编码', () => {
    expect(encodeUrl('工具库', 'component')).toBe('%E5%B7%A5%E5%85%B7%E5%BA%93')
  })

  it("补转义 !'()* 这类 encodeURIComponent 不处理的字符", () => {
    expect(encodeUrl("!'()*", 'component')).toBe('%21%27%28%29%2A')
  })

  it('空格编码为 %20 而不是 +', () => {
    expect(encodeUrl(' ', 'component')).toBe('%20')
  })
})

describe('url-codec / decode', () => {
  it('解回原始文本', () => {
    expect(decodeUrl('a%20b%26c%3Dd', 'component')).toBe('a b&c=d')
  })

  it('中文还原', () => {
    expect(decodeUrl('%E5%B7%A5%E5%85%B7%E5%BA%93', 'component')).toBe('工具库')
  })

  it('把 + 按表单语义还原为空格', () => {
    expect(decodeUrl('a+b', 'component')).toBe('a b')
  })

  it('uri 模式保留结构字符', () => {
    expect(decodeUrl('https://a.com/%E5%B7%A5', 'uri')).toBe('https://a.com/工')
  })

  it('残缺转义明确报错', () => {
    expect(() => decodeUrl('%E5%B7', 'component')).toThrow(/不合法的百分号转义|残缺/)
  })

  it('% 后不是十六进制时报错', () => {
    expect(() => decodeUrl('%zz', 'component')).toThrow()
  })
})

describe('url-codec / transform', () => {
  it('双向往返一致', () => {
    for (const text of ['a b&c=1', '工具库', 'a/b?c#d']) {
      expect(transform({ text: encodeUrl(text, 'component') }, cDec)).toBe(text)
    }
  })

  it('按选项模式执行', () => {
    expect(transform({ text: 'a b' }, cEnc)).toBe('a%20b')
    expect(transform({ text: 'a%20b' }, cDec)).toBe('a b')
    expect(transform({ text: 'a b' }, uEnc)).toBe('a%20b')
    expect(transform({ text: 'a%20b' }, uDec)).toBe('a b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, cEnc)).toBe('')
    expect(transform({ text: '' }, cDec)).toBe('')
  })
})
