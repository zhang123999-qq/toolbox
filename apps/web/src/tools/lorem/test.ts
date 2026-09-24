import { describe, expect, it } from 'vitest'
import { lexiconOf, transform } from './utils'

describe('lorem / lexiconOf', () => {
  it('自定义词库优先于内置词库', () => {
    expect(lexiconOf({ text: 'alpha beta' }, { language: 'en', unit: 'word', count: '1' })).toEqual(
      ['alpha', 'beta'],
    )
  })

  it('输入为空时回落内置词库', () => {
    const words = lexiconOf({ text: '   ' }, { language: 'zh', unit: 'word', count: '1' })
    expect(words.length).toBeGreaterThan(10)
  })
})

describe('lorem / transform', () => {
  it('英文按词数生成', () => {
    const out = transform({ text: '' }, { language: 'en', unit: 'word', count: '5' })
    expect(out.split(' ')).toHaveLength(5)
  })

  it('自定义词库时输出只含词库里的词', () => {
    const out = transform({ text: 'alpha beta' }, { language: 'en', unit: 'word', count: '5' })
    for (const word of out.split(' ')) expect(['alpha', 'beta']).toContain(word)
  })

  it('中文段落以句号结尾，且不含空格', () => {
    const out = transform({ text: '' }, { language: 'zh', unit: 'paragraph', count: '1' })
    expect(out.endsWith('。')).toBe(true)
    expect(out).not.toContain(' ')
  })

  it('英文句子首字母大写并以句号结尾', () => {
    const out = transform({ text: '' }, { language: 'en', unit: 'sentence', count: '1' })
    expect(out.endsWith('.')).toBe(true)
    expect(out[0]).toBe(out[0].toUpperCase())
  })

  it('拉丁词库只出拉丁字母与空格', () => {
    const out = transform({ text: '' }, { language: 'latin', unit: 'word', count: '5' })
    expect(out).toMatch(/^[A-Za-z ]+$/)
  })

  it('多个单位用换行分隔', () => {
    const out = transform({ text: '' }, { language: 'en', unit: 'sentence', count: '3' })
    expect(out.split('\n')).toHaveLength(3)
  })

  it('空输入也能生成（用内置词库）', () => {
    expect(
      transform({ text: '' }, { language: 'zh', unit: 'word', count: '1' }).length,
    ).toBeGreaterThan(0)
  })
})
