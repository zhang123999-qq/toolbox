// @vitest-environment jsdom
/**
 * ai-summarize 组件测试
 * BYOK：Key password 输入 / localStorage 持久化与清除 / Key 为空禁用按钮 /
 * fetch 成功与 401 / 网络失败 / 空文本 / 超时，均为中文提示
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { DEFAULT_BASE_URL, storageKey } from './utils'

afterEach(cleanup)

const fetchMock = vi.fn()

function okResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as Response
}

beforeEach(() => {
  localStorage.clear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function renderWithKey(key = 'sk-test-key'): void {
  render(<Tool />)
  fireEvent.change(screen.getByTestId('input'), { target: { value: '很长的一段文本内容。' } })
  fireEvent.change(screen.getByTestId('api-key'), { target: { value: key } })
}

describe('ai-summarize 组件', () => {
  it('渲染 BYOK 配置区：Key 为 password 输入框', () => {
    render(<Tool />)
    expect(screen.getByTestId('api-key').getAttribute('type')).toBe('password')
    expect(screen.getByTestId('base-url')).toBeTruthy()
    expect(screen.getByTestId('model-name')).toBeTruthy()
    expect(screen.getByTestId('length-select')).toBeTruthy()
  })

  it('Key 为空时生成按钮禁用并提示填写 Key', () => {
    render(<Tool />)
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('key-hint').textContent).toContain('请先在上方填写 API Key')
  })

  it('填写 Key 后按钮可用，Key 持久化到 localStorage', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-abc' } })
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByTestId('key-hint')).toBeNull()
    expect(localStorage.getItem(storageKey('apiKey'))).toBe('sk-abc')
  })

  it('刷新后从 localStorage 恢复 Key', () => {
    localStorage.setItem(storageKey('apiKey'), 'sk-saved')
    render(<Tool />)
    expect((screen.getByTestId('api-key') as HTMLInputElement).value).toBe('sk-saved')
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(false)
  })

  it('清除 Key 按钮清空输入并删除 localStorage', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-abc' } })
    fireEvent.click(screen.getByTestId('clear-key'))
    expect((screen.getByTestId('api-key') as HTMLInputElement).value).toBe('')
    expect(localStorage.getItem(storageKey('apiKey'))).toBeNull()
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(true)
  })

  it('生成成功：按默认地址与模型 POST，结果展示', async () => {
    fetchMock.mockResolvedValue(okResponse('这是摘要。'))
    renderWithKey()
    fireEvent.click(screen.getByTestId('generate'))

    const result = await screen.findByTestId('result')
    expect(result.textContent).toContain('这是摘要。')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${DEFAULT_BASE_URL}/chat/completions`)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test-key')
    const body = JSON.parse(init.body as string) as { model: string }
    expect(body.model).toBe('gpt-4o-mini')
  })

  it('自定义 baseURL / 模型生效', async () => {
    fetchMock.mockResolvedValue(okResponse('ok'))
    renderWithKey()
    fireEvent.change(screen.getByTestId('base-url'), { target: { value: 'https://x.example/v1/' } })
    fireEvent.change(screen.getByTestId('model-name'), { target: { value: 'my-model' } })
    fireEvent.click(screen.getByTestId('generate'))
    await screen.findByTestId('result')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://x.example/v1/chat/completions')
    expect((JSON.parse(init.body as string) as { model: string }).model).toBe('my-model')
  })

  it('401 时提示 API Key 无效', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)
    renderWithKey()
    fireEvent.click(screen.getByTestId('generate'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('API Key 无效或已过期')
  })

  it('429 时提示限流稍后重试', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response)
    renderWithKey()
    fireEvent.click(screen.getByTestId('generate'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('请求过于频繁')
  })

  it('网络失败时给出中文提示', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    renderWithKey()
    fireEvent.click(screen.getByTestId('generate'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('网络连接失败')
  })

  it('文本为空时给出中文提示且不发起请求', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('api-key'), { target: { value: 'sk-abc' } })
    fireEvent.click(screen.getByTestId('generate'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('请输入要摘要的文本')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('空响应内容时给出中文提示', async () => {
    fetchMock.mockResolvedValue(okResponse('   '))
    renderWithKey()
    fireEvent.click(screen.getByTestId('generate'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('模型返回了空内容')
  })
})
