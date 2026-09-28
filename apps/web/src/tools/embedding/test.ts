import { describe, expect, it } from 'vitest'
import {
  EMBED_DIMS,
  MAX_TEXT_CHARS,
  cosineSimilarity,
  embedText,
  fnv1a32,
  formatVector,
  tokenize,
} from './utils'

describe('embedding · utils', () => {
  it('fnv1a32 确定且分布合理', () => {
    expect(fnv1a32('hello')).toBe(fnv1a32('hello'))
    expect(fnv1a32('hello')).not.toBe(fnv1a32('world'))
    expect(fnv1a32('')).toBe(0x811c9dc5)
  })

  it('tokenize 英文小写切词 / 中文单字 / 忽略标点', () => {
    expect(tokenize('Hello World!')).toEqual(['hello', 'world'])
    expect(tokenize('你好世界')).toEqual(['你', '好', '世', '界'])
    expect(tokenize('AI 2024年')).toEqual(['ai', '2024', '年'])
    expect(tokenize('')).toEqual([])
    expect(tokenize('，。！')).toEqual([])
  })

  it('tokenize 非字符串抛中文错', () => {
    expect(() => tokenize(undefined as never)).toThrow('必须是文本')
  })

  it('embedText 确定性与归一化', () => {
    const v1 = embedText('今天天气不错', 128)
    const v2 = embedText('今天天气不错', 128)
    expect(v1).toEqual(v2)
    expect(v1).toHaveLength(128)
    const norm = Math.sqrt(v1.reduce((s, x) => s + x * x, 0))
    expect(norm).toBeCloseTo(1, 10)
  })

  it('embedText 空文本 → 零向量', () => {
    const v = embedText('   ', 64)
    expect(v).toHaveLength(64)
    expect(v.every((x) => x === 0)).toBe(true)
  })

  it('embedText 支持全部可选维度', () => {
    for (const d of EMBED_DIMS) expect(embedText('hi', d)).toHaveLength(d)
  })

  it('embedText 维度非法抛中文错', () => {
    expect(() => embedText('hi', 100)).toThrow('维度非法')
    expect(() => embedText('hi', 1.5)).toThrow('维度非法')
    expect(() => embedText('hi', NaN)).toThrow('维度非法')
  })

  it('embedText 超长抛中文错', () => {
    expect(() => embedText('x'.repeat(MAX_TEXT_CHARS + 1), 64)).toThrow('文本过长')
  })

  it('embedText 非字符串抛中文错', () => {
    expect(() => embedText(undefined as never, 64)).toThrow('必须是文本')
  })

  it('cosineSimilarity 相同向量为 1', () => {
    const v = embedText('测试文本', 64)
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10)
  })

  it('cosineSimilarity 不同文本小于 1', () => {
    const a = embedText('苹果香蕉橘子', 256)
    const b = embedText('汽车飞机轮船', 256)
    const s = cosineSimilarity(a, b)
    expect(s).toBeGreaterThanOrEqual(-1)
    expect(s).toBeLessThanOrEqual(1)
  })

  it('cosineSimilarity 零向量返回 0', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0)
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0)
  })

  it('cosineSimilarity 维度不一致 / 空向量抛中文错', () => {
    expect(() => cosineSimilarity([1], [1, 2])).toThrow('维度不一致')
    expect(() => cosineSimilarity([], [1])).toThrow('向量不能为空')
  })

  it('cosineSimilarity 非法数值抛中文错', () => {
    expect(() => cosineSimilarity([NaN], [1])).toThrow('非法数值')
  })

  it('formatVector 展示格式', () => {
    const s = formatVector([0.123456, -0.5], 16)
    expect(s).toContain('0.1235')
    expect(s).toContain('共 2 维')
    const long = formatVector(new Array(20).fill(0), 16)
    expect(long).toContain('…')
    expect(long).toContain('共 20 维')
  })

  it('formatVector 预览数非法抛中文错', () => {
    expect(() => formatVector([1], 0)).toThrow('预览维度数非法')
    expect(() => formatVector([1], -2)).toThrow('预览维度数非法')
  })
})
