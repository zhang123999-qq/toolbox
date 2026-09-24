import { describe, expect, it } from 'vitest'
import { decodeEntities, stripTags, transform } from './utils'
import type { RichToTextOptions } from './schema'

const keep: RichToTextOptions = { keepLineBreaks: true }
const flat: RichToTextOptions = { keepLineBreaks: false }

describe('rich-to-text / decodeEntities', () => {
  it('解码具名实体', () => {
    expect(decodeEntities('a &amp; b')).toBe('a & b')
  })

  it('解码数字与十六进制实体', () => {
    expect(decodeEntities('&#65;&#x42;')).toBe('AB')
  })

  it('未知实体保持原样', () => {
    expect(decodeEntities('&foo;')).toBe('&foo;')
  })
})

describe('rich-to-text / stripTags', () => {
  it('去掉标签保留文本', () => {
    expect(stripTags('<p>本地<strong>优先</strong></p>', false)).toBe('本地优先')
  })

  it('块级标签转成换行', () => {
    expect(stripTags('<p>a</p><p>b</p>', true)).toBe('a\nb')
  })

  it('关闭保留换行时压成一行', () => {
    expect(stripTags('<p>a</p><p>b</p>', false)).toBe('a b')
  })

  it('丢弃 script 与 style 的内容', () => {
    expect(stripTags('<style>p{}</style><p>正文</p>', false)).toBe('正文')
    expect(stripTags('<script>x=1</script><p>正文</p>', false)).toBe('正文')
  })
})

describe('rich-to-text / transform', () => {
  it('默认保留换行', () => {
    expect(transform({ text: '<p>a</p><p>b</p>' }, keep)).toBe('a\nb')
  })

  it('关闭保留换行时输出一行', () => {
    expect(transform({ text: '<p>a</p><p>b</p>' }, flat)).toBe('a b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '  ' }, keep)).toBe('')
  })
})
