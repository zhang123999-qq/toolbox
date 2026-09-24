import { describe, expect, it } from 'vitest'
import { analyze, polarity, splitSentences, transform } from './utils'
import type { SentimentOptions } from './schema'

const auto: SentimentOptions = { language: 'auto' }
const zh: SentimentOptions = { language: 'zh' }
const en: SentimentOptions = { language: 'en' }

describe('sentiment / polarity', () => {
  it('褒义词与贬义词分别得 +1 / -1', () => {
    expect(polarity('great')).toBe(1)
    expect(polarity('terrible')).toBe(-1)
    expect(polarity('table')).toBe(0)
  })

  it('大小写不敏感', () => {
    expect(polarity('GREAT')).toBe(1)
  })
})

describe('sentiment / splitSentences', () => {
  it('中文按标点切句', () => {
    expect(splitSentences('今天很好。明天很差！', 'zh')).toEqual(['今天很好', '明天很差'])
  })

  it('英文交给 compromise 切句', () => {
    const list = splitSentences('It is good. It is bad.', 'en')
    expect(list.length).toBe(2)
  })
})

describe('sentiment / analyze', () => {
  it('褒义为主的文本判为正面', () => {
    const r = analyze('This toolbox is great and fast.', 'en')
    expect(r.label).toBe('正面')
    expect(r.positive).toBeGreaterThan(0)
  })

  it('褒贬相当时判为中性', () => {
    const r = analyze('It is great but terrible.', 'en')
    expect(r.label).toBe('中性')
  })

  it('中文文本按词表命中', () => {
    const r = analyze('这个工具很好用。', 'zh')
    expect(r.label).toBe('正面')
  })

  it('空文本不产生 NaN（边界）', () => {
    const r = analyze('', 'auto')
    expect(Number.isNaN(r.score)).toBe(false)
    expect(r.sentences).toEqual([])
  })
})

describe('sentiment / transform', () => {
  it('输出倾向、得分与逐句明细', () => {
    const out = transform({ text: 'This is great.' }, auto)
    expect(out).toContain('情感倾向：正面')
    expect(out).toContain('逐句得分：')
  })

  it('中文文本按中文口径处理', () => {
    expect(transform({ text: '很好，非常满意。' }, zh)).toContain('正面')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '  ' }, en)).toBe('')
  })
})
