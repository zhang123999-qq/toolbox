// @vitest-environment jsdom
/**
 * regex-gen 组件测试：fetch 全部 mock；正则测试走纯 JS。
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

function mockFetch(content: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (status !== 200) {
        return { ok: false, status, text: async () => 'err' } as Response
      }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content } }] }),
      } as Response
    }),
  )
}

describe('regex-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('配置输入框存在且 Key 为密码框', () => {
    render(<Tool />)
    for (const id of ['base-url', 'model', 'api-key', 'generate']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('api-key') as HTMLInputElement).getAttribute('type')).toBe('password')
  })

  it('生成成功 → 展示正则与解释', async () => {
    mockFetch('```\n^1[3-9]\\d{9}$\n```\n\n^ 开头，1 开头…')
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '匹配手机号' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('pattern')).toBeTruthy(), { timeout: 10000 })
    expect((byTestId('pattern') as HTMLInputElement).value).toBe('^1[3-9]\\d{9}$')
    expect(byTestId('explanation').textContent).toContain('开头')
  })

  it('本地测试匹配 → 显示命中数', async () => {
    mockFetch('```\n\\d+\n```')
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '匹配数字' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('pattern')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('test-text'), { target: { value: 'a1b22' } })
    fireEvent.click(byTestId('test-match'))
    await waitFor(() => expect(byTestId('test-result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('test-result').textContent).toContain('命中 2 处')
  })

  it('非法正则测试 → 中文错误提示', async () => {
    mockFetch('```\n\\d+\n```')
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '匹配数字' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('pattern')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('pattern'), { target: { value: '([' } })
    fireEvent.change(byTestId('test-text'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('test-match'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('正则表达式非法')
  })

  it('需求为空 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('需求描述不能为空')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '匹配数字' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })

  it('401 → 中文错误提示', async () => {
    mockFetch('', 401)
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '匹配数字' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })
})
