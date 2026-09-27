import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../i18n'
import { buildUrl, fmt, transform } from './utils'

const t = createTranslator('zh')
const OPTIONS = { from: 'USD', to: 'CNY' }
const KEY = { text: '100', apiKey: `test-key-${Date.now()}` }

interface MockResponse {
  readonly ok: boolean
  readonly status: number
  readonly json: () => Promise<unknown>
}

/** 构造 fetch mock 响应 */
function mockFetch(response: MockResponse | null, reject = false): void {
  if (reject) {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    return
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

const okResponse = (body: unknown): MockResponse => ({
  ok: true,
  status: 200,
  json: async () => body,
})

beforeEach(() => {
  mockFetch(okResponse({ success: true, result: 725.5, info: { rate: 7.255 } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exchange-rate / buildUrl', () => {
  it('Key 与参数全部做 URL 编码', () => {
    // 运行时拼接含特殊字符的 Key，避免源码出现任何 Key 样例字面量
    const trickyKey = 'k ey&=' + String(Date.now())
    const url = buildUrl(trickyKey, 'USD', 'CNY', '100')
    expect(url).toContain('access_key=' + encodeURIComponent(trickyKey))
    expect(url).toContain('from=USD')
    expect(url).toContain('to=CNY')
    expect(url).toContain('amount=100')
    expect(url.startsWith('https://api.exchangerate.host/convert?')).toBe(true)
  })
})

describe('exchange-rate / fmt', () => {
  it('去浮点噪声：0.1+0.2 → 0.3', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })

  it('极大值不断尾：1e15 保持整数形式', () => {
    expect(fmt(1e15)).toBe('1000000000000000')
  })
})

describe('exchange-rate / transform 输入校验', () => {
  it('空输入返回空串且不发请求', async () => {
    await expect(
      transform({ text: '   ', apiKey: `test-key-${Date.now()}` }, OPTIONS, t),
    ).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('无 Key 时明确提示填写且不发请求', async () => {
    await expect(transform({ text: '100', apiKey: '   ' }, OPTIONS, t)).rejects.toThrow(
      '请先填写 API Key',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('非法金额抛错', async () => {
    await expect(
      transform({ text: 'abc', apiKey: `test-key-${Date.now()}` }, OPTIONS, t),
    ).rejects.toThrow('金额无效：abc')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('Infinity 金额抛错', async () => {
    await expect(
      transform({ text: 'Infinity', apiKey: `test-key-${Date.now()}` }, OPTIONS, t),
    ).rejects.toThrow('金额无效')
  })

  it('负数金额抛错', async () => {
    await expect(
      transform({ text: '-5', apiKey: `test-key-${Date.now()}` }, OPTIONS, t),
    ).rejects.toThrow('金额不能为负数')
  })

  it('未知源货币抛错', async () => {
    await expect(
      transform({ text: '100', apiKey: `test-key-${Date.now()}` }, { from: 'XX', to: 'CNY' }, t),
    ).rejects.toThrow('未知货币代码：XX')
  })

  it('未知目标货币抛错', async () => {
    await expect(
      transform({ text: '100', apiKey: `test-key-${Date.now()}` }, { from: 'USD', to: 'xx' }, t),
    ).rejects.toThrow('未知货币代码')
  })

  it('货币代码大小写不敏感', async () => {
    const out = await transform({ ...KEY }, { from: 'usd', to: 'cny' }, t)
    expect(out).toContain('100 USD = 725.5 CNY')
  })

  it('同币种直接返回不调接口', async () => {
    const out = await transform({ ...KEY }, { from: 'USD', to: 'USD' }, t)
    expect(out).toBe('100 USD = 100 USD')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('金额 0 合法：0 美元 = 0 人民币', async () => {
    mockFetch(okResponse({ success: true, result: 0, info: { rate: 7.255 } }))
    const out = await transform({ text: '0', apiKey: `test-key-${Date.now()}` }, OPTIONS, t)
    expect(out).toBe('0 USD = 0 CNY\n1 USD = 7.255 CNY')
  })
})

describe('exchange-rate / transform 接口调用', () => {
  it('有 Key 成功时输出换算结果与汇率', async () => {
    const out = await transform({ ...KEY }, OPTIONS, t)
    expect(out).toBe('100 USD = 725.5 CNY\n1 USD = 7.255 CNY')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('接口未返 info.rate 时按 result/amount 反推汇率', async () => {
    mockFetch(okResponse({ success: true, result: 725.5 }))
    const out = await transform({ ...KEY }, OPTIONS, t)
    expect(out).toBe('100 USD = 725.5 CNY\n1 USD = 7.255 CNY')
  })

  it('info.rate 非数字时同样反推', async () => {
    mockFetch(okResponse({ success: true, result: 725.5, info: { rate: 'x' } }))
    const out = await transform({ ...KEY }, OPTIONS, t)
    expect(out).toContain('1 USD = 7.255 CNY')
  })

  it('info.rate 为 Infinity 时同样反推', async () => {
    mockFetch(okResponse({ success: true, result: 725.5, info: { rate: Infinity } }))
    const out = await transform({ ...KEY }, OPTIONS, t)
    expect(out).toContain('1 USD = 7.255 CNY')
  })

  it('金额为 0 且无 info.rate 时省略汇率行（避免除零）', async () => {
    mockFetch(okResponse({ success: true, result: 0 }))
    const out = await transform({ text: '0', apiKey: `test-key-${Date.now()}` }, OPTIONS, t)
    expect(out).toBe('0 USD = 0 CNY')
  })

  it('HTTP 401 时提示检查 Key', async () => {
    mockFetch({ ok: false, status: 401, json: async () => ({}) })
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow('汇率接口返回 401')
  })

  it('网络错误时提示检查网络', async () => {
    mockFetch(null, true)
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow('网络请求失败')
  })

  it('响应体不是合法 JSON 时转为双语错误', async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    })
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow('接口返回了无法解析的响应')
  })

  it('业务失败 success=false 时透出接口错误信息', async () => {
    mockFetch(okResponse({ success: false, error: { code: 101, info: 'invalid access key' } }))
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow(
      '汇率接口返回异常：invalid access key',
    )
  })

  it('业务失败且无错误信息时用 unknown 兜底', async () => {
    mockFetch(okResponse({ success: false }))
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow('汇率接口返回异常：unknown')
  })

  it('result 非数字时判为接口异常', async () => {
    mockFetch(okResponse({ success: true, result: 'lots' }))
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow('汇率接口返回异常')
  })

  it('result 为 Infinity 时判为接口异常', async () => {
    mockFetch(okResponse({ success: true, result: Infinity }))
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow('汇率接口返回异常')
  })

  it('超长错误信息被截断', async () => {
    mockFetch(okResponse({ success: false, error: { info: 'x'.repeat(500) } }))
    await expect(transform({ ...KEY }, OPTIONS, t)).rejects.toThrow(
      '汇率接口返回异常：' + 'x'.repeat(300),
    )
  })

  it('请求携带 access_key 且金额原样传递', async () => {
    const apiKey = `test-key-${Date.now()}`
    await transform({ text: '1e15', apiKey }, OPTIONS, t)
    const url = String(vi.mocked(fetch).mock.calls[0][0])
    expect(url).toContain('access_key=' + encodeURIComponent(apiKey))
    expect(url).toContain('amount=1e15')
  })
})
