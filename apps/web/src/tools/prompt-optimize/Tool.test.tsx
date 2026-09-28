// @vitest-environment jsdom
/**
 * prompt-optimize 组件测试：fetch 全部 mock，不发起真实网络请求。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

const LS_KEY = 'toolbox:prompt-optimize:api-key'

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function mockFetchOnce(json: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ok
        ? ({ ok: true, json: async () => json } as Response)
        : ({ ok: false, status, text: async () => 'invalid key' } as Response),
    ),
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('prompt-optimize · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供 BYOK 输入：Key 密码框、记住勾选、清除按钮', () => {
    render(<Tool />)
    const key = byTestId('api-key') as HTMLInputElement
    expect(key.getAttribute('type')).toBe('password')
    expect(byTestId('remember-key')).toBeTruthy()
    expect(byTestId('clear-key')).toBeTruthy()
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '写篇文章' } })
    fireEvent.click(byTestId('optimize'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })

  it('优化成功 → 并排展示优化前后', async () => {
    mockFetchOnce({ choices: [{ message: { content: '写文章…' } }] })
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '写篇文章' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-test' } })
    fireEvent.click(byTestId('optimize'))
    await waitFor(() => expect(byTestId('optimized-prompt')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('optimized-prompt').textContent).toContain('写文章')
    expect(byTestId('raw-prompt').textContent).toContain('写篇文章')
  })

  it('401 → 中文认证失败提示', async () => {
    mockFetchOnce({}, false, 401)
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '写篇文章' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-bad' } })
    fireEvent.click(byTestId('optimize'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })

  it('网络异常 → 中文提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '写篇文章' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-test' } })
    fireEvent.click(byTestId('optimize'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('网络请求失败')
  })

  it('勾选记住 → Key 存入 localStorage；清除按钮可删', async () => {
    mockFetchOnce({ choices: [{ message: { content: 'ok' } }] })
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '写篇文章' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-remember' } })
    fireEvent.click(byTestId('remember-key'))
    fireEvent.click(byTestId('optimize'))
    await waitFor(() => expect(byTestId('optimized-prompt')).toBeTruthy(), { timeout: 10000 })
    expect(localStorage.getItem(LS_KEY)).toBe('sk-remember')
    fireEvent.click(byTestId('clear-key'))
    expect(localStorage.getItem(LS_KEY)).toBeNull()
    expect((byTestId('api-key') as HTMLInputElement).value).toBe('')
  })

  it('启动时从 localStorage 恢复已保存的 Key', () => {
    localStorage.setItem(LS_KEY, 'sk-saved')
    render(<Tool />)
    expect((byTestId('api-key') as HTMLInputElement).value).toBe('sk-saved')
  })
})
