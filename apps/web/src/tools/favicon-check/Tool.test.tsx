// @vitest-environment jsdom
/**
 * favicon-check 组件测试：fetch 全部 mock，不发真实网络请求。
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

function mockFetchOk(contentType = 'image/x-icon'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
        },
      } as Response
    }),
  )
}

async function runCheck(): Promise<void> {
  fireEvent.click(byTestId('check'))
  await waitFor(() => expect(screen.queryByTestId('result-table')).toBeTruthy(), {
    timeout: 10000,
  })
}

describe('favicon-check · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例填入站点 URL（HTML 留空）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('https://example.com')
    expect((byTestId('option-html') as HTMLTextAreaElement).value).toBe('')
  })

  it('mock fetch：HEAD 返回 200 image/x-icon → 表格出现 OK', async () => {
    mockFetchOk()
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    await runCheck()
    const table = byTestId('result-table')
    expect(table.textContent).toContain('OK')
    expect(table.textContent).toContain('image/x-icon')
    expect(table.textContent).toContain('https://example.com/favicon.ico')
    expect(table.textContent).toContain('默认地址')
    expect(byTestId('suggestions').textContent).toContain('添加')
  })

  it('声明 HTML（两个 link）+ mock → 候选数为 3（声明 2 + 默认 1）', async () => {
    mockFetchOk()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com/' } })
    fireEvent.change(byTestId('option-html'), {
      target: {
        value:
          '<link rel="icon" href="/a.png" sizes="32x32">' +
          '<link rel="apple-touch-icon" href="/c.png">',
      },
    })
    await runCheck()
    const rows = byTestId('result-table').querySelectorAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(byTestId('result-table').textContent).toContain('rel="apple-touch-icon"')
    expect(byTestId('result-table').textContent).toContain('sizes="32x32"')
    // 有 apple-touch-icon，不再建议补充
    expect(byTestId('suggestions').textContent).not.toContain('缺少 apple-touch-icon')
  })

  it('非法 URL 进错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a url' } })
    fireEvent.click(byTestId('check'))
    await waitFor(() => expect(screen.queryByTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').getAttribute('role')).toBe('alert')
    expect(byTestId('error').textContent).toContain('http')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
