// @vitest-environment jsdom
/**
 * contract-abi 组件测试：示例解析渲染与非法输入错误态。
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

function allByTestId(id: string): HTMLElement[] {
  return screen.queryAllByTestId(id)
}

describe('contract-abi · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例解析出 3 个条目', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(allByTestId('value-signature')).toHaveLength(3)
    const hashes = allByTestId('value-hash').map((el) => el.textContent)
    expect(hashes).toContain('0xa9059cbb')
    expect(hashes).toContain('0x70a08231')
  })

  it('非法 JSON 行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    expect(byTestId('output').textContent).toContain('ABI 不是合法 JSON')
  })
})
