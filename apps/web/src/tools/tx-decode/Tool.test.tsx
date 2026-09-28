// @vitest-environment jsdom
/**
 * tx-decode 组件测试：示例交易解码渲染与非法输入错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('tx-decode · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例解码 Legacy 交易字段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('value-type').textContent).toBe('Legacy')
    expect(byTestId('value-nonce').textContent).toBe('7')
    expect(byTestId('value-gasLimit').textContent).toBe('21000')
    expect(byTestId('value-to').textContent).toContain('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
    expect(byTestId('value-value').textContent).toBe('1000000000000000000')
    expect(byTestId('value-chainId').textContent).toBe('1')
    expect(byTestId('value-hash').textContent).toBe(
      '0x393204fda69e377f7d7c60468a2475068d940146115e77ff445230da311435cf',
    )
  })

  it('EIP-1559 交易解码', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '0x02f873010384773594008506fc23ac00825208947e5f4552091a69125d5dfcb7b8c2659029395bdf8806f05b59d3b2000080c001a0cd9814e086449ff557389ab33394089629d0c9d80102ce47c05c8fd12232c2dfa024dfb08f2a76013b851b97c150822f5ff7c3dfebbbe3bb917f7e339427c86fae',
      },
    })
    expect(byTestId('value-type').textContent).toBe('EIP-1559 (Type 2)')
    expect(byTestId('value-maxFeePerGas').textContent).toBe('30000000000')
    expect(byTestId('value-accessList').textContent).toBe('[]')
    expect(byTestId('value-yParity').textContent).toBe('1')
  })

  it('非法 RLP 行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0xzz' } })
    expect(byTestId('output').textContent).toContain('hex')
  })
})
