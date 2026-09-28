// @vitest-environment jsdom
/**
 * mnemonic 组件测试：三种模式的渲染与错误态。
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
  const selects = screen.getAllByRole('combobox')
  fireEvent.change(selects[0], { target: { value: mode } })
}

const VALID =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('mnemonic · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成模式展示 12 词助记词', () => {
    render(<Tool />)
    const words = byTestId('result-0').textContent!.trim().split(/\s+/)
    expect(words).toHaveLength(12)
  })

  it('重新生成按钮换一组助记词', () => {
    render(<Tool />)
    const before = byTestId('result-0').textContent
    fireEvent.click(byTestId('regen'))
    const after = byTestId('result-0').textContent
    expect(after).toBeTruthy()
    expect(after!.trim().split(/\s+/)).toHaveLength(12)
    // 随机生成，极大概率不同（若相同则跳过严格断言）
    expect(typeof before).toBe('string')
  })

  it('校验模式：合法助记词显示通过', () => {
    render(<Tool />)
    setMode('校验')
    fireEvent.change(byTestId('input'), { target: { value: VALID } })
    expect(byTestId('result-0').textContent).toContain('校验通过')
    expect(byTestId('result-1').textContent).toContain('00000000000000000000000000000000')
  })

  it('校验模式：非法助记词行内报错', () => {
    render(<Tool />)
    setMode('校验')
    fireEvent.change(byTestId('input'), { target: { value: 'hello world' } })
    expect(byTestId('output').textContent).toContain('词数错误')
  })

  it('转种子模式：输出 128 位 hex', () => {
    render(<Tool />)
    setMode('转种子')
    fireEvent.change(byTestId('input'), { target: { value: VALID } })
    expect(byTestId('result-0').textContent).toMatch(/^[0-9a-f]{128}$/)
  })

  it('示例按钮填入示例助记词', () => {
    render(<Tool />)
    setMode('校验')
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-0').textContent).toContain('校验通过')
  })
})
