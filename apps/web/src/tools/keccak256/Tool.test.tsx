// @vitest-environment jsdom
/**
 * keccak256 组件测试：输入类型/输出格式选项与已知向量。
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

describe('keccak256 · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    // TwoColumn 的 select 选项通过 label 文本定位
    expect(screen.getByLabelText('输入类型')).toBeTruthy()
    expect(screen.getByLabelText('输出格式')).toBeTruthy()
  })

  it('点示例计算 hello 的哈希', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain(
      '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
    )
  })

  it('hex 输入模式', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0x616263' } })
    fireEvent.change(screen.getByLabelText('输入类型'), { target: { value: 'hex' } })
    expect(byTestId('output').textContent).toContain(
      '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
    )
  })

  it('base64 输出模式', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('输出格式'), { target: { value: 'base64' } })
    expect(byTestId('output').textContent).toMatch(/^[A-Za-z0-9+/]{43}=$/)
  })

  it('非法 hex 输入行内报错', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('输入类型'), { target: { value: 'hex' } })
    fireEvent.change(byTestId('input'), { target: { value: 'zz' } })
    expect(byTestId('output').textContent).toContain('hex')
  })
})
