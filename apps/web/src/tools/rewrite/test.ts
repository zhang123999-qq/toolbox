import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { promptOf, transform } from './utils'

const CONFIG = {
  text: '这个东西挺好的，就是有点小问题。',
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
      json: async () => ({ choices: [{ message: { content: '改写后的文本' } }] }),
      text: async () => '改写后的文本',
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rewrite / promptOf', () => {
  it('每种风格都有对应指令', () => {
    expect(promptOf('polish', 'x')).toContain('润色')
    expect(promptOf('formal', 'x')).toContain('正式书面语')
    expect(promptOf('casual', 'x')).toContain('口语化')
    expect(promptOf('concise', 'x')).toContain('压缩')
    expect(promptOf('expand', 'x')).toContain('展开')
  })

  it('指令后面接原文', () => {
    expect(promptOf('polish', '原文内容')).toContain('原文内容')
  })
})

describe('rewrite / transform', () => {
  it('返回模型改写的正文', async () => {
    await expect(transform({ ...CONFIG }, { style: 'polish' })).resolves.toBe('改写后的文本')
  })

  it('请求里带上了选中的风格指令', async () => {
    await transform({ ...CONFIG }, { style: 'formal' })
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as { body: string }).body)
    expect(body.messages[1].content).toContain('正式书面语')
  })

  it('空输入返回空串且不发请求', async () => {
    await expect(transform({ ...CONFIG, text: '  ' }, { style: 'polish' })).resolves.toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('缺接口地址时给出缺项提示', async () => {
    await expect(transform({ ...CONFIG, apiBase: '' }, { style: 'polish' })).rejects.toThrow(
      '请先填写',
    )
  })
})
