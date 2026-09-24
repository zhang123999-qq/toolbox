import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { promptOf, transform } from './utils'

const CONFIG = {
  text: '一段用于拟标题的正文内容。',
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
      json: async () => ({ choices: [{ message: { content: '标题一\n标题二\n标题三' } }] }),
      text: async () => '标题一\n标题二\n标题三',
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('title-gen / promptOf', () => {
  it('每种风格都有对应指令', () => {
    expect(promptOf('neutral', '3', 'x')).toContain('准确概括')
    expect(promptOf('seo', '3', 'x')).toContain('搜索引擎')
    expect(promptOf('question', '3', 'x')).toContain('疑问')
    expect(promptOf('howto', '3', 'x')).toContain('如何')
  })

  it('把候选数量写进指令', () => {
    expect(promptOf('neutral', '5', 'x')).toContain('5 个候选')
  })
})

describe('title-gen / transform', () => {
  it('返回模型给的标题候选', async () => {
    await expect(transform({ ...CONFIG }, { style: 'neutral', count: '3' })).resolves.toBe(
      '标题一\n标题二\n标题三',
    )
  })

  it('请求里带上了选中的风格', async () => {
    await transform({ ...CONFIG }, { style: 'seo', count: '1' })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as { body: string }).body)
    expect(body.messages[1].content).toContain('搜索引擎')
  })

  it('空输入返回空串且不发请求', async () => {
    await expect(
      transform({ ...CONFIG, text: '' }, { style: 'neutral', count: '3' }),
    ).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('缺接口信息时给出缺项提示', async () => {
    await expect(
      transform(
        { ...CONFIG, apiBase: '', apiKey: '', model: '' },
        { style: 'neutral', count: '3' },
      ),
    ).rejects.toThrow('请先填写')
  })
})
