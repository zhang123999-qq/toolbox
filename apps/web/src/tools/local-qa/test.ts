import { describe, expect, it } from 'vitest'
import {
  MAX_DOCS,
  answerQuestion,
  buildIndex,
  cosineSparse,
  idf,
  splitDocs,
  splitSentences,
  tfidfVector,
  tokenize,
} from './utils'

const DOCS = [
  '复利是指利息也产生利息。复利计算公式为：本息和 = 本金 × (1 + 利率)^期数。',
  '单利只对本金计息。\n\n水的沸点是 100 摄氏度。',
].join('\n\n')

describe('local-qa · utils', () => {
  it('tokenize 中英文分词', () => {
    expect(tokenize('Hello World 复利')).toEqual(['hello', 'world', '复', '利'])
    expect(tokenize('')).toEqual([])
  })

  it('tokenize 非字符串抛中文错', () => {
    expect(() => tokenize(undefined as never)).toThrow('内容必须是文本')
  })

  it('splitDocs 按空行切分', () => {
    expect(splitDocs('a\n\n\nb\n\n')).toEqual(['a', 'b'])
  })

  it('splitDocs 无有效内容 / 超量 / 超长抛中文错', () => {
    expect(() => splitDocs('\n  \n')).toThrow('没有检测到有效内容')
    expect(() => splitDocs(undefined as never)).toThrow('文档内容必须是文本')
    const many = new Array(MAX_DOCS + 1).fill('a').join('\n\n')
    expect(() => splitDocs(many)).toThrow('文档过多')
    expect(() => splitDocs('x'.repeat(50_001))).toThrow('单篇文档过长')
  })

  it('splitSentences 按标点与换行切句', () => {
    const out = splitSentences('第一句。第二句！第三句？\n第四句', 2)
    expect(out.map((s) => s.text)).toEqual(['第一句。', '第二句！', '第三句？', '第四句'])
    expect(out[0]!.docIndex).toBe(2)
    expect(out[0]!.tokens.length).toBeGreaterThan(0)
  })

  it('splitSentences 跳过空句与无词句，超长句截断', () => {
    const out = splitSentences('，。\n' + 'x'.repeat(2500), 0)
    expect(out).toHaveLength(1)
    expect(out[0]!.text.length).toBe(2000)
  })

  it('buildIndex 统计句级文档频率', () => {
    const { sentences, docFreq } = buildIndex(['复利公式。复利很好。', '单利公式。'])
    expect(sentences.length).toBeGreaterThan(0)
    expect(docFreq.get('复')).toBe(2)
    expect(docFreq.get('单')).toBe(1)
  })

  it('idf 平滑公式', () => {
    expect(idf(0, 10)).toBeCloseTo(Math.log(11) + 1, 10)
    expect(idf(10, 10)).toBeCloseTo(1, 10)
  })

  it('idf 非法参数抛中文错', () => {
    expect(() => idf(-1, 10)).toThrow('词频非法')
    expect(() => idf(1.5, 10)).toThrow('词频非法')
    expect(() => idf(0, 0)).toThrow('句子总数非法')
  })

  it('tfidfVector 归一化词频加权', () => {
    const vec = tfidfVector(
      ['a', 'a', 'b'],
      new Map([
        ['a', 1],
        ['b', 5],
      ]),
      10,
    )
    expect(vec.get('a')).toBeGreaterThan(vec.get('b')!)
  })

  it('cosineSparse 相同向量为 1、零向量为 0', () => {
    const v = new Map([
      ['a', 1],
      ['b', 2],
    ])
    expect(cosineSparse(v, v)).toBeCloseTo(1, 10)
    expect(cosineSparse(new Map(), v)).toBe(0)
    expect(cosineSparse(v, new Map())).toBe(0)
  })

  it('answerQuestion 找到相关句', () => {
    const r = answerQuestion(DOCS, '复利公式是什么', 3)
    expect(r.found).toBe(true)
    expect(r.answer).toContain('复利计算公式')
    expect(r.evidence.length).toBeGreaterThan(0)
    expect(r.evidence.length).toBeLessThanOrEqual(3)
    // 按相关度降序
    for (let i = 1; i < r.evidence.length; i++) {
      expect(r.evidence[i - 1]!.score).toBeGreaterThanOrEqual(r.evidence[i]!.score)
    }
  })

  it('answerQuestion 无相关内容 → found=false 中文说明', () => {
    const r = answerQuestion(DOCS, '量子力学', 3)
    expect(r.found).toBe(false)
    expect(r.answer).toContain('未在文档中找到')
    expect(r.evidence).toEqual([])
  })

  it('answerQuestion topK=1 只返回一句', () => {
    const r = answerQuestion(DOCS, '复利', 1)
    expect(r.found).toBe(true)
    expect(r.evidence).toHaveLength(1)
  })

  it('answerQuestion 参数非法抛中文错', () => {
    expect(() => answerQuestion(DOCS, '  ', 3)).toThrow('问题不能为空')
    expect(() => answerQuestion(DOCS, 'x'.repeat(2001), 3)).toThrow('问题过长')
    expect(() => answerQuestion(DOCS, '复利', 0)).toThrow('证据句数非法')
    expect(() => answerQuestion(DOCS, '复利', 11)).toThrow('证据句数非法')
    expect(() => answerQuestion(DOCS, '复利', 1.5)).toThrow('证据句数非法')
    expect(() => answerQuestion('，。！', '复利', 3)).toThrow('没有可检索的句子')
    expect(() => answerQuestion('复利很好。', '，。！', 3)).toThrow('没有可检索的词语')
  })

  it('splitSentences 跳过首尾换行产生的空片段', () => {
    const ss = splitSentences('\n第一句。第二句\n', 0)
    expect(ss.map((s) => s.text)).toEqual(['第一句。', '第二句'])
    expect(ss[0]!.docIndex).toBe(0)
  })
})
