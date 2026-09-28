import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOP_N,
  MAX_TEXT_CHARS,
  MAX_TOP_N,
  extractKeywords,
  formatKeywords,
  isStopWord,
  tokenize,
  validateTopN,
} from './utils'

describe('keyword-extract · utils', () => {
  it('isStopWord 识别中英文停用词', () => {
    expect(isStopWord('的')).toBe(true)
    expect(isStopWord('the')).toBe(true)
    expect(isStopWord('人工智能')).toBe(false)
    expect(isStopWord('machine')).toBe(false)
  })

  it('tokenize 英文单词转小写', () => {
    expect(tokenize('Hello WORLD')).toEqual(['hello', 'world'])
  })

  it('tokenize 中文序列整体保留并追加二元滑动窗口', () => {
    expect(tokenize('人工智能')).toEqual(['人工智能', '人工', '工智', '智能'])
  })

  it('tokenize 双字中文不重复追加', () => {
    expect(tokenize('人工')).toEqual(['人工'])
  })

  it('tokenize 单个中文字符不成词', () => {
    expect(tokenize('a的b')).toEqual(['a', 'b'])
  })

  it('tokenize 纯标点返回空数组', () => {
    expect(tokenize('，。！')).toEqual([])
  })

  it('validateTopN 接受字符串与数字', () => {
    expect(validateTopN('20')).toBe(20)
    expect(validateTopN(' 10 ')).toBe(10)
    expect(validateTopN(5)).toBe(5)
  })

  it('validateTopN 非法值抛中文错', () => {
    for (const v of ['0', '101', 'abc', '2.5', '', 0, 101, Number.NaN]) {
      expect(() => validateTopN(v)).toThrow('TopN 必须是')
    }
  })

  it('extractKeywords 空文本抛中文错', () => {
    expect(() => extractKeywords('   ')).toThrow('文本不能为空')
  })

  it('extractKeywords 超长文本抛中文错', () => {
    expect(() => extractKeywords('a'.repeat(MAX_TEXT_CHARS + 1))).toThrow('文本过长')
  })

  it('extractKeywords 全停用词抛中文错', () => {
    expect(() => extractKeywords('the and 的')).toThrow('无有效词汇')
  })

  it('extractKeywords 按词频降序并计算得分', () => {
    const r = extractKeywords('apple apple banana')
    expect(r[0]).toEqual({ word: 'apple', count: 2, score: 0.6667 })
    expect(r[1]).toEqual({ word: 'banana', count: 1, score: 0.3333 })
  })

  it('extractKeywords 词频相同时按首次出现排序', () => {
    const r = extractKeywords('banana apple')
    expect(r.map((x) => x.word)).toEqual(['banana', 'apple'])
  })

  it('extractKeywords 按 TopN 截断', () => {
    const r = extractKeywords('a1 a2 a3 a4', 2)
    expect(r).toHaveLength(2)
  })

  it('extractKeywords 不传 TopN 时用默认值', () => {
    expect(DEFAULT_TOP_N).toBe(20)
    const r = extractKeywords('apple')
    expect(r).toHaveLength(1)
    expect(r[0]?.word).toBe('apple')
  })

  it('extractKeywords 中文文本按二元词频提取关键词', () => {
    const r = extractKeywords('人工智能改变世界，人工智能创造未来')
    // 无空格中文按二元滑动窗口统计，「人工」出现 2 次且最早
    expect(r[0]?.word).toBe('人工')
    expect(r[0]?.count).toBe(2)
  })

  it('formatKeywords 输出"词 ×次数（占比%）"格式', () => {
    expect(formatKeywords([{ word: 'apple', count: 2, score: 0.6667 }])).toBe('apple ×2（66.67%）')
  })

  it('formatKeywords 空数组返回空字符串', () => {
    expect(formatKeywords([])).toBe('')
  })

  it(`MAX_TOP_N 为 ${MAX_TOP_N}`, () => {
    expect(MAX_TOP_N).toBe(100)
  })
})
