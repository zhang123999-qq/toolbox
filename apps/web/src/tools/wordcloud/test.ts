import { describe, expect, it } from 'vitest'
import {
  colorFor,
  countWords,
  EXAMPLE_TEXT,
  layoutCloud,
  mulberry32,
  PALETTE,
  parseFontSize,
  parseSize,
  parseTopN,
  tokenize,
  transform,
  type WordFreq,
} from './utils'
import type { WordcloudInput } from './schema'

const input = (o: Partial<WordcloudInput>): WordcloudInput => ({ text: '', ...o })

describe('wordcloud / tokenize', () => {
  it('英文按单词切分并转小写', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world'])
  })
  it('过滤英文停用词', () => {
    expect(tokenize('the data')).toEqual(['data'])
  })
  it('中文按单字切分', () => {
    expect(tokenize('数据')).toEqual(['数', '据'])
  })
  it('过滤中文停用单字', () => {
    expect(tokenize('我的数据')).toEqual(['数', '据'])
  })
  it('不足 2 个字母的英文片段被过滤', () => {
    expect(tokenize('a I x')).toEqual([])
  })
  it('空字符串返回空数组', () => {
    expect(tokenize('')).toEqual([])
  })
  it('中英混合', () => {
    expect(tokenize('Data 数据')).toEqual(['data', '数', '据'])
  })
})

describe('wordcloud / countWords', () => {
  it('统计词频并按次数降序', () => {
    expect(countWords(['b', 'a', 'b', 'c', 'a', 'b'], 10)).toEqual([
      { text: 'b', count: 3 },
      { text: 'a', count: 2 },
      { text: 'c', count: 1 },
    ])
  })
  it('次数相同时按词典序', () => {
    expect(countWords(['b', 'a'], 10)).toEqual([
      { text: 'a', count: 1 },
      { text: 'b', count: 1 },
    ])
  })
  it('topN 截断', () => {
    const r = countWords(['b', 'a', 'b', 'c', 'a', 'b'], 2)
    expect(r.map((w) => w.text)).toEqual(['b', 'a'])
  })
  it('空 token 返回空数组', () => {
    expect(countWords([], 10)).toEqual([])
  })
  it('topN 非整数抛错', () => {
    expect(() => countWords(['a'], 1.5)).toThrow(/显示词数非法/)
  })
  it('topN 越界抛错', () => {
    expect(() => countWords(['a'], 0)).toThrow(/显示词数非法/)
    expect(() => countWords(['a'], 501)).toThrow(/显示词数非法/)
  })
})

describe('wordcloud / mulberry32', () => {
  it('相同种子产生相同序列', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('输出在 [0, 1) 区间', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('wordcloud / colorFor', () => {
  it('按序号取色，超出循环', () => {
    expect(colorFor(0)).toBe(PALETTE[0])
    expect(colorFor(PALETTE.length)).toBe(PALETTE[0])
    expect(colorFor(PALETTE.length + 1)).toBe(PALETTE[1])
  })
})

describe('wordcloud / layoutCloud', () => {
  const words: WordFreq[] = [
    { text: '数据', count: 10 },
    { text: 'data', count: 5 },
    { text: '云', count: 1 },
  ]
  const baseOpts = { width: 600, height: 400, seed: 7, minSize: 14, maxSize: 64 }

  it('空输入返回空数组', () => {
    expect(layoutCloud([], baseOpts)).toEqual([])
  })
  it('画布宽高非法抛错', () => {
    expect(() => layoutCloud(words, { ...baseOpts, width: 0 })).toThrow(/画布尺寸非法/)
    expect(() => layoutCloud(words, { ...baseOpts, width: -5 })).toThrow(/画布尺寸非法/)
    expect(() => layoutCloud(words, { ...baseOpts, height: 0 })).toThrow(/画布尺寸非法/)
  })
  it('字号非法抛错', () => {
    expect(() => layoutCloud(words, { ...baseOpts, minSize: 0 })).toThrow(/字号非法/)
    expect(() => layoutCloud(words, { ...baseOpts, maxSize: -1 })).toThrow(/字号非法/)
    expect(() => layoutCloud(words, { ...baseOpts, minSize: 30, maxSize: 20 })).toThrow(/字号区间非法/)
  })
  it('词频相同时全部取最大字号', () => {
    const r = layoutCloud(
      [
        { text: '甲', count: 3 },
        { text: '乙', count: 3 },
      ],
      { ...baseOpts, minSize: 10, maxSize: 20 },
    )
    expect(r.map((w) => w.size)).toEqual([20, 20])
  })
  it('字号按词频线性映射（最高→maxSize，最低→minSize）', () => {
    const r = layoutCloud(words, { ...baseOpts, minSize: 10, maxSize: 20 })
    expect(r[0].size).toBe(20)
    expect(r[2].size).toBe(10)
  })
  it('相同种子布局完全一致', () => {
    expect(layoutCloud(words, baseOpts)).toEqual(layoutCloud(words, baseOpts))
  })
  it('旋转角 0 与 -90 两种分支都被覆盖', () => {
    // 先用 mulberry32 快速找到首个随机数落在两边的种子（layoutCloud 中每词的 rotate 取当轮首次 rng()）
    let zeroSeed = -1
    let verticalSeed = -1
    for (let seed = 0; seed < 100000 && (zeroSeed < 0 || verticalSeed < 0); seed++) {
      const v = mulberry32(seed)()
      if (v < 0.25 && verticalSeed < 0) verticalSeed = seed
      if (v >= 0.25 && zeroSeed < 0) zeroSeed = seed
    }
    expect(verticalSeed).toBeGreaterThanOrEqual(0)
    expect(zeroSeed).toBeGreaterThanOrEqual(0)
    const rv = layoutCloud(words, { ...baseOpts, seed: verticalSeed })
    const rz = layoutCloud(words, { ...baseOpts, seed: zeroSeed })
    expect(rv.some((w) => w.rotate === -90)).toBe(true)
    expect(rz.some((w) => w.rotate === 0)).toBe(true)
  })
  it('所有词中心点落在画布内', () => {
    const r = layoutCloud(words, baseOpts)
    for (const w of r) {
      expect(w.x).toBeGreaterThanOrEqual(0)
      expect(w.x).toBeLessThanOrEqual(600)
      expect(w.y).toBeGreaterThanOrEqual(0)
      expect(w.y).toBeLessThanOrEqual(400)
    }
  })
  it('颜色按词频顺序取', () => {
    const r = layoutCloud(words, baseOpts)
    r.forEach((w, i) => expect(w.color).toBe(PALETTE[i % PALETTE.length]))
  })
  it('画布过小放不下时跳过部分词', () => {
    const many: WordFreq[] = Array.from({ length: 30 }, (_, i) => ({ text: `词${i}`, count: 30 - i }))
    const r = layoutCloud(many, { width: 60, height: 40, seed: 7, minSize: 14, maxSize: 64 })
    expect(r.length).toBeLessThan(many.length)
  })
})

describe('wordcloud / parseTopN', () => {
  it('留空回 fallback', () => {
    expect(parseTopN('  ', 80)).toBe(80)
  })
  it('正常解析', () => {
    expect(parseTopN('50', 80)).toBe(50)
  })
  it('非整数抛错', () => {
    expect(() => parseTopN('1.5', 80)).toThrow(/显示词数格式非法/)
    expect(() => parseTopN('abc', 80)).toThrow(/显示词数格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseTopN('0', 80)).toThrow(/显示词数须在 1–500 之间/)
    expect(() => parseTopN('501', 80)).toThrow(/显示词数须在 1–500 之间/)
  })
})

describe('wordcloud / parseSize', () => {
  it('留空回 fallback', () => {
    expect(parseSize('', '宽度', 600)).toBe(600)
  })
  it('正常解析', () => {
    expect(parseSize('300', '宽度', 600)).toBe(300)
  })
  it('非数字抛错', () => {
    expect(() => parseSize('abc', '宽度', 600)).toThrow(/宽度格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseSize('50', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
    expect(() => parseSize('3000', '宽度', 600)).toThrow(/宽度须在 100–2000 之间/)
  })
})

describe('wordcloud / parseFontSize', () => {
  it('留空回 fallback', () => {
    expect(parseFontSize('', '最小字号', 14)).toBe(14)
  })
  it('正常解析', () => {
    expect(parseFontSize('20', '最小字号', 14)).toBe(20)
  })
  it('非数字抛错', () => {
    expect(() => parseFontSize('abc', '最小字号', 14)).toThrow(/最小字号格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseFontSize('5', '最小字号', 14)).toThrow(/最小字号须在 6–200 之间/)
    expect(() => parseFontSize('201', '最小字号', 14)).toThrow(/最小字号须在 6–200 之间/)
  })
})

describe('wordcloud / transform', () => {
  it('空输入用示例文本', () => {
    expect(transform(input({ text: '   ' }))).toBe(EXAMPLE_TEXT)
  })
  it('非空输入去首尾空白后返回', () => {
    expect(transform(input({ text: '  数据 ' }))).toBe('数据')
  })
})
