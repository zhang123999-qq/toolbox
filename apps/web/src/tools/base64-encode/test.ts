import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64, transform } from './utils'

const enc = { direction: 'encode', mode: 'standard' } as const
const dec = { direction: 'decode', mode: 'standard' } as const
const encUrl = { direction: 'encode', mode: 'urlsafe' } as const

describe('base64-encode / encode', () => {
  it('ASCII 文本编码（与已知值一致）', () => {
    expect(encodeBase64('hello', false)).toBe('aGVsbG8=')
  })

  it('中文按 UTF-8 编码后再 Base64', () => {
    expect(encodeBase64('工具库', false)).toBe('5bel5YW35bqT')
  })

  it('emoji（代理对）往返不丢字符', () => {
    const text = 'a🚀b'
    expect(decodeBase64(encodeBase64(text, false))).toBe(text)
  })

  it('URL-safe 变体把 +/ 换成 -_ 并去掉填充', () => {
    const encoded = encodeBase64('??>>??', true)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeBase64(encoded)).toBe('??>>??')
  })

  it('超过分块阈值的长文本不炸栈', () => {
    const text = 'A'.repeat(100000)
    expect(decodeBase64(encodeBase64(text, false))).toBe(text)
  })
})

describe('base64-encode / decode', () => {
  it('忽略输入中的空白与换行', () => {
    expect(decodeBase64('aGVs\n bG8=')).toBe('hello')
  })

  it('自动补齐缺失的 = 填充', () => {
    expect(decodeBase64('aGVsbG8')).toBe('hello')
  })

  it('解码时把 URL-safe 的 -_ 还原为 +/', () => {
    // '??>>??' 的标准 Base64 含 +/，改写成 URL-safe 后仍应能解回原文
    const standard = encodeBase64('??>>??', false)
    const urlsafe = standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(urlsafe).toMatch(/[-_]/) // 先确认样本确实含 URL-safe 专有字符
    expect(decodeBase64(urlsafe)).toBe('??>>??')
  })
})

describe('base64-encode / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: 'hello' }, enc)).toBe('aGVsbG8=')
    expect(transform({ text: 'aGVsbG8=' }, dec)).toBe('hello')
  })

  it('urlsafe 模式输出无 +/=', () => {
    expect(transform({ text: '??>>??' }, encUrl)).not.toMatch(/[+/=]/)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, enc)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非法 Base64 抛出可读错误', () => {
    expect(() => transform({ text: '!!!not-base64!!!' }, dec)).toThrow(/解码失败/)
  })

  it('解码结果不是合法 UTF-8 时报错而不是产出乱码', () => {
    expect(() => transform({ text: '/w==' }, dec)).toThrow(/解码失败/)
  })
})
