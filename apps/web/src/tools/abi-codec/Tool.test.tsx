// @vitest-environment jsdom
/**
 * abi-codec 组件测试：编码/解码模式切换与示例往返。
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

describe('abi-codec · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-params',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'results',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
    // MultiPanel 的 select 选项通过 label 文本定位
    expect(screen.getByLabelText('模式')).toBeTruthy()
  })

  it('点示例编码 transfer calldata', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-1').textContent).toContain('0xa9059cbb')
    expect(byTestId('result-3').textContent).toContain('0xa9059cbb')
  })

  it('编码后切换解码模式能往返', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const calldata = byTestId('result-3').textContent!.replace('calldata：', '')
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'decode' } })
    fireEvent.change(byTestId('input-params'), { target: { value: calldata } })
    expect(byTestId('result-0').textContent).toContain('transfer')
    expect(byTestId('result-2').textContent).toContain('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
    expect(byTestId('result-3').textContent).toContain('1000')
  })

  it('非法签名行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a signature' } })
    expect(byTestId('output').textContent).toContain('签名')
  })
})
