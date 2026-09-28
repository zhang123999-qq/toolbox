// @vitest-environment jsdom
/**
 * ai-detect 组件测试：fetch 全部 mock。
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

const LONG_TEXT = '这是一段足够长的待检测文本。'.repeat(10)

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

function fillAndDetect(text: string): void {
  fireEvent.change(byTestId('input'), { target: { value: text } })
  fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
  fireEvent.click(byTestId('detect'))
}

describe('ai-detect · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('配置输入框存在且 Key 为密码框', () => {
    render(<Tool />)
    for (const id of ['base-url', 'model', 'api-key', 'detect']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('api-key') as HTMLInputElement).getAttribute('type')).toBe('password')
  })

  it('检测成功 → 展示结论徽章与置信度', async () => {
    mockFetch(JSON.stringify({ verdict: 'ai', confidence: 82, reasons: ['句式单一'] }))
    render(<Tool />)
    fillAndDetect(LONG_TEXT)
    await waitFor(() => expect(byTestId('result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('verdict').textContent).toContain('疑似 AI 生成')
    expect(byTestId('confidence').textContent).toContain('82%')
    expect(byTestId('result').textContent).toContain('句式单一')
  })

  it('模型返回非 JSON → 中文错误提示', async () => {
    mockFetch('这是一段纯文本回复')
    render(<Tool />)
    fillAndDetect(LONG_TEXT)
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('不是有效的 JSON')
  })

  it('文本太短 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('api-key'), { target: { value: 'sk-x' } })
    fireEvent.change(byTestId('input'), { target: { value: '太短' } })
    fireEvent.click(byTestId('detect'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('文本太短')
  })

  it('未填 Key → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: LONG_TEXT } })
    fireEvent.click(byTestId('detect'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 不能为空')
  })

  it('401 → 中文错误提示', async () => {
    mockFetch('', 401)
    render(<Tool />)
    fillAndDetect(LONG_TEXT)
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('API Key 无效')
  })
})
