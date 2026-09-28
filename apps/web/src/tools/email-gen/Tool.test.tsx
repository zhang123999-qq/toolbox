// @vitest-environment jsdom
/**
 * email-gen 组件测试：fetch 全部 mock。
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

describe('email-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('收件人输入框、语气/语言下拉框存在且 Key 为密码框', () => {
    render(<Tool />)
    for (const id of ['base-url', 'model', 'api-key', 'generate', 'input-recipient']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('api-key') as HTMLInputElement).getAttribute('type')).toBe('password')
    expect(screen.getByLabelText('语气')).toBeTruthy()
    expect(screen.getByLabelText('语言')).toBeTruthy()
  })

  it('生成成功 → 展示主题与正文', async () => {
    mockFetch('主题：调休申请\n\n张经理您好，我想申请本周五调休。')
    render(<Tool />)
    fireEvent.change(byTestId('input-recipient'), { target: { value: '张经理' } })
    fireEvent.change(byTestId('input'), { target: { value: '申请调休' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result').textContent).toContain('调休申请')
    expect(byTestId('result').textContent).toContain('张经理您好')
  })

  it('返回缺主题 → 中文错误提示', async () => {
    mockFetch('张经理您好，我想调休。')
    render(<Tool />)
    fireEvent.change(byTestId('input-recipient'), { target: { value: '张经理' } })
    fireEvent.change(byTestId('input'), { target: { value: '申请调休' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('未找到邮件主题')
  })

  it('收件人为空 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '申请调休' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('收件人不能为空')
  })

  it('目的为空 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-recipient'), { target: { value: '张经理' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('写信目的不能为空')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-recipient'), { target: { value: '张经理' } })
    fireEvent.change(byTestId('input'), { target: { value: '申请调休' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })

  it('401 → 中文错误提示', async () => {
    mockFetch('', 401)
    render(<Tool />)
    fireEvent.change(byTestId('input-recipient'), { target: { value: '张经理' } })
    fireEvent.change(byTestId('input'), { target: { value: '申请调休' } })
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.click(byTestId('generate'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })
})
