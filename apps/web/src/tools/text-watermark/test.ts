import { describe, expect, it } from 'vitest'
import { embed, extract, transform } from './utils'

describe('text-watermark / embed', () => {
  it('加水印后可见文本不变、长度变长', () => {
    const out = embed('内部文本', 'alice')
    expect(out.startsWith('内部文本')).toBe(true)
    expect(out.length).toBe('内部文本'.length + 'alice'.length * 8)
  })

  it('水印为空时原样返回', () => {
    expect(embed('abc', '')).toBe('abc')
  })

  it('中文水印也能编解码', () => {
    expect(extract(embed('正文', '张三'))).toBe('张三')
  })
})

describe('text-watermark / extract', () => {
  it('解出嵌入的水印', () => {
    expect(extract(embed('正文', 'alice@example.com'))).toBe('alice@example.com')
  })

  it('没有水印时给出说明', () => {
    expect(extract('普通文本')).toContain('没有解出')
  })

  it('零宽空格不属于隐写字母表', () => {
    // U+200B 是排版常用的零宽空格，不该被当成水印位
    expect(extract('a​b')).toContain('没有解出')
  })
})

describe('text-watermark / transform', () => {
  const base = { mode: 'embed' } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '', watermark: 'x' }, base)).toBe('')
  })

  it('extract 模式走读水印分支', () => {
    const marked = transform({ text: '正文', watermark: 'bob' }, base)
    expect(transform({ text: marked, watermark: '' }, { mode: 'extract' })).toBe('bob')
  })
})
