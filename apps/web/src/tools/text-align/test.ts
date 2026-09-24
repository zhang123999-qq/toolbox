import { describe, expect, it } from 'vitest'
import { alignCenter, alignFill, alignLeft, alignRight, pad, transform } from './utils'

describe('text-align / pad', () => {
  it('按显示宽度补齐', () => {
    expect(pad('ab', 5, ' ')).toBe('   ')
  })

  it('中文按 2 列算', () => {
    expect(pad('中文', 6, ' ')).toBe('  ')
  })

  it('已超宽时不补', () => {
    expect(pad('abcdef', 3, ' ')).toBe('')
  })
})

describe('text-align / alignLeft', () => {
  it('右侧补空格', () => {
    expect(alignLeft('ab', 5, ' ')).toBe('ab   ')
  })
})

describe('text-align / alignRight', () => {
  it('左侧补空格', () => {
    expect(alignRight('ab', 5, ' ')).toBe('   ab')
  })
})

describe('text-align / alignCenter', () => {
  it('两侧均分，奇数多给右侧', () => {
    expect(alignCenter('ab', 6, ' ')).toBe('  ab  ')
    expect(alignCenter('ab', 7, ' ')).toBe('  ab   ')
  })
})

describe('text-align / alignFill', () => {
  it('把填充摊到词间', () => {
    expect(alignFill('a b c', 9, ' ')).toBe('a   b   c')
  })

  it('只有一个词时退化为左对齐', () => {
    expect(alignFill('abc', 6, ' ')).toBe('abc   ')
  })
})

describe('text-align / transform', () => {
  const base = { mode: 'left', width: '40', filler: ' ' } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('逐行对齐', () => {
    expect(transform({ text: 'a\nb' }, base)).toBe('a' + ' '.repeat(39) + '\nb' + ' '.repeat(39))
  })

  it('填充字符可换', () => {
    expect(transform({ text: 'ab' }, { ...base, filler: '-' })).toBe('ab' + '-'.repeat(38))
  })

  it('超宽行原样保留', () => {
    // 直接调对齐函数：选项里的宽度只有 20/40/60/80，小宽度用底层函数验证
    expect(alignLeft('abcdefgh', 3, ' ')).toBe('abcdefgh')
  })
})
