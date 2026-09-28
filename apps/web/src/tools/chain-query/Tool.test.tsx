// @vitest-environment jsdom
/**
 * chain-query 组件测试：余额查询 mock 路径与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

const realFetch = globalThis.fetch

function mockRpc(result: unknown) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
    } as Response),
  ) as unknown as typeof fetch
}

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

const ADDR = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'

describe('chain-query · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('查询类型')).toBeTruthy()
  })

  it('余额查询：mock 返回 1 ETH', async () => {
    mockRpc('0xde0b6b3a7640000')
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/余额：1 ETH/)
  })

  it('非法地址进入错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0x123' } })
    fireEvent.click(byTestId('run'))
    await screen.findByText(/地址格式错误/)
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('RPC 失败显示中文错误', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('down'))) as unknown as typeof fetch
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: ADDR } })
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
