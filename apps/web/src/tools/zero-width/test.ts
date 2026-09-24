import { describe, expect, it } from 'vitest'
import { isZeroWidth, transform } from './utils'

describe('zero-width / isZeroWidth', () => {
  it('零宽空格与 BOM 算零宽字符', () => {
    expect(isZeroWidth(0x200b)).toBe(true)
    expect(isZeroWidth(0xfeff)).toBe(true)
  })

  it('普通字符与不换行空格不算', () => {
    expect(isZeroWidth(0x41)).toBe(false)
    expect(isZeroWidth(0x00a0)).toBe(false)
  })
})

describe('zero-width / transform', () => {
  const base = { mode: 'detect' } as const

  it('detect 列出位置与名称', () => {
    const out = transform({ text: 'a​b' }, base)
    expect(out).toContain('第 1 行第 2 列：U+200B 零宽空格')
    expect(out).toContain('共 1 处')
  })

  it('没有零宽字符时明确说明', () => {
    expect(transform({ text: 'abc' }, base)).toBe('未检测到零宽字符')
  })

  it('remove 删除零宽字符但保留其它内容', () => {
    expect(transform({ text: 'a​b﻿c' }, { mode: 'remove' })).toBe('abc')
  })

  it('extract 输出码位序列', () => {
    expect(transform({ text: 'a​b‌c' }, { mode: 'extract' })).toBe('U+200B U+200C')
  })

  it('连续零宽字符较多时提示疑似水印', () => {
    const hidden = '​‌‍​‌‍​‌‍​‌‍'
    expect(transform({ text: 'a' + hidden + 'b' }, base)).toContain('疑似嵌入了隐藏水印')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
