import { describe, expect, it } from 'vitest'
import {
  MAX_CHUNK_LEN,
  MAX_CHUNK_PARAM,
  MAX_PITCH,
  MAX_RATE,
  MIN_PITCH,
  MIN_RATE,
  chunkText,
  clampPitch,
  clampRate,
  formatSpeakSummary,
  validateSpeakOptions,
} from './utils'

describe('text-to-audio / 参数校验', () => {
  it('合法参数通过并原样返回', () => {
    expect(validateSpeakOptions('你好', 1, 1)).toEqual({ text: '你好', rate: 1, pitch: 1 })
    expect(validateSpeakOptions('hi', MIN_RATE, MIN_PITCH)).toBeTruthy()
    expect(validateSpeakOptions('hi', MAX_RATE, MAX_PITCH)).toBeTruthy()
  })

  it('空文本抛中文错', () => {
    expect(() => validateSpeakOptions('', 1, 1)).toThrow(/请输入要朗读的文字/)
    expect(() => validateSpeakOptions('   ', 1, 1)).toThrow(/请输入要朗读的文字/)
  })

  it('语速非法抛中文错', () => {
    for (const bad of [0.05, 10.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(() => validateSpeakOptions('你好', bad, 1)).toThrow(/语速非法/)
    }
  })

  it('音调非法抛中文错', () => {
    for (const bad of [-0.1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => validateSpeakOptions('你好', 1, bad)).toThrow(/音调非法/)
    }
  })
})

describe('text-to-audio / 钳制', () => {
  it('clampRate 钳制到区间，非有限数回退 1', () => {
    expect(clampRate(1)).toBe(1)
    expect(clampRate(0)).toBe(MIN_RATE)
    expect(clampRate(100)).toBe(MAX_RATE)
    expect(clampRate(-5)).toBe(MIN_RATE)
    expect(clampRate(Number.NaN)).toBe(1)
    expect(clampRate(Number.POSITIVE_INFINITY)).toBe(1)
  })

  it('clampPitch 钳制到区间，非有限数回退 1', () => {
    expect(clampPitch(1)).toBe(1)
    expect(clampPitch(-1)).toBe(MIN_PITCH)
    expect(clampPitch(100)).toBe(MAX_PITCH)
    expect(clampPitch(Number.NaN)).toBe(1)
  })
})

describe('text-to-audio / 长文本分段', () => {
  it('短文本不分段', () => {
    expect(chunkText('你好世界')).toEqual(['你好世界'])
  })

  it('按句子边界分段，标点保留在段尾', () => {
    const text = '第一句。第二句！第三句？第四句。'
    const chunks = chunkText(text, 10)
    expect(chunks).toEqual(['第一句。第二句！', '第三句？第四句。'])
  })

  it('换行也是句子边界', () => {
    const chunks = chunkText('第一行\n第二行\n第三行', 10)
    expect(chunks).toEqual(['第一行\n第二行\n', '第三行'])
  })

  it('单句超长被硬切', () => {
    const long = 'a'.repeat(250)
    const chunks = chunkText(long, 100)
    expect(chunks.length).toBe(3)
    expect(chunks[0]!.length).toBe(100)
    expect(chunks[1]!.length).toBe(100)
    expect(chunks[2]!.length).toBe(50)
    expect(chunks.join('')).toBe(long)
  })

  it('前有累积、后接超长句：先落段再硬切', () => {
    const chunks = chunkText('短句。' + 'b'.repeat(250), 100)
    expect(chunks[0]).toBe('短句。')
    expect(chunks.length).toBe(4)
    expect(chunks.join('')).toBe('短句。' + 'b'.repeat(250))
  })

  it('首尾空白被修剪', () => {
    expect(chunkText('  你好  ')).toEqual(['你好'])
  })

  it('空文本抛中文错', () => {
    expect(() => chunkText('')).toThrow(/请输入要朗读的文字/)
    expect(() => chunkText('   ')).toThrow(/请输入要朗读的文字/)
  })

  it('分段长度参数非法抛中文错', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, MAX_CHUNK_PARAM + 1]) {
      expect(() => chunkText('你好', bad)).toThrow(/分段长度非法/)
    }
  })

  it('默认分段长度为 200', () => {
    expect(MAX_CHUNK_LEN).toBe(200)
    const chunks = chunkText('c'.repeat(400))
    expect(chunks.length).toBe(2)
  })
})

describe('text-to-audio / 摘要', () => {
  it('生成中文摘要', () => {
    expect(formatSpeakSummary(3, 1, 1)).toBe('共 3 段，语速 1×，音调 1')
    expect(formatSpeakSummary(1, 1.5, 0.8)).toBe('共 1 段，语速 1.5×，音调 0.8')
  })

  it('分段数非法抛中文错', () => {
    expect(() => formatSpeakSummary(0, 1, 1)).toThrow(/分段数非法/)
    expect(() => formatSpeakSummary(1.5, 1, 1)).toThrow(/分段数非法/)
  })
})
