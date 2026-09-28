// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

const MOCK_HTML = `<!doctype html><html lang="zh-CN"><head>
<title>测试页面标题示例</title>
<meta name="description" content="描述">
<meta name="viewport" content="width=device-width">
</head><body><h1>标题</h1></body></html>`

function stubFetchOk() {
  const mockFn = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => MOCK_HTML,
  }))
  vi.stubGlobal('fetch', mockFn)
  return mockFn
}

describe('seo-audit · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例按钮填入示例 HTML 并切到粘贴模式', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toContain('<title>')
    expect((screen.getByLabelText('粘贴 HTML') as HTMLInputElement).checked).toBe(true)
  })

  it('粘贴模式点运行输出总分与检查项', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/总分：\d+\/100/)
    expect(byTestId('output').textContent).toContain('title 标签')
  })

  it('抓取模式 mock fetch 后点运行输出总分', async () => {
    const mockFn = stubFetchOk()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com' } })
    fireEvent.click(byTestId('run'))
    await screen.findByText(/总分：\d+\/100/)
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(byTestId('output').textContent).toContain('h1 标题')
  })

  it('抓取模式非法 URL 进入错误态', async () => {
    stubFetchOk()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'notaurl' } })
    fireEvent.click(byTestId('run'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('http')
  })

  it('点清空回到空输入并清空结果', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/总分：\d+\/100/)
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).not.toContain('总分')
  })

  it('空输入点运行进入错误态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('URL')
  })

  it('模式切换改变输入框提示', () => {
    render(<Tool />)
    expect((byTestId('input') as HTMLTextAreaElement).placeholder).toContain('https://')
    fireEvent.click(screen.getByLabelText('粘贴 HTML'))
    expect((byTestId('input') as HTMLTextAreaElement).placeholder).toContain('HTML')
  })
})
