import { describe, expect, it } from 'vitest'
import type { HttpClientOptions } from './schema'
import { assertUrl, parseHeaders, transform } from './utils'

const base: HttpClientOptions = { method: 'GET', noCors: false }

describe('http-client / parseHeaders', () => {
  it('解析多行 Key: Value', () => {
    expect(parseHeaders('Content-Type: application/json\nX-A: 1\n\nBadLine')).toEqual({
      'Content-Type': 'application/json',
      'X-A': '1',
    })
  })
  it('空输入返回空对象', () => {
    expect(parseHeaders('')).toEqual({})
  })
})

describe('http-client / assertUrl', () => {
  it('合法 URL 通过', () => {
    expect(() => assertUrl('https://a.com')).not.toThrow()
  })
  it('空/缺协议报错', () => {
    expect(() => assertUrl('')).toThrow(/请输入/)
    expect(() => assertUrl('a.com')).toThrow(/http/)
  })
})

describe('http-client / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '', headers: '', body: '' }, base)).resolves.toBe('')
  })
  it('非法 URL 在发请求前抛错', async () => {
    await expect(transform({ text: 'a.com', headers: '', body: '' }, base)).rejects.toThrow(/http/)
  })
  it('超长输入报错', async () => {
    await expect(
      transform({ text: 'http://x'.repeat(50000), headers: '', body: '' }, base),
    ).rejects.toThrow(/上限/)
  })
})
