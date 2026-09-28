// @vitest-environment jsdom
/**
 * ai-image-gen 组件测试：fetch 全部 mock。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)
beforeEach(() => {
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

/** 成功返回图片 url；model-bad 返回 401 */
function mockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { model: string }
      if (body.model === 'model-bad') {
        return { ok: false, status: 401, text: async () => 'bad key' } as Response
      }
      return {
        ok: true,
        json: async () => ({ data: [{ url: 'https://x/y.png' }] }),
      } as Response
    }),
  )
}

function fillKey(): void {
  fireEvent.change(byTestId('api-key'), { target: { value: 'sk-test' } })
}

describe('ai-image-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('配置输入框存在且 Key 为密码框', () => {
    render(<Tool />)
    for (const id of ['base-url', 'model', 'api-key', 'size', 'generate']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('api-key') as HTMLInputElement).getAttribute('type')).toBe('password')
  })

  it('生成成功 → 展示图片与下载按钮', async () => {
    mockFetch()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '一只猫' } })
    fillKey()
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('result-image')).toBeTruthy(), { timeout: 10000 })
    expect((byTestId('result-image') as HTMLImageElement).getAttribute('src')).toBe(
      'https://x/y.png',
    )
    expect(byTestId('download-image')).toBeTruthy()
  })

  it('401 → 中文错误提示', async () => {
    mockFetch()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '一只猫' } })
    fillKey()
    fireEvent.change(byTestId('model'), { target: { value: 'model-bad' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })

  it('描述为空 → 中文错误提示', async () => {
    render(<Tool />)
    fillKey()
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('图像描述不能为空')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '一只猫' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })
})
