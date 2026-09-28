// @vitest-environment jsdom
/**
 * public-key 组件测试：私钥 → 压缩/非压缩公钥 + 地址的渲染与错误态。
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

describe('public-key · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例推导私钥 1 的公钥与地址', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-0').textContent).toContain(
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    )
    expect(byTestId('result-1').textContent).toContain('0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
    expect(byTestId('result-2').textContent).toContain('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })

  it('手动输入私钥推导', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '0x0000000000000000000000000000000000000000000000000000000000000002' },
    })
    expect(byTestId('result-2').textContent).toContain('0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF')
  })

  it('非法私钥行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0x1234' } })
    expect(byTestId('output').textContent).toContain('私钥')
  })
})
