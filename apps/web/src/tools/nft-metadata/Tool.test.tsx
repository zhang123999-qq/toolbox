// @vitest-environment jsdom
/**
 * nft-metadata 组件测试：内联 base64 元数据的 mock 路径与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

const realFetch = globalThis.fetch

function b64json(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function encodeAbiString(s: string): string {
  const bytes = new TextEncoder().encode(s)
  const parts = [
    32n.toString(16).padStart(64, '0'),
    BigInt(bytes.length).toString(16).padStart(64, '0'),
  ]
  const padded = new Uint8Array(Math.ceil(bytes.length / 32) * 32)
  padded.set(bytes)
  parts.push(
    Array.from(padded)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  )
  return `0x${parts.join('')}`
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

describe('nft-metadata · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('合约地址')).toBeTruthy()
  })

  it('内联元数据：mock eth_call 返回 base64 tokenURI', async () => {
    const tokenUri = `data:application/json;base64,${b64json({ name: 'Mock NFT', attributes: [] })}`
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: encodeAbiString(tokenUri) }),
      } as Response),
    ) as unknown as typeof fetch
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await screen.findByText(/名称：Mock NFT/)
  })

  it('非法 tokenId 进入错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('run'))
    await screen.findByText(/tokenId/)
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
