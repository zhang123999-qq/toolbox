import { describe, expect, it } from 'vitest'
import { shift, toSpaces, toTabs, transform } from './utils'

describe('indent / toSpaces', () => {
  it('一个 Tab 换成 4 个空格', () => {
    expect(toSpaces('\tabc', 4)).toBe('    abc')
  })

  it('只动行首，行中间的 Tab 不动', () => {
    expect(toSpaces('\ta\tb', 2)).toBe('  a\tb')
  })
})

describe('indent / toTabs', () => {
  it('8 个空格换成 2 个 Tab', () => {
    expect(toTabs('        abc', 4)).toBe('\t\tabc')
  })

  it('不足一组的空格保留', () => {
    expect(toTabs('   abc', 4)).toBe('   abc')
  })
})

describe('indent / shift', () => {
  it('增加一级缩进', () => {
    expect(shift('abc', 4, 1)).toBe('    abc')
  })

  it('减少一级缩进（空格）', () => {
    expect(shift('      abc', 4, -1)).toBe('  abc')
  })

  it('减少一级缩进（Tab 优先）', () => {
    expect(shift('\t\tabc', 4, -1)).toBe('\tabc')
  })

  it('已经没有缩进时再减也不动', () => {
    expect(shift('abc', 4, -1)).toBe('abc')
  })
})

describe('indent / transform', () => {
  const base = { mode: 'to-spaces', width: '4' } as const

  it('多行逐个转换', () => {
    expect(transform({ text: '\ta\n\t\tb' }, base)).toBe('    a\n        b')
  })

  it('宽度可切成 2', () => {
    expect(transform({ text: '\ta' }, { mode: 'to-spaces', width: '2' })).toBe('  a')
  })

  it('空行原样保留', () => {
    expect(transform({ text: 'a\n\nb' }, { mode: 'increase', width: '4' })).toBe('    a\n\n    b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
