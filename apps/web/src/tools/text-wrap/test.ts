import { describe, expect, it } from 'vitest'
import { hardBreak, tokenize, transform, wrapLine } from './utils'

describe('text-wrap / tokenize', () => {
  it('中文按字切', () => {
    expect(tokenize('中文')).toEqual(['中', '文'])
  })

  it('英文按词切并带上其后空格', () => {
    expect(tokenize('ab cd')).toEqual(['ab ', 'cd'])
  })
})

describe('text-wrap / hardBreak', () => {
  it('按显示宽度硬切', () => {
    expect(hardBreak('abcdef', 3)).toEqual(['abc', 'def'])
  })

  it('中文按 2 列切', () => {
    expect(hardBreak('一二三四', 4)).toEqual(['一二', '三四'])
  })
})

describe('text-wrap / wrapLine', () => {
  const noBreak = false

  it('按词折行', () => {
    expect(wrapLine('aa bb cc', 5, 'word', noBreak)).toEqual(['aa', 'bb cc'])
  })

  it('按字符折行', () => {
    expect(wrapLine('abcdef', 3, 'char', noBreak)).toEqual(['abc', 'def'])
  })

  it('超长词默认硬切', () => {
    expect(wrapLine('abcdefgh', 3, 'word', true)).toEqual(['abc', 'def', 'gh'])
  })

  it('关闭硬切时超长词独占一行', () => {
    expect(wrapLine('abcdefgh', 3, 'word', noBreak)).toEqual(['abcdefgh'])
  })
})

describe('text-wrap / transform', () => {
  const base = { mode: 'auto', width: '40', breakLong: true } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('空行保持为空行', () => {
    expect(transform({ text: 'a\n\nb' }, base)).toBe('a\n\nb')
  })

  it('中文按显示宽度折行', () => {
    // 底层函数可以传任意宽度；选项里的宽度只有 40/60/80
    expect(wrapLine('一二三四五六', 4, 'auto', true).join('\n')).toBe('一二\n三四\n五六')
  })

  it('auto 模式下英文按词折', () => {
    expect(wrapLine('aa bb cc', 5, 'auto', true)).toEqual(['aa', 'bb cc'])
  })

  it('整体折行后按设定宽度切成多行', () => {
    // 25 个汉字 = 50 列，按 40 列折应得到两行
    const out = transform({ text: '一'.repeat(25) }, { mode: 'auto', width: '40', breakLong: true })
    expect(out.split('\n')).toHaveLength(2)
  })
})
