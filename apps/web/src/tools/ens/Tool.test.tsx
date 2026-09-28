// @vitest-environment jsdom
/**
 * ens 组件测试：运行按钮触发 mock RPC 解析；错误态行内展示。
 * 全局 fetch 被 mock，不真实联网。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const resolverWord = `0x${'00'.repeat(12)}${'11'.repeat(20)}`
const addrWord = `0x${'00'.repeat(12)}${'22'.repeat(20)}`

function mockRpc() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body ?? '')
      const result = body.includes('0178b8bf') ? resolverWord : addrWord
      return { ok: true, status: 200, json: async () => ({ result }) }
    }),
  )
}

describe('ens · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'run', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点运行后展示解析结果（mock RPC）', async () => {
    mockRpc()
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    const out = await screen.findByText(/地址：0x2222/, {}, { timeout: 5000 })
    expect(out).toBeTruthy()
    expect(byTestId('output').textContent).toContain('namehash：0xee6c4522')
    expect(byTestId('output').textContent).toContain(`resolver：0x${'11'.repeat(20)}`)
  })

  it('RPC 失败行内报错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })),
    )
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'vitalik.eth' } })
    fireEvent.click(byTestId('run'))
    const out = await screen.findByRole('alert', {}, { timeout: 5000 })
    expect(out.textContent).toContain('HTTP 429')
  })

  it('空名称点运行行内报错', async () => {
    mockRpc()
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    const out = await screen.findByRole('alert', {}, { timeout: 5000 })
    expect(out.textContent).toContain('名称不能为空')
  })
})
