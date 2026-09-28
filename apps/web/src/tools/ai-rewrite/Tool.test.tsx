// @vitest-environment jsdom
/**
 * ai-rewrite 组件测试
 * BYOK：风格选择 / fetch 成功携带风格 prompt / 401 / 网络失败 / 空文本，中文提示
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { REWRITE_STYLES, storageKey } from './utils'

afterEach(cleanup)

const fetchMock = vi.fn()

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function okResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response
}

function renderReady(): void {
  render(<Tool />)
  fireEvent.change(screen.getByTestId('input'), { target: { value: '这是一段需要改写的文本。' } })
  fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-test' } })
}

describe('ai-rewrite 组件', () => {
  it('渲染四种改写风格选项', () => {
    render(<Tool />)
    const select = screen.getByTestId('style-select') as HTMLSelectElement
    expect(select.options.length).toBe(REWRITE_STYLES.length)
    expect(select.options[0]?.textContent).toContain('正式')
  })

  it('Key 为空时生成按钮禁用', () => {
    render(<Tool />)
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('key-hint')).toBeTruthy()
  })

  it('改写成功：请求体携带所选风格的 system prompt', async () => {
    fetchMock.mockResolvedValue(okResponse('改写后的文本。'))
    renderReady()
    fireEvent.change(screen.getByTestId('style-select'), { target: { value: 'formal' } })
    fireEvent.click(screen.getByTestId('generate'))

    expect((await screen.findByTestId('result')).textContent).toContain('改写后的文本。')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[]
    }
    expect(body.messages[0]?.content).toContain('正式')
  })

  it('401 时提示 API Key 无效', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)
    renderReady()
    fireEvent.click(screen.getByTestId('generate'))
    expect((await screen.findByTestId('error')).textContent).toContain('API Key 无效或已过期')
  })

  it('网络失败时给出中文提示', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    renderReady()
    fireEvent.click(screen.getByTestId('generate'))
    expect((await screen.findByTestId('error')).textContent).toContain('网络连接失败')
  })

  it('文本为空时给出中文提示且不发起请求', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-test' } })
    fireEvent.click(screen.getByTestId('generate'))
    expect((await screen.findByTestId('error')).textContent).toContain('请输入要改写的文本')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('Key 持久化与一键清除', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-x' } })
    expect(localStorage.getItem(storageKey('apiKey'))).toBe('sk-x')
    fireEvent.click(screen.getByTestId('clear-key'))
    expect(localStorage.getItem(storageKey('apiKey'))).toBeNull()
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(true)
  })
})
