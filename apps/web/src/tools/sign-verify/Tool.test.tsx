// @vitest-environment jsdom
/**
 * sign-verify 组件测试：签名 / 验签模式的渲染与错误态。
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

function setMode(mode: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: mode } })
}

const PRIV1 = '0000000000000000000000000000000000000000000000000000000000000001'
// 私钥 1 签名 "hello" 的确定性签名（RFC6979，低 S）
const SIG1 =
  '0xe5ddc160e4c8f92de507c7db9b982d4f9b7197bfa421864aeadc586bc96b09ae0ba0c5b131650ae4994cff1839341d00f3735ef5abc62ac8fe2cf50f65208e2a1b'

describe('sign-verify · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('签名模式：示例私钥签名输出确定性签名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-0').textContent).toBe(SIG1)
    expect(byTestId('result-1').textContent).toBe('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })

  it('签名模式：非法私钥行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0x1234' } })
    expect(byTestId('output').textContent).toContain('私钥')
  })

  it('验签模式：正确签名显示通过', () => {
    render(<Tool />)
    setMode('验签')
    fireEvent.change(byTestId('input'), { target: { value: SIG1 } })
    fireEvent.change(byTestId('input-message'), { target: { value: 'hello' } })
    fireEvent.change(byTestId('input-address'), {
      target: { value: '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf' },
    })
    expect(byTestId('result-0').textContent).toContain('验签通过')
  })

  it('验签模式：地址不匹配显示失败', () => {
    render(<Tool />)
    setMode('验签')
    fireEvent.change(byTestId('input'), { target: { value: SIG1 } })
    fireEvent.change(byTestId('input-message'), { target: { value: 'hello' } })
    fireEvent.change(byTestId('input-address'), {
      target: { value: '0x0000000000000000000000000000000000000001' },
    })
    expect(byTestId('result-0').textContent).toContain('验签失败')
  })

  it('签名模式手动输入私钥与消息', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: PRIV1 } })
    fireEvent.change(byTestId('input-message'), { target: { value: 'hello' } })
    expect(byTestId('result-0').textContent).toBe(SIG1)
  })
})
