import { describe, expect, it } from 'vitest'
import { MARKER, count, mark, strip, transform } from './utils'

describe('text-unwatermark / strip', () => {
  it('移除零宽字符', () => {
    expect(strip('a​b‌c‍d')).toBe('abcd')
  })

  it('移除方向控制字符', () => {
    expect(strip('a‮b‬c')).toBe('abc')
  })

  it('普通文本不受影响', () => {
    expect(strip('普通文本 123')).toBe('普通文本 123')
  })

  it('保留换行与空格', () => {
    expect(strip('a\nb c')).toBe('a\nb c')
  })
})

describe('text-unwatermark / mark', () => {
  it('把零宽字符换成可见标记', () => {
    expect(mark('a​b')).toBe('a' + MARKER + 'b')
  })

  it('没有零宽字符时原样返回', () => {
    expect(mark('abc')).toBe('abc')
  })
})

describe('text-unwatermark / count', () => {
  it('统计个数', () => {
    expect(count('a​b‌c')).toBe(2)
  })
})

describe('text-unwatermark / transform', () => {
  const base = { mode: 'strip' } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('mark 模式走标记分支', () => {
    expect(transform({ text: 'a​b' }, { mode: 'mark' })).toBe('a' + MARKER + 'b')
  })

  it('清掉 #57 加的水印后读不回来', () => {
    // 与 #57 的字母表一致：U+200C / U+200D 都会被清掉
    expect(strip('正文' + '‌‍‌‍‌‍‌‍')).toBe('正文')
  })
})
