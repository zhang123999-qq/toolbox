// @vitest-environment jsdom
/**
 * naming-gen 组件测试：fetch 全部 mock。
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

describe('naming-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('配置输入框、风格下拉框存在且 Key 为密码框', () => {
    render(<Tool />)
    for (const id of ['base-url', 'model', 'api-key', 'generate']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('api-key') as HTMLInputElement).getAttribute('type')).toBe('password')
    expect(screen.getByLabelText('命名风格')).toBeTruthy()
  })

  it('生成成功 → 展示候选命名列表', async () => {
    mockFetch('1. userName\n2. userFullName\n3. nameOfUser')
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '用户的姓名' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result').textContent).toContain('userName')
    expect(byTestId('result').textContent).toContain('userFullName')
  })

  it('返回解析不出候选 → 中文错误提示', async () => {
    mockFetch(' - \n') // trim 后非空，但拆不出候选名
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '用户的姓名' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('未能解析出候选命名')
  })

  it('描述为空 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('描述不能为空')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '用户的姓名' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })

  it('401 → 中文错误提示', async () => {
    mockFetch('', 401)
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '用户的姓名' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })
})
