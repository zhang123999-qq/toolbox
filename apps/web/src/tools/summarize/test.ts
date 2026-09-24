import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { extractive, splitSentences, transform } from './utils'

const CONFIG = {
  text: '第一句讲甲。第二句讲乙。第三句讲丙。',
  apiBase: 'https://api.example.com/v1',
  apiKey: 'test-key',
  model: 'test-model',
}

/** 用一个固定的 OpenAI 风格响应替掉 fetch，测试里不发真实请求 */
function mockFetch(content: string) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  mockFetch('模型返回的摘要')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('summarize / splitSentences', () => {
  it('中英文句末标点都能切', () => {
    expect(splitSentences('你好。Hello world! 再来一句？')).toEqual([
      '你好。',
      'Hello world!',
      '再来一句？',
    ])
  })

  it('没有标点时整段算一句', () => {
    expect(splitSentences('没有标点')).toEqual(['没有标点'])
  })
})

describe('summarize / extractive', () => {
  const text = '文本摘要很有用。摘要可以省时间。省时间就是提高效率。'

  it('按请求句数取句', () => {
    expect(splitSentences(extractive(text, 2))).toHaveLength(2)
  })

  it('取出的句子按原文顺序排列', () => {
    const out = extractive(text, 3)
    expect(out.startsWith('文本摘要很有用。')).toBe(true)
  })

  it('请求句数超过总句数时返回全部', () => {
    expect(splitSentences(extractive(text, 99))).toHaveLength(3)
  })

  it('空文本返回空串', () => {
    expect(extractive('', 3)).toBe('')
  })
})

describe('summarize / transform', () => {
  it('extractive 模式不发请求', async () => {
    await expect(transform({ ...CONFIG }, { mode: 'extractive', length: '1' })).resolves.toContain(
      '。',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('abstractive 模式返回模型给的正文', async () => {
    await expect(transform({ ...CONFIG }, { mode: 'abstractive', length: '3' })).resolves.toBe(
      '模型返回的摘要',
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('空输入直接返回空串，不调接口', async () => {
    await expect(
      transform({ ...CONFIG, text: '   ' }, { mode: 'abstractive', length: '3' }),
    ).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('缺 API Key 时给出缺项提示', async () => {
    await expect(
      transform({ ...CONFIG, apiKey: '' }, { mode: 'abstractive', length: '3' }),
    ).rejects.toThrow('请先填写')
  })

  it('接口返回非 200 时带上状态码报错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' }),
    )
    await expect(transform({ ...CONFIG }, { mode: 'abstractive', length: '3' })).rejects.toThrow(
      '429',
    )
  })
})
