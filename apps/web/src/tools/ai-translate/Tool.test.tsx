// @vitest-environment jsdom
/**
 * ai-translate 组件测试
 * 语言对选择（中文友好名）/ 语言对校验 / fetch 成功与 401 / 空文本，中文提示
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { LANGUAGES } from './utils'

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
  fireEvent.change(screen.getByTestId('input'), { target: { value: 'Hello world' } })
  fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-test' } })
}

describe('ai-translate 组件', () => {
  it('语言下拉框显示中文友好名', () => {
    render(<Tool />)
    const source = screen.getByTestId('source-lang') as HTMLSelectElement
    const target = screen.getByTestId('target-lang') as HTMLSelectElement
    expect(source.options[0]?.textContent).toBe('自动检测')
    expect(target.options[0]?.textContent).toBe('中文（简体）')
    // 目标语言不含「自动检测」
    expect(Array.from(target.options).some((o) => o.textContent === '自动检测')).toBe(false)
    expect(source.options.length).toBe(LANGUAGES.length)
  })

  it('Key 为空时翻译按钮禁用', () => {
    render(<Tool />)
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(true)
  })

  it('翻译成功：请求体携带语言对', async () => {
    fetchMock.mockResolvedValue(okResponse('你好，世界'))
    renderReady()
    fireEvent.change(screen.getByTestId('source-lang'), { target: { value: 'en' } })
    fireEvent.change(screen.getByTestId('target-lang'), { target: { value: 'zh' } })
    fireEvent.click(screen.getByTestId('generate'))

    expect((await screen.findByTestId('result')).textContent).toContain('你好，世界')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string) as {
      messages: { role: string; content: string }[]
    }
    expect(body.messages[0]?.content).toContain('英语')
    expect(body.messages[0]?.content).toContain('中文（简体）')
  })

  it('源语言与目标语言相同时给出中文提示且不发起请求', async () => {
    renderReady()
    fireEvent.change(screen.getByTestId('source-lang'), { target: { value: 'zh' } })
    fireEvent.change(screen.getByTestId('target-lang'), { target: { value: 'zh' } })
    fireEvent.click(screen.getByTestId('generate'))
    expect((await screen.findByTestId('error')).textContent).toContain('源语言与目标语言相同')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('401 时提示 API Key 无效', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)
    renderReady()
    fireEvent.click(screen.getByTestId('generate'))
    expect((await screen.findByTestId('error')).textContent).toContain('API Key 无效或已过期')
  })

  it('文本为空时给出中文提示且不发起请求', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-test' } })
    fireEvent.click(screen.getByTestId('generate'))
    expect((await screen.findByTestId('error')).textContent).toContain('请输入要翻译的文本')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
