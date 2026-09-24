import { describe, expect, it } from 'vitest'
import { toPinyin, transform } from './utils'

describe('slug / toPinyin', () => {
  it('中英混排标题转成拼音且保留非中文部分', () => {
    const out = toPinyin('Hello 中文')
    expect(out).toContain('Hello')
    expect(out.toLowerCase()).toContain('zhong')
    expect(out.toLowerCase()).toContain('wen')
  })
})

describe('slug / transform', () => {
  const base = { chinese: 'pinyin', separator: 'dash', lowercase: true } as const

  it('英文标题转小写连字符 slug', () => {
    expect(transform({ text: 'Hello World' }, base)).toBe('hello-world')
  })

  it('中文标题转拼音 slug', () => {
    const out = transform({ text: '中文标题' }, base)
    expect(out).toMatch(/^[a-z0-9-]+$/)
    expect(out.split('-')).toHaveLength(4)
  })

  it('下划线分隔符', () => {
    expect(transform({ text: 'Hello World' }, { ...base, separator: 'underscore' })).toBe(
      'hello_world',
    )
  })

  it('lowercase 关闭时保留原大小写', () => {
    expect(transform({ text: 'Hello World' }, { ...base, lowercase: false })).toBe('Hello-World')
  })

  it('chinese=keep 时保留汉字', () => {
    expect(transform({ text: '中文标题' }, { ...base, chinese: 'keep' })).toBe('中文标题')
  })

  it('chinese=drop 时丢掉汉字', () => {
    expect(transform({ text: '中文 abc' }, { ...base, chinese: 'drop' })).toBe('abc')
  })

  it('变音符号被去掉（café → cafe）', () => {
    expect(transform({ text: 'Café Crème' }, base)).toBe('cafe-creme')
  })

  it('连续标点只留一个分隔符，且首尾不留分隔符', () => {
    expect(transform({ text: '  ——Hello!!  World——  ' }, base)).toBe('hello-world')
  })

  it('纯符号输入返回空串（边界）', () => {
    expect(transform({ text: '！！！' }, base)).toBe('')
  })
})
