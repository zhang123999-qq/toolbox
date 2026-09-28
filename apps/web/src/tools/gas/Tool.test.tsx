// @vitest-environment jsdom
/**
 * gas 组件测试：计算器同步路径与实时查询 mock 路径。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

const realFetch = globalThis.fetch

function mockRpc(result: unknown) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(result) } as Response),
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

describe('gas · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('模式')).toBeTruthy()
    expect(screen.getByLabelText('RPC 地址')).toBeTruthy()
  })

  it('计算器：示例 20 gwei × 21000', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/0\.00042 ETH/)
    expect(byTestId('output').textContent).toContain('420000 gwei')
  })

  it('计算器：非法输入进入错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('run'))
    await screen.findByText(/格式错误/)
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('实时查询：mock eth_gasPrice', async () => {
    mockRpc({ jsonrpc: '2.0', id: 1, result: '0x4a817c800' })
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: '实时查询' } })
    fireEvent.click(byTestId('run'))
    await screen.findByText(/当前 Gas Price：20 gwei/)
  })

  it('实时查询失败显示中文错误', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('down'))) as unknown as typeof fetch
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: '实时查询' } })
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
