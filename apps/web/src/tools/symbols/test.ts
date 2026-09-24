import { describe, expect, it } from 'vitest'
import { SYMBOLS, search, symbolText } from './utils'

describe('symbols / search', () => {
  it('按中文分类名命中', () => {
    expect(search('箭头', 'all').map((i) => i.char)).toContain('→')
  })

  it('按英文关键词命中', () => {
    expect(search('arrow', 'all').map((i) => i.char)).toContain('→')
  })

  it('按分类过滤', () => {
    expect(search('', 'currency').every((i) => i.group === 'currency')).toBe(true)
  })

  it('可以直接把符号本身当关键词', () => {
    expect(search('¥', 'all').length).toBeGreaterThanOrEqual(1)
  })

  it('查不到时返回空数组', () => {
    expect(search('zzzzzz', 'all')).toEqual([])
  })
})

describe('symbols / symbolText', () => {
  it('拼接命中的符号', () => {
    expect(symbolText({ text: '人民币' }, { category: 'all' })).toContain('¥')
  })

  it('分类过滤生效', () => {
    expect(symbolText({ text: '' }, { category: 'greek' })).toContain('α')
    expect(symbolText({ text: '' }, { category: 'greek' })).not.toContain('→')
  })
})

describe('symbols / SYMBOLS', () => {
  it('分类取值都在选项范围内', () => {
    const allowed = [
      'math',
      'arrow',
      'currency',
      'unit',
      'punct',
      'box',
      'star',
      'check',
      'number',
      'greek',
      'roman',
    ]
    expect(SYMBOLS.every((i) => allowed.includes(i.group))).toBe(true)
  })
})
