import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { promptOf, transform } from './utils'

const CONFIG = {
  text: '这是一段中文。',
  apiBase: 'https://api.example.com/v1',
  apiKey: 'test-key',
  model: 'test-model',
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'This is a paragraph.' } }] }),
      text: async () => 'This is a paragraph.',
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('translate / promptOf', () => {
  it('自动识别时不提源语言', () => {
    expect(promptOf('auto', 'en', 'x')).toBe('请把下面的内容翻译成英文：\n\nx')
  })

  it('指定源语言时写进指令', () => {
    expect(promptOf('zh', 'ja', 'x')).toContain('源语言：中文')
    expect(promptOf('zh', 'ja', 'x')).toContain('日文')
  })
})

describe('translate / transform', () => {
  it('返回模型给的译文', async () => {
    await expect(transform({ ...CONFIG }, { source: 'auto', target: 'en' })).resolves.toBe(
      'This is a paragraph.',
    )
  })

  it('指令里带上了目标语言', async () => {
    await transform({ ...CONFIG }, { source: 'zh', target: 'fr' })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as { body: string }).body)
    expect(body.messages[1].content).toContain('法文')
  })

  it('空输入返回空串且不发请求', async () => {
    await expect(
      transform({ ...CONFIG, text: '' }, { source: 'auto', target: 'en' }),
    ).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('缺模型名时给出缺项提示', async () => {
    await expect(
      transform({ ...CONFIG, model: ' ' }, { source: 'auto', target: 'en' }),
    ).rejects.toThrow('请先填写')
  })
})
