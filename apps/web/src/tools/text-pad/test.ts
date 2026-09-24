import { describe, expect, it } from 'vitest'
import { filler, padBoth, padCenter, padLeft, padRight, transform } from './utils'

describe('text-pad / filler', () => {
  it('按长度造填充串', () => {
    expect(filler(3, '0')).toBe('000')
  })

  it('多字符 filler 循环后截断', () => {
    expect(filler(5, 'ab')).toBe('ababa')
  })

  it('长度非正时返回空串', () => {
    expect(filler(0, '0')).toBe('')
    expect(filler(-1, '0')).toBe('')
  })

  it('filler 为空串时退化成空格', () => {
    expect(filler(2, '')).toBe('  ')
  })
})

describe('text-pad / padLeft', () => {
  it('左侧补零', () => {
    expect(padLeft('1', 4, '0')).toBe('0001')
  })

  it('已够长时不补', () => {
    expect(padLeft('12345', 3, '0')).toBe('12345')
  })
})

describe('text-pad / padRight', () => {
  it('右侧补零', () => {
    expect(padRight('1', 4, '0')).toBe('1000')
  })
})

describe('text-pad / padCenter', () => {
  it('两侧均分，奇数多给右侧', () => {
    expect(padCenter('ab', 6, '-')).toBe('--ab--')
    expect(padCenter('ab', 7, '-')).toBe('--ab---')
  })
})

describe('text-pad / padBoth', () => {
  it('两边各填到指定长度', () => {
    expect(padBoth('a', 2, '-')).toBe('--a--')
  })
})

describe('text-pad / transform', () => {
  const base = { mode: 'left', length: '8', filler: '0' } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('逐行填充', () => {
    expect(transform({ text: '1\n42' }, { ...base, length: '16' })).toBe(
      '0000000000000001\n0000000000000042',
    )
  })

  it('换填充字符生效', () => {
    expect(transform({ text: 'ab' }, { ...base, length: '8', filler: '-' })).toBe('------ab')
  })

  it('切到两侧填充时两边都加', () => {
    expect(transform({ text: 'ab' }, { ...base, mode: 'both' })).toBe('00000000ab00000000')
  })

  it('居中填充时两侧均分', () => {
    expect(transform({ text: 'ab' }, { ...base, mode: 'center' })).toBe('000ab000')
  })
})
