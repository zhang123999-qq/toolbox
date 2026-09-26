import { describe, expect, it } from 'vitest'
import type { WebhookTestOptions } from './schema'
import { assertUrl, resolvePayload, transform } from './utils'

const NONE: WebhookTestOptions = {}

describe('webhook-test / assertUrl', () => {
  it('合法 URL 通过', () => {
    expect(() => assertUrl('https://hooks.example.com/x')).not.toThrow()
  })
  it('空/缺协议报错', () => {
    expect(() => assertUrl('')).toThrow(/请输入/)
    expect(() => assertUrl('hooks.example.com')).toThrow(/http/)
  })
})

describe('webhook-test / resolvePayload', () => {
  it('空 payload 用空对象', () => {
    expect(resolvePayload('   ')).toBe('{}')
  })
  it('合法 JSON 原样返回', () => {
    expect(resolvePayload('{"a":1}')).toBe('{"a":1}')
  })
  it('非法 JSON 报错', () => {
    expect(() => resolvePayload('{bad')).toThrow(/不是合法 JSON/)
  })
})

describe('webhook-test / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '', payload: '' }, NONE)).resolves.toBe('')
  })
  it('非法 URL 在发请求前抛错', async () => {
    await expect(transform({ text: 'hooks', payload: '' }, NONE)).rejects.toThrow(/http/)
  })
  it('非法 payload 在发请求前抛错', async () => {
    await expect(transform({ text: 'https://h.com', payload: '{oops' }, NONE)).rejects.toThrow(
      /不是合法 JSON/,
    )
  })
  it('超长输入报错', async () => {
    await expect(
      transform({ text: 'http://h.com', payload: 'x'.repeat(200001) }, NONE),
    ).rejects.toThrow(/上限/)
  })
})
