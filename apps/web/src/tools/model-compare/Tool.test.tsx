// @vitest-environment jsdom
/**
 * model-compare 组件测试：fetch 全部 mock，两侧独立返回。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

/** 按模型名返回不同内容；model-bad 返回 401 */
function mockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const model = (JSON.parse(init.body) as { model: string }).model
      if (model === 'model-bad') {
        return { ok: false, status: 401, text: async () => 'bad key' } as Response
      }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: `回答来自 ${model}` } }] }),
      } as Response
    }),
  )
}

function fillSide(prefix: 'a' | 'b', model: string, key: string): void {
  fireEvent.change(byTestId(`${prefix}-model`), { target: { value: model } })
  fireEvent.change(byTestId(`${prefix}-key`), { target: { value: key } })
}

describe('model-compare · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('两侧配置输入框存在', () => {
    render(<Tool />)
    for (const id of ['a-base-url', 'a-model', 'a-key', 'b-base-url', 'b-model', 'b-key']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('a-key') as HTMLInputElement).getAttribute('type')).toBe('password')
  })

  it('对比成功 → 两侧并排展示输出与耗时', async () => {
    mockFetch()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '你好' } })
    fillSide('a', 'model-a', 'sk-a')
    fillSide('b', 'model-b', 'sk-b')
    fireEvent.click(byTestId('compare'))
    await waitFor(() => expect(byTestId('result-a-output')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-a-output').textContent).toContain('回答来自 model-a')
    expect(byTestId('result-b-output').textContent).toContain('回答来自 model-b')
    expect(byTestId('result-a-time').textContent).toContain('耗时')
  })

  it('一侧 401 → 该侧显示中文错误，另一侧正常', async () => {
    mockFetch()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '你好' } })
    fillSide('a', 'model-bad', 'sk-bad')
    fillSide('b', 'model-b', 'sk-b')
    fireEvent.click(byTestId('compare'))
    await waitFor(() => expect(byTestId('result-a-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-a-error').textContent).toContain('API Key 无效')
    expect(byTestId('result-b-output').textContent).toContain('回答来自 model-b')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '你好' } })
    fireEvent.click(byTestId('compare'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })

  it('同步 A→B 把地址与 Key 复制到 B', () => {
    render(<Tool />)
    fireEvent.change(byTestId('a-base-url'), { target: { value: 'https://x.ai/v1' } })
    fireEvent.change(byTestId('a-key'), { target: { value: 'sk-same' } })
    fireEvent.click(byTestId('a-sync'))
    expect((byTestId('b-base-url') as HTMLInputElement).value).toBe('https://x.ai/v1')
    expect((byTestId('b-key') as HTMLInputElement).value).toBe('sk-same')
  })

  it('清除 Key → 两侧 Key 清空且 localStorage 删除', () => {
    localStorage.setItem('toolbox:model-compare:key-a', 'sk-a')
    render(<Tool />)
    fireEvent.click(byTestId('clear-key'))
    expect((byTestId('a-key') as HTMLInputElement).value).toBe('')
    expect(localStorage.getItem('toolbox:model-compare:key-a')).toBeNull()
  })
})
