// @vitest-environment jsdom
/**
 * speed-test-net 组件测试（#837）：带宽测速（fetch 全 mock）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('speed-test-net · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点运行用 stub fetch 输出带宽报告', async () => {
    vi.stubGlobal(
      'fetch',
      (async () => new Response(new Uint8Array(8000), { status: 200 })) as unknown as typeof fetch,
    )
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('下载速率'))
    expect(byTestId('output').textContent).toContain('Mbps')
  })

  it('仅下载模式不输出上传', async () => {
    vi.stubGlobal(
      'fetch',
      (async () => new Response(new Uint8Array(8000), { status: 200 })) as unknown as typeof fetch,
    )
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com/f' } })
    fireEvent.change(screen.getByLabelText('测速模式'), { target: { value: 'download' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('下载速率'))
    expect(byTestId('output').textContent).not.toContain('上传速率')
  })

  it('示例填入 URL', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('https://example.com')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
