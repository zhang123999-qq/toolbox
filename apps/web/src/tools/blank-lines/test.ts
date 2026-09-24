import { describe, expect, it } from 'vitest'
import { collapseBlank, isBlank, removeBlank, transform, trimBlank } from './utils'

describe('blank-lines / isBlank', () => {
  it('真空行与只含空白的行都算空行', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('\t')).toBe(true)
  })

  it('有内容的行不算空行', () => {
    expect(isBlank(' a ')).toBe(false)
  })

  it('行尾的 CR 不影响判定', () => {
    expect(isBlank('  \r')).toBe(true)
  })
})

describe('blank-lines / removeBlank', () => {
  it('删掉所有空行', () => {
    expect(removeBlank(['a', '', 'b', '   ', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('全是空行时返回空数组', () => {
    expect(removeBlank(['', '  '])).toEqual([])
  })
})

describe('blank-lines / collapseBlank', () => {
  it('连续空行压缩成一个（压出来的空行不留残余空格）', () => {
    expect(collapseBlank(['a', '', '', 'b'])).toEqual(['a', '', 'b'])
    expect(collapseBlank(['a', '', '   ', 'b'])).toEqual(['a', '', 'b'])
  })

  it('单个空行保持不动', () => {
    expect(collapseBlank(['a', '', 'b'])).toEqual(['a', '', 'b'])
  })
})

describe('blank-lines / trimBlank', () => {
  it('只去掉首尾空行', () => {
    expect(trimBlank(['', 'a', '', 'b', ''])).toEqual(['a', '', 'b'])
  })

  it('全是空行时返回空数组', () => {
    expect(trimBlank(['', ' '])).toEqual([])
  })
})

describe('blank-lines / transform', () => {
  const base = { mode: 'remove' } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('remove 模式删光空行', () => {
    expect(transform({ text: 'a\n\n\nb' }, base)).toBe('a\nb')
  })

  it('collapse 模式留一个空行', () => {
    expect(transform({ text: 'a\n\n\nb' }, { mode: 'collapse' })).toBe('a\n\nb')
  })

  it('trim 模式只去首尾', () => {
    expect(transform({ text: '\na\n\nb\n' }, { mode: 'trim' })).toBe('a\n\nb')
  })
})
