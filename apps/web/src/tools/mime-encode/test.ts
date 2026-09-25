import { describe, expect, it } from 'vitest'
import { decodeMimeHeader, encodeMimeHeader, transform } from './utils'

const encB = { direction: 'encode', charset: 'UTF-8', mode: 'B' } as const
const encQ = { direction: 'encode', charset: 'UTF-8', mode: 'Q' } as const
const dec = { direction: 'decode', charset: 'UTF-8', mode: 'B' } as const

describe('mime-encode / 编码', () => {
  it('B 模式输出 base64 形式的 encoded-word', () => {
    expect(encodeMimeHeader('工具库', 'UTF-8', 'B')).toBe('=?UTF-8?B?5bel5YW35bqT?=')
  })

  it('Q 模式输出 =XX 形式，空格写成下划线', () => {
    expect(encodeMimeHeader('工具库', 'UTF-8', 'Q')).toBe('=?UTF-8?Q?=E5=B7=A5=E5=85=B7=E5=BA=93?=')
    expect(encodeMimeHeader('a 中', 'UTF-8', 'Q')).toBe('=?UTF-8?Q?a_=E4=B8=AD?=')
  })

  it('下划线 / 问号在 Q 模式下会被转义（它们是 encoded-word 的保留字符）', () => {
    expect(encodeMimeHeader('中_?', 'UTF-8', 'Q')).toBe('=?UTF-8?Q?=E4=B8=AD=5F=3F?=')
  })

  it('纯 ASCII 输入按原样输出（不编码）', () => {
    expect(encodeMimeHeader('Hello World', 'UTF-8', 'B')).toBe('Hello World')
  })

  it('过长的纯 ASCII 头按空白折行', () => {
    const text = 'a'.repeat(40) + ' ' + 'b'.repeat(40)
    expect(encodeMimeHeader(text, 'UTF-8', 'B')).toBe('a'.repeat(40) + '\r\n ' + 'b'.repeat(40))
  })

  it('长文本拆成多个 encoded-word，每个不超过 75 字符', () => {
    const encoded = encodeMimeHeader('中'.repeat(200), 'UTF-8', 'B')
    const words = encoded.split('\r\n ')
    expect(words.length).toBeGreaterThan(1)
    for (const word of words) {
      expect(word.length).toBeLessThanOrEqual(75)
    }
  })
})

describe('mime-encode / 解码', () => {
  it('B 模式还原', () => {
    expect(decodeMimeHeader('=?UTF-8?B?5bel5YW35bqT?=')).toBe('工具库')
  })

  it('Q 模式下划线还原为空格', () => {
    expect(decodeMimeHeader('=?UTF-8?Q?a_=E4=B8=AD?=')).toBe('a 中')
  })

  it('相邻 encoded-word 之间的空白被丢弃', () => {
    expect(decodeMimeHeader('=?UTF-8?B?5bel?= =?UTF-8?B?5YW3?=')).toBe('工具')
  })

  it('没有 encoded-word 时原样返回（解码不是必须报错）', () => {
    expect(decodeMimeHeader('Hello 世界')).toBe('Hello 世界')
  })
})

describe('mime-encode / transform', () => {
  it('按方向执行', () => {
    expect(transform({ text: '工具库' }, encB)).toBe('=?UTF-8?B?5bel5YW35bqT?=')
    expect(transform({ text: '工具库' }, encQ)).toBe('=?UTF-8?Q?=E5=B7=A5=E5=85=B7=E5=BA=93?=')
    expect(transform({ text: '=?UTF-8?B?5bel5YW35bqT?=' }, dec)).toBe('工具库')
  })

  it('B / Q 两种模式都能往返一致', () => {
    const text = '中文 abc 🚀 与下划线_和问号?'
    expect(decodeMimeHeader(encodeMimeHeader(text, 'UTF-8', 'B'))).toBe(text)
    expect(decodeMimeHeader(encodeMimeHeader(text, 'UTF-8', 'Q'))).toBe(text)
  })

  it('空串返回空串（边界）', () => {
    expect(transform({ text: '' }, encB)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('base64 数据非法时报错', () => {
    expect(() => transform({ text: '=?UTF-8?B?@@@?=' }, dec)).toThrow(/base64 数据不合法/)
  })

  it('Q 模式的 = 转义非法时报错', () => {
    expect(() => transform({ text: '=?UTF-8?Q?=ZZ?=' }, dec)).toThrow(/转义不合法/)
  })

  it('charset 标签会写进 encoded-word', () => {
    expect(encodeMimeHeader('中', 'GB2312', 'B')).toMatch(/^=\?GB2312\?B\?/)
    expect(encodeMimeHeader('中', 'ISO-8859-1', 'Q')).toMatch(/^=\?ISO-8859-1\?Q\?/)
  })
})
