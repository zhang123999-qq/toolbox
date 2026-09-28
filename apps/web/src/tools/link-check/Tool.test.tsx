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

const HTML = '<a href="/a">A</a><a href="https://other.com/b">B</a><a href="mailto:x@y.com">M</a>'

function fillPasteMode(): void {
  // 默认模式即 粘贴HTML
  fireEvent.change(byTestId('input'), { target: { value: HTML } })
  const extra = screen.getByTestId('input-baseUrl')
  fireEvent.change(extra, { target: { value: 'https://example.com/' } })
}

describe('link-check · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'extract', 'check']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('粘贴HTML 模式提取链接并计数', async () => {
    render(<Tool />)
    fillPasteMode()
    fireEvent.click(byTestId('extract'))
    expect(await screen.findByTestId('link-count')).toBeTruthy()
    expect(byTestId('link-count').textContent).toContain('3 个链接')
    expect((byTestId('check') as HTMLButtonElement).disabled).toBe(false)
  })

  it('提取后开始检测（mock fetch）并显示结果', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 200 })))
    render(<Tool />)
    fillPasteMode()
    fireEvent.click(byTestId('extract'))
    await screen.findByTestId('link-count')
    fireEvent.click(byTestId('check'))
    const list = await screen.findByTestId('result-list')
    expect(list.textContent).toContain('正常')
    expect(list.textContent).toContain('跳过')
    expect(byTestId('summary').textContent).toContain('共 3 个')
  })

  it('粘贴HTML 模式缺基准 URL 报错', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: HTML } })
    fireEvent.click(byTestId('extract'))
    expect(await screen.findByTestId('error')).toBeTruthy()
    expect(byTestId('error').textContent).toContain('基准 URL')
  })

  it('抓取页面模式非法 URL 报错', async () => {
    render(<Tool />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '抓取页面' } })
    fireEvent.change(byTestId('input'), { target: { value: 'not a url' } })
    fireEvent.click(byTestId('extract'))
    expect(await screen.findByTestId('error')).toBeTruthy()
  })

  it('空输入点提取报错', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('extract'))
    expect(await screen.findByTestId('error')).toBeTruthy()
  })
})
