import { describe, expect, it } from 'vitest'
import {
  answerQuestion,
  chunkText,
  extractAnswer,
  NO_ANSWER,
  retrieveTopK,
  splitSentences,
} from './utils'
import type { RetrievedChunk } from './utils'

const CORPUS = [
  '人工智能是计算机科学的一个分支。它致力于让机器具备智能。',
  '机器学习是人工智能的核心技术。深度学习属于机器学习。',
  '自然语言处理让机器理解人类语言。',
].join('\n')

function chunk(text: string, score: number, index = 0): RetrievedChunk {
  return { index, text, score }
}

describe('rag / 文本切分', () => {
  it('chunkText 滑窗切分（含重叠）', () => {
    const chunks = chunkText('abcdefghij', 4, 2)
    expect(chunks).toEqual(['abcd', 'cdef', 'efgh', 'ghij', 'ij'])
  })

  it('chunkText 无重叠与短文本', () => {
    expect(chunkText('abcdef', 4, 0)).toEqual(['abcd', 'ef'])
    expect(chunkText('ab', 10, 2)).toEqual(['ab'])
    expect(chunkText('', 10, 2)).toEqual([])
  })

  it('chunkText 非法参数抛中文错', () => {
    expect(() => chunkText('abc', 0, 0)).toThrow(/分块大小非法/)
    expect(() => chunkText('abc', -3, 0)).toThrow(/分块大小非法/)
    expect(() => chunkText('abc', 2.5, 0)).toThrow(/分块大小非法/)
    expect(() => chunkText('abc', 10, -1)).toThrow(/重叠长度非法/)
    expect(() => chunkText('abc', 10, 10)).toThrow(/重叠长度非法/)
    expect(() => chunkText('abc', 10, 11)).toThrow(/重叠长度非法/)
    expect(() => chunkText('abc', 10, 1.5)).toThrow(/重叠长度非法/)
  })

  it('splitSentences 按标点切分', () => {
    expect(splitSentences('你好！今天天气不错。对吗？是的；很好\nhmm')).toEqual([
      '你好',
      '今天天气不错',
      '对吗',
      '是的',
      '很好',
      'hmm',
    ])
    expect(splitSentences('')).toEqual([])
    expect(splitSentences('。！？')).toEqual([])
  })
})

describe('rag / 检索', () => {
  it('retrieveTopK 返回得分降序的 top-k', () => {
    const chunks = chunkText(CORPUS, 40, 0)
    const top = retrieveTopK(chunks, '机器学习', 2)
    expect(top.length).toBe(2)
    expect(top[0]!.score).toBeGreaterThanOrEqual(top[1]!.score)
    expect(top[0]!.text).toContain('机器学习')
  })

  it('retrieveTopK k 大于片段数时返回全部', () => {
    const top = retrieveTopK(['a', 'b'], 'a', 10)
    expect(top.length).toBe(2)
  })

  it('retrieveTopK 默认 k=3', () => {
    const top = retrieveTopK(['苹果', '香蕉', '苹果派', '西瓜'], '苹果')
    expect(top.length).toBe(3)
    expect(top[0]!.text).toContain('苹果')
  })

  it('retrieveTopK 空片段返回空数组；空查询 / 非法 k 抛中文错', () => {
    expect(retrieveTopK([], 'query', 3)).toEqual([])
    expect(() => retrieveTopK(['a'], '', 3)).toThrow(/请输入问题/)
    expect(() => retrieveTopK(['a'], '   ', 3)).toThrow(/请输入问题/)
    expect(() => retrieveTopK(['a'], 'q', 0)).toThrow(/数量 k 非法/)
    expect(() => retrieveTopK(['a'], 'q', -1)).toThrow(/数量 k 非法/)
    expect(() => retrieveTopK(['a'], 'q', 1.5)).toThrow(/数量 k 非法/)
  })

  it('retrieveTopK 覆盖分词 CJK 全分支（含区间缝隙字符与扩展区）', () => {
    // 㐀 U+3400（扩展 A）、𠀀 U+20000（扩展 B）、ꀀ/䷀/𫀀 为区间缝隙字符
    const top = retrieveTopK(['㐀𠀀 machine learning', 'ꀀ䷀𫀀 apple'], 'machine')
    expect(top.length).toBe(2)
    expect(top[0]!.text).toContain('machine')
  })

  it('retrieveTopK 查询词在部分片段缺失时得低分', () => {
    const top = retrieveTopK(['苹果手机', '香蕉'], '苹果', 2)
    expect(top.length).toBe(2)
    expect(top[0]!.text).toBe('苹果手机')
    expect(top[0]!.score).toBeGreaterThan(top[1]!.score)
  })

  it('retrieveTopK 零向量片段得 0 分（纯标点片段）', () => {
    const top = retrieveTopK(['。。。', '苹果很好吃'], '苹果', 2)
    expect(top[0]!.text).toBe('苹果很好吃')
    expect(top[1]!.score).toBe(0)
  })
})

describe('rag / 抽取式作答', () => {
  it('extractAnswer 抽取含关键词的句子并去重', () => {
    const chunks = [
      chunk('人工智能是计算机科学的分支。它致力于让机器具备智能。', 0.9),
      chunk('机器学习是人工智能的核心。人工智能是计算机科学的分支。', 0.8),
    ]
    const answer = extractAnswer(chunks, '人工智能', 5)
    expect(answer).toContain('人工智能是计算机科学的分支')
    expect(answer).toContain('它致力于让机器具备智能')
    expect(answer).toContain('机器学习是人工智能的核心')
    // 重复句子只出现一次
    expect(answer.split('人工智能是计算机科学的分支').length).toBe(2)
  })

  it('extractAnswer 最多取 maxSentences 句', () => {
    const chunks = [chunk('甲很好。乙很好。丙很好。丁很好。', 1, 0)]
    const answer = extractAnswer(chunks, '很好', 2)
    expect(answer.split('\n').length).toBe(2)
  })

  it('extractAnswer 无匹配句子返回 NO_ANSWER', () => {
    expect(extractAnswer([chunk('今天天气不错。', 0.5)], '量子计算')).toBe(NO_ANSWER)
    expect(extractAnswer([], '量子计算')).toBe(NO_ANSWER)
    expect(NO_ANSWER).toContain('未找到')
  })

  it('extractAnswer 非法句子数抛中文错', () => {
    expect(() => extractAnswer([chunk('a', 1)], 'q', 0)).toThrow(/句子数非法/)
    expect(() => extractAnswer([chunk('a', 1)], 'q', -2)).toThrow(/句子数非法/)
    expect(() => extractAnswer([chunk('a', 1)], 'q', 1.5)).toThrow(/句子数非法/)
  })
})

describe('rag / 一站式问答', () => {
  it('answerQuestion 切分 → 检索 → 作答', () => {
    // CORPUS 不足默认分块大小，只切出 1 个片段
    const result = answerQuestion(CORPUS, '什么是机器学习？', 2)
    expect(result.chunks.length).toBe(1)
    expect(result.answer).toContain('机器学习')
  })

  it('answerQuestion 无关问题返回 NO_ANSWER', () => {
    // 「𪚥」(U+2A6A5) 与文档无任何 token 重叠；注意单字 token 容易误命中（如"器"命中"机器"），
    // 这是词袋模型的固有局限，见 README
    const result = answerQuestion(CORPUS, '𪚥', 2)
    expect(result.answer).toBe(NO_ANSWER)
  })

  it('answerQuestion 空文档抛中文错；空查询抛中文错', () => {
    expect(() => answerQuestion('', 'q')).toThrow(/请先输入文档内容/)
    expect(() => answerQuestion('   ', 'q')).toThrow(/请先输入文档内容/)
    expect(() => answerQuestion(CORPUS, '')).toThrow(/请输入问题/)
    expect(() => answerQuestion(CORPUS, 'q', 0)).toThrow(/数量 k 非法/)
  })
})
