import { describe, expect, it } from 'vitest'
import {
  MAX_DOC_CHARS,
  MIN_DOC_CHARS,
  SHINGLE_N,
  buildReport,
  compareAll,
  docSimilarity,
  findSimilarSentences,
  formatPercent,
  jaccard,
  normalize,
  parseThreshold,
  shingles,
  similarityLevel,
  splitSentences,
  validateDoc,
} from './utils'

const DOC_A = '人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。机器学习是实现人工智能的重要方法。'
const DOC_B = '人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。深度学习近年来取得了突破性进展。'
const DOC_C = '今天天气很好，适合出去散步。公园里的花开得很漂亮。'

describe('plagiarism · utils', () => {
  it('normalize 去空白标点并转小写', () => {
    expect(normalize('Hello, World! 你好。')).toBe('helloworld你好')
    expect(normalize('  ')).toBe('')
  })

  it('shingles 生成字符 n-gram', () => {
    expect(shingles('abcde', 2)).toEqual(new Set(['ab', 'bc', 'cd', 'de']))
    expect(shingles('ab', 5)).toEqual(new Set())
  })

  it('shingles 非法 n 抛中文错', () => {
    expect(() => shingles('abc', 0)).toThrow('n-gram 长度非法')
    expect(() => shingles('abc', 2.5)).toThrow('n-gram 长度非法')
    expect(() => shingles('abc', NaN)).toThrow('n-gram 长度非法')
  })

  it('jaccard 相同/不同/空集合', () => {
    expect(jaccard(new Set(['a']), new Set(['a']))).toBe(1)
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0)
    expect(jaccard(new Set(), new Set(['a']))).toBe(0)
    expect(jaccard(new Set(['a']), new Set())).toBe(0)
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3)
  })

  it('docSimilarity 相同文档为 1，默认 n 生效', () => {
    expect(docSimilarity(DOC_A, DOC_A)).toBe(1)
    expect(docSimilarity(DOC_A, DOC_A, SHINGLE_N)).toBe(1)
  })

  it('docSimilarity 相关文档高于无关文档', () => {
    const related = docSimilarity(DOC_A, DOC_B)
    const unrelated = docSimilarity(DOC_A, DOC_C)
    expect(related).toBeGreaterThan(unrelated)
    expect(unrelated).toBeLessThan(0.3)
  })

  it('splitSentences 按标点切分并过滤过短', () => {
    const ss = splitSentences('第一句很长很长很长很长。第二句也很长很长很长！短\n第四句足够长足够长足够长')
    expect(ss).toHaveLength(3)
    expect(ss[0]).toContain('第一句')
  })

  it('parseThreshold 合法 / 非法', () => {
    expect(parseThreshold('0.3')).toBe(0.3)
    expect(() => parseThreshold('0')).toThrow('阈值非法')
    expect(() => parseThreshold('-1')).toThrow('阈值非法')
    expect(() => parseThreshold('1.5')).toThrow('阈值非法')
    expect(() => parseThreshold('abc')).toThrow('阈值非法')
  })

  it('validateDoc 空 / 太短 / 超长 / 正常', () => {
    expect(() => validateDoc('文档A', '  ')).toThrow('文档A不能为空')
    expect(() => validateDoc('文档A', 'x'.repeat(MIN_DOC_CHARS - 1))).toThrow('太短')
    expect(() => validateDoc('文档A', 'x'.repeat(MAX_DOC_CHARS + 1))).toThrow('过长')
    expect(validateDoc('文档A', '  ' + 'x'.repeat(30) + '  ')).toBe('x'.repeat(30))
  })

  it('findSimilarSentences 找出高度相似句', () => {
    const sims = findSimilarSentences(DOC_A, DOC_B, 0.3)
    expect(sims.length).toBeGreaterThan(0)
    expect(sims[0].sentence).toContain('人工智能是计算机科学的一个分支')
    expect(sims[0].score).toBeGreaterThanOrEqual(0.3)
  })

  it('findSimilarSentences 多个相似句按分降序', () => {
    const a = '人工智能是计算机科学的一个分支，它历史悠久。机器学习是实现人工智能的重要方法，应用广泛。'
    const b = '人工智能是计算机科学的一个分支，它历史悠久。机器学习是实现人工智能的重要方法，应用广泛。深度学习是新方向。'
    const sims = findSimilarSentences(a, b, 0.3)
    expect(sims.length).toBe(2)
    expect(sims[0].score).toBeGreaterThanOrEqual(sims[1].score)
  })

  it('findSimilarSentences 无相似句返回空', () => {
    expect(findSimilarSentences(DOC_A, DOC_C, 0.3)).toEqual([])
  })

  it('findSimilarSentences 对方无有效句子返回空', () => {
    expect(findSimilarSentences(DOC_A, '短', 0.3)).toEqual([])
  })

  it('compareAll 两两比对并降序', () => {
    const pairs = compareAll(
      [
        { name: 'A', text: DOC_A },
        { name: 'B', text: DOC_B },
        { name: 'C', text: DOC_C },
      ],
      0.3,
    )
    expect(pairs).toHaveLength(3)
    expect(pairs[0].a).toBe('A')
    expect(pairs[0].b).toBe('B')
    expect(pairs[0].score).toBeGreaterThanOrEqual(pairs[1].score)
    expect(pairs[0].similar.length).toBeGreaterThan(0)
  })

  it('compareAll 低分对不标片段', () => {
    const pairs = compareAll(
      [
        { name: 'A', text: DOC_A },
        { name: 'C', text: DOC_C },
      ],
      0.3,
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].similar).toEqual([])
  })

  it('compareAll 少于两篇抛中文错', () => {
    expect(() => compareAll([{ name: 'A', text: DOC_A }], 0.3)).toThrow('至少需要两篇')
  })

  it('similarityLevel 四档', () => {
    expect(similarityLevel(0.8)).toBe('高度相似')
    expect(similarityLevel(0.6)).toBe('高度相似')
    expect(similarityLevel(0.4)).toBe('中度相似')
    expect(similarityLevel(0.1)).toBe('轻微相似')
    expect(similarityLevel(0)).toBe('无相似')
  })

  it('formatPercent 格式化', () => {
    expect(formatPercent(0.123)).toBe('12.3%')
    expect(formatPercent(1)).toBe('100.0%')
  })

  it('buildReport 包含评分与片段', () => {
    const pairs = compareAll(
      [
        { name: 'A', text: DOC_A },
        { name: 'B', text: DOC_B },
      ],
      0.3,
    )
    const r = buildReport(pairs)
    expect(r).toContain('A × B')
    expect(r).toContain('人工智能是计算机科学的一个分支')
  })
})
