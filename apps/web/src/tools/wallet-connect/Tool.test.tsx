// @vitest-environment jsdom
/**
 * wallet-connect 组件测试：连接按钮行为（window.ethereum 全 mock）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  delete (window as unknown as Record<string, unknown>).ethereum
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function installMockEthereum() {
  ;(window as unknown as Record<string, unknown>).ethereum = {
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_requestAccounts') return ['0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf']
      if (method === 'eth_chainId') return '0x1'
      if (method === 'eth_getBalance') return '0xde0b6b3a7640000'
      throw new Error('未知方法')
    }),
  }
}

describe('wallet-connect · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'results',
      'connect',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('未安装钱包时点击提示安装', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('connect'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('未检测到浏览器钱包')
    })
  })

  it('连接成功展示地址与余额', async () => {
    installMockEthereum()
    render(<Tool />)
    fireEvent.click(byTestId('connect'))
    await waitFor(() => {
      expect(byTestId('value-address').textContent).toBe(
        '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
      )
    })
    expect(byTestId('value-chainId').textContent).toBe('1')
    expect(byTestId('value-balance').textContent).toContain('1 ETH')
  })

  it('用户拒绝连接时行内报错', async () => {
    ;(window as unknown as Record<string, unknown>).ethereum = {
      request: vi.fn(async () => {
        throw new Error('User denied')
      }),
    }
    render(<Tool />)
    fireEvent.click(byTestId('connect'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('钱包连接被拒绝或失败')
    })
  })
})
