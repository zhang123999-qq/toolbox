import { describe, expect, it } from 'vitest'
import { isInvisible, transform } from './utils'

describe('invisible-chars / isInvisible', () => {
  it('零宽空格与不换行空格算不可见', () => {
    expect(isInvisible(0x200b, true)).toBe(true)
    expect(isInvisible(0x00a0, true)).toBe(true)
  })

  it('默认保留常见空白', () => {
    expect(isInvisible(0x09, true)).toBe(false)
    expect(isInvisible(0x0a, true)).toBe(false)
  })

  it('取消保留后常见空白也算不可见', () => {
    expect(isInvisible(0x09, false)).toBe(true)
  })

  it('普通字符不算不可见', () => {
    expect(isInvisible(0x41, true)).toBe(false)
    expect(isInvisible(0x4e2d, true)).toBe(false)
  })
})

describe('invisible-chars / transform', () => {
  const base = { mode: 'mark', keepCommon: true } as const

  it('mark 模式把不可见字符换成可见标记', () => {
    expect(transform({ text: 'a b' }, base)).toBe('a[U+00A0]b')
  })

  it('remove 模式删掉不可见字符', () => {
    expect(transform({ text: 'a b​c' }, { mode: 'remove', keepCommon: true })).toBe('abc')
  })

  it('list 模式列出位置与名称', () => {
    const out = transform({ text: 'a b' }, { mode: 'list', keepCommon: true })
    expect(out).toContain('第 1 行第 2 列：U+00A0 不换行空格')
    expect(out).toContain('共 1 处')
  })

  it('没有不可见字符时计数为 0', () => {
    expect(transform({ text: 'abc' }, { mode: 'list', keepCommon: true })).toBe('共 0 处')
  })

  it('关闭 keepCommon 后制表符也会被标出', () => {
    expect(transform({ text: 'a\tb' }, { mode: 'mark', keepCommon: false })).toBe('a[U+0009]b')
  })

  it('换行本身不被标记', () => {
    expect(transform({ text: 'a\nb' }, base)).toBe('a\nb')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
