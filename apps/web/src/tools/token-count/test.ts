import { describe, expect, it } from 'vitest'
import { MAX_TEXT_CHARS, TOKENIZER_OPTIONS, countTokensWithEncode, formatTokenCount } from './utils'

/** fake encode：按字符切分，模拟分词器 */
const fakeEncode = (t: string): readonly number[] => t.split('').map((_, i) => i)

describe('token-count · utils', () => {
  it('TOKENIZER_OPTIONS 有两种分词器', () => {
    expect(TOKENIZER_OPTIONS.map((o) => o.id)).toEqual(['o200k', 'cl100k'])
  })

  it('正常统计', () => {
    expect(countTokensWithEncode('hello', fakeEncode)).toBe(5)
    expect(countTokensWithEncode('你好世界', fakeEncode)).toBe(4)
  })

  it('空文本返回 0（不调用 encode）', () => {
    let called = false
    const spy = (t: string): readonly number[] => {
      called = true
      return fakeEncode(t)
    }
    expect(countTokensWithEncode('', spy)).toBe(0)
    expect(called).toBe(false)
  })

  it('encode 非函数抛中文错', () => {
    expect(() => countTokensWithEncode('hi', undefined as never)).toThrow('分词器未加载')
    expect(() => countTokensWithEncode('hi', null as never)).toThrow('分词器未加载')
  })

  it('文本非字符串抛中文错', () => {
    expect(() => countTokensWithEncode(undefined as never, fakeEncode)).toThrow('必须是文本')
  })

  it('超长文本抛中文错', () => {
    expect(() => countTokensWithEncode('x'.repeat(MAX_TEXT_CHARS + 1), fakeEncode)).toThrow(
      '文本过长',
    )
  })

  it('encode 返回非数组抛中文错', () => {
    const bad = (() => 'nope') as never
    expect(() => countTokensWithEncode('hi', bad)).toThrow('没有返回数组')
  })

  it('formatTokenCount 千分位展示', () => {
    expect(formatTokenCount(0)).toBe('共 0 个 token')
    expect(formatTokenCount(1234)).toBe('共 1,234 个 token')
  })

  it('formatTokenCount 非法数字抛中文错', () => {
    expect(() => formatTokenCount(-1)).toThrow('token 数非法')
    expect(() => formatTokenCount(1.5)).toThrow('token 数非法')
    expect(() => formatTokenCount(NaN)).toThrow('token 数非法')
  })
})
