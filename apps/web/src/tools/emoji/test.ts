import { describe, expect, it } from 'vitest'
import { EMOJIS, emojiText, search } from './utils'

describe('emoji / search', () => {
  it('按中文名命中', () => {
    expect(search('笑', 'all').map((i) => i.char)).toContain('😀')
  })

  it('按英文关键词命中', () => {
    expect(search('smile', 'all').map((i) => i.char)).toContain('😀')
  })

  it('按分类过滤', () => {
    expect(search('', 'flag').every((i) => i.group === 'flag')).toBe(true)
  })

  it('关键词为空时返回该分类全部', () => {
    expect(search('', 'face').length).toBeGreaterThan(1)
  })

  it('可以直接把 Emoji 本身当关键词', () => {
    expect(search('😀', 'all').length).toBe(1)
  })

  it('查不到时返回空数组', () => {
    expect(search('zzzzzz', 'all')).toEqual([])
  })
})

describe('emoji / emojiText', () => {
  it('拼接命中的 Emoji', () => {
    expect(emojiText({ text: '火箭' }, { category: 'all' })).toBe('🚀')
  })

  it('分类过滤生效', () => {
    expect(emojiText({ text: '' }, { category: 'flag' })).toContain('🇨🇳')
    expect(emojiText({ text: '' }, { category: 'flag' })).not.toContain('😀')
  })
})

describe('emoji / EMOJIS', () => {
  it('分类取值都在选项范围内', () => {
    const allowed = [
      'face',
      'hand',
      'nature',
      'food',
      'activity',
      'travel',
      'object',
      'symbol',
      'flag',
    ]
    expect(EMOJIS.every((i) => allowed.includes(i.group))).toBe(true)
  })
})
