import { describe, expect, it } from 'vitest'
import {
  decodePunycode,
  decodePunycodeLabel,
  encodePunycode,
  encodePunycodeLabel,
  transform,
} from './utils'

const enc = { direction: 'encode' } as const
const dec = { direction: 'decode' } as const

describe('punycode / 标签级（RFC 3492 §7.1 样例）', () => {
  it('中文「中国」编码为已知向量 fiqs8s', () => {
    expect(encodePunycodeLabel('中国')).toBe('fiqs8s')
  })

  it('简化中文长样例与 RFC 一致', () => {
    expect(encodePunycodeLabel('他们为什么不说中文')).toBe('ihqwcrb4cv8a8dqg056pqjye')
  })

  it('含 ASCII 前缀的样例同样与 RFC 一致', () => {
    expect(encodePunycodeLabel('Pročprostěnemluvíčesky')).toBe('Proprostnemluvesky-uyb24dma41a')
  })

  it('越南语样例（带声调符号）与 RFC 一致', () => {
    expect(encodePunycodeLabel('TạisaohọkhôngthểchỉnóitiếngViệt')).toBe(
      'TisaohkhngthchnitingVit-kjcr8268qyxafd2f1b9g',
    )
  })

  it('解码 RFC 样例还原出原文', () => {
    expect(decodePunycodeLabel('Proprostnemluvesky-uyb24dma41a')).toBe('Pročprostěnemluvíčesky')
  })
})

describe('punycode / 域名级', () => {
  it('中文域名编成 xn-- 形式', () => {
    expect(encodePunycode('中国.中国')).toBe('xn--fiqs8s.xn--fiqs8s')
  })

  it('纯 ASCII 域名原样输出', () => {
    expect(encodePunycode('example.com')).toBe('example.com')
  })

  it('混合域名只改写非 ASCII 标签', () => {
    expect(encodePunycode('中国.com')).toBe('xn--fiqs8s.com')
    expect(decodePunycode('xn--fiqs8s.com')).toBe('中国.com')
  })

  it('单标签域名带上 xn-- 前缀后与 RFC 样例一致', () => {
    expect(encodePunycode('他们为什么不说中文')).toBe('xn--ihqwcrb4cv8a8dqg056pqjye')
    expect(encodePunycode('Pročprostěnemluvíčesky')).toBe('xn--Proprostnemluvesky-uyb24dma41a')
  })

  it('xn-- 前缀大小写不敏感', () => {
    expect(decodePunycode('XN--FIQS8S')).toBe('中国')
  })
})

describe('punycode / transform', () => {
  it('按方向执行', () => {
    expect(transform({ text: '中国' }, enc)).toBe('xn--fiqs8s')
    expect(transform({ text: 'xn--fiqs8s' }, dec)).toBe('中国')
  })

  it('emoji 标签往返一致', () => {
    const text = '🚀.中国'
    expect(decodePunycode(encodePunycode(text))).toBe(text)
  })

  it('空串返回空串（边界）', () => {
    expect(transform({ text: '' }, enc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('解码没有 xn-- 标签的输入时报错', () => {
    expect(() => transform({ text: 'example.com' }, dec)).toThrow(/没有 xn-- 前缀/)
  })

  it('非法 Punycode 报错而不是产出乱码', () => {
    expect(() => transform({ text: 'xn--!!!' }, dec)).toThrow(/不是合法的 Punycode/)
  })

  it('空的 Punycode 标签报错', () => {
    expect(() => transform({ text: 'xn--' }, dec)).toThrow(/缺少可解码的标签内容/)
  })
})
