// @vitest-environment jsdom
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

describe('speed-test · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点运行用 stub fetch 输出测速报告（跨域近似）', async () => {
    const opaque = {
      type: 'opaque',
      status: 0,
      headers: new Headers(),
      body: null,
    } as unknown as Response
    vi.stubGlobal('fetch', (async () => opaque) as unknown as typeof fetch)
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toContain('目标：https://example.com/'),
    )
    expect(byTestId('output').textContent).toContain('评级：')
    expect(byTestId('output').textContent).toContain('近似')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('示例填入 URL', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('https://example.com')
  })

  it('空输入点运行不进入错误态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).not.toBe(''))
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
