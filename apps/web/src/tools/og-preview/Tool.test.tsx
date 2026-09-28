// @vitest-environment jsdom
/**
 * og-preview 组件测试（#653）：fetch 全部 mock，不打真实网络。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function setInput(value: string): void {
  fireEvent.change(byTestId('input'), { target: { value } })
}

const EXAMPLE_TITLE = '示例 OG 标题：如何做好 SEO'

const FETCH_HTML = `<!DOCTYPE html>
<html><head>
<title>抓取页标题</title>
<meta property="og:title" content="抓取到的 OG 标题">
<meta property="og:description" content="抓取到的 OG 描述">
<meta property="og:image" content="/img.png">
<meta property="og:url" content="https://example.com/post">
<meta name="twitter:card" content="summary_large_image">
</head><body></body></html>`

/** 把全局 fetch 换成返回指定 HTML 的 mock */
function mockFetchHtml(html: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/html' : null),
      },
      text: async () => html,
    })),
  )
}

describe('og-preview · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行渲染出 3 张分享卡片', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('card-x')).toBeTruthy()
      expect(byTestId('card-fb')).toBeTruthy()
      expect(byTestId('card-li')).toBeTruthy()
    })
    expect(byTestId('card-x').textContent).toContain('示例 Twitter 标题')
    expect(byTestId('card-fb').textContent).toContain(EXAMPLE_TITLE)
    expect(byTestId('card-li').textContent).toContain(EXAMPLE_TITLE)
    expect(byTestId('output').textContent).toContain('og:title')
  })

  it('缺标签的 HTML 给出补充建议', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('mode-paste'))
    setInput('<html><head><title>只有标题</title></head><body></body></html>')
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('suggestions')).toBeTruthy()
    })
    expect(byTestId('suggestions').textContent).toContain('缺少 og:image')
  })

  it('fetch 模式下非法 URL 进入错误态', async () => {
    render(<Tool />)
    setInput('not a url')
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').getAttribute('role')).toBe('alert')
    })
    expect(byTestId('output').textContent).toContain('http')
  })

  it('fetch 模式 mock 抓取成功后渲染卡片', async () => {
    mockFetchHtml(FETCH_HTML)
    render(<Tool />)
    setInput('https://example.com/post')
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('card-x').textContent).toContain('抓取到的 OG 标题')
    })
    expect(byTestId('output').textContent).toContain('og:title：抓取到的 OG 标题')
  })

  it('清空按钮重置输入与结果', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('card-x')).toBeTruthy()
    })
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByTestId('card-x')).toBeNull()
  })
})
