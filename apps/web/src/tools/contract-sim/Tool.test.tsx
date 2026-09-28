// @vitest-environment jsdom
/**
 * contract-sim 组件测试：balanceOf mock 路径与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

const realFetch = globalThis.fetch

afterEach(() => {
  cleanup()
  globalThis.fetch = realFetch
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('contract-sim · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('合约地址')).toBeTruthy()
    expect(screen.getByLabelText('ABI JSON')).toBeTruthy()
    expect(screen.getByLabelText('方法名')).toBeTruthy()
  })

  it('balanceOf：mock 返回 100', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: `0x${'0'.repeat(62)}64` }),
      } as Response),
    ) as unknown as typeof fetch
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/#0 = 100/)
    await screen.findByText(/方法：balanceOf\(address\)/)
  })

  it('参数非法 JSON 进入错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    fireEvent.click(byTestId('run'))
    await screen.findByText(/合法 JSON/)
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('RPC 失败显示中文错误', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('down'))) as unknown as typeof fetch
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/网络请求失败/)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
