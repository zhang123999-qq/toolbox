import { describe, expect, it } from 'vitest'
import {
  buildIdf,
  cosineSimilarity,
  formatScore,
  rankDocuments,
  splitDocuments,
  termFreq,
  tfidfVector,
  tokenize,
} from './utils'

describe('semantic-search / 分词', () => {
  it('英文按词小写切分', () => {
    expect(tokenize('Hello WORLD 123')).toEqual(['hello', 'world', '123'])
  })

  it('中文按单字 + 二元词切分', () => {
    expect(tokenize('自然语言')).toEqual(['自', '然', '语', '言', '自然', '然语', '语言'])
  })

  it('中英混合', () => {
    expect(tokenize('Hello世界')).toEqual(['hello', '世', '界', '世界'])
  })

  it('标点空白被丢弃，空字符串返回空数组', () => {
    expect(tokenize('，。！? \n\t')).toEqual([])
    expect(tokenize('')).toEqual([])
  })

  it('覆盖 CJK 三个码段：扩展 A 区与扩展 B 区', () => {
    // 㐀 U+3400（扩展 A），𠀀 U+20000（扩展 B，需代理对）
    const tokens = tokenize('㐀𠀀')
    expect(tokens).toContain('㐀')
    expect(tokens).toContain('𠀀')
    expect(tokens).toContain('㐀𠀀')
  })

  it('区间缝隙字符不被当作 CJK（分支全覆盖）', () => {
    // ꀀ U+A000（第一区间上界之外）、䷀ U+4DC0（第二区间上界之外）、U+2B000（第三区间上界之外）
    expect(tokenize('ꀀ䷀𫀀')).toEqual([])
  })

  it('单个 CJK 字只有单字 token（无二元词）', () => {
    expect(tokenize('猫')).toEqual(['猫'])
  })
})

describe('semantic-search / TF-IDF', () => {
  it('termFreq 统计词频', () => {
    const freq = termFreq(['a', 'b', 'a'])
    expect(freq.get('a')).toBe(2)
    expect(freq.get('b')).toBe(1)
    expect(termFreq([]).size).toBe(0)
  })

  it('buildIdf 平滑公式：常见词权重低、稀有词权重高', () => {
    const docs = [
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'd'],
    ]
    const idf = buildIdf(docs)
    // 'a' 出现在全部 3 篇：ln(4/4)+1 = 1
    expect(idf.get('a')).toBeCloseTo(1, 10)
    // 'b' 只出现 1 次：ln(4/2)+1 > 1
    expect(idf.get('b')!).toBeGreaterThan(idf.get('a')!)
    expect(buildIdf([]).size).toBe(0)
  })

  it('tfidfVector 忽略文档库外的查询词', () => {
    const idf = new Map([['a', 2]])
    const vec = tfidfVector(['a', 'a', 'zzz'], idf)
    expect(vec.get('a')).toBe(4)
    expect(vec.has('zzz')).toBe(false)
    expect(tfidfVector([], idf).size).toBe(0)
  })

  it('cosineSimilarity 相同向量为 1、正交为 0、零向量为 0', () => {
    const a = new Map([
      ['x', 1],
      ['y', 2],
    ])
    expect(
      cosineSimilarity(
        a,
        new Map([
          ['x', 1],
          ['y', 2],
        ]),
      ),
    ).toBeCloseTo(1, 10)
    expect(cosineSimilarity(a, new Map([['z', 5]]))).toBe(0)
    expect(cosineSimilarity(new Map(), a)).toBe(0)
    expect(cosineSimilarity(a, new Map())).toBe(0)
    expect(cosineSimilarity(new Map(), new Map())).toBe(0)
  })

  it('cosineSimilarity 部分重叠且向量大小不同', () => {
    const small = new Map([['x', 1]])
    const big = new Map([
      ['x', 1],
      ['y', 1],
      ['z', 1],
    ])
    const sim = cosineSimilarity(small, big)
    expect(sim).toBeCloseTo(1 / Math.sqrt(3), 10)
    // 反向调用走另一分支
    expect(cosineSimilarity(big, small)).toBeCloseTo(sim, 10)
  })
})

describe('semantic-search / 排序', () => {
  it('splitDocuments 按行切分并去空行', () => {
    expect(splitDocuments('a\n\nb\n  \nc')).toEqual(['a', 'b', 'c'])
    expect(splitDocuments('  \n ')).toEqual([])
    expect(splitDocuments('')).toEqual([])
  })

  it('rankDocuments 按相关度降序', () => {
    const docs = ['苹果公司发布了新款手机', '香蕉是一种热带水果', '苹果手机的价格很贵']
    const ranked = rankDocuments(docs, '苹果手机')
    expect(ranked.length).toBe(3)
    expect(ranked[0]!.index).toBe(2)
    expect(ranked[1]!.index).toBe(0)
    expect(ranked[2]!.index).toBe(1)
    expect(ranked[0]!.score).toBeGreaterThanOrEqual(ranked[1]!.score)
    expect(ranked[1]!.score).toBeGreaterThanOrEqual(ranked[2]!.score)
    expect(ranked[0]!.text).toBe(docs[2])
  })

  it('rankDocuments 英文查询', () => {
    const docs = ['the cat sat on the mat', 'dogs are great pets', 'cats and dogs']
    const ranked = rankDocuments(docs, 'cat')
    expect(ranked[0]!.index).toBe(0)
  })

  it('rankDocuments 空文档库 / 空查询抛中文错', () => {
    expect(() => rankDocuments([], 'query')).toThrow(/文档库为空/)
    expect(() => rankDocuments(['doc'], '')).toThrow(/请输入查询语句/)
    expect(() => rankDocuments(['doc'], '   ')).toThrow(/请输入查询语句/)
  })

  it('formatScore 保留 4 位小数', () => {
    expect(formatScore(0.123456)).toBe('0.1235')
    expect(formatScore(1)).toBe('1.0000')
    expect(formatScore(0)).toBe('0.0000')
    expect(() => formatScore(Number.NaN)).toThrow(/得分非法/)
    expect(() => formatScore(Number.POSITIVE_INFINITY)).toThrow(/得分非法/)
  })
})
