// @vitest-environment jsdom
/**
 * private-key 组件测试：生成数量、0x 前缀开关与非法数量报错。
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

function outputLines(): string[] {
  return byTestId('output')
    .textContent!.split('\n')
    .filter((l) => l.length > 0)
}

describe('private-key · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    // TwoColumn 的 text / boolean 选项通过 label 文本定位
    expect(screen.getByLabelText(/生成数量/)).toBeTruthy()
    expect(screen.getByLabelText(/带 0x 前缀/)).toBeTruthy()
  })

  it('默认生成 5 个带 0x 前缀的私钥', () => {
    render(<Tool />)
    const lines = outputLines()
    expect(lines).toHaveLength(5)
    for (const l of lines) expect(l).toMatch(/^0x[0-9a-f]{64}$/)
    // 每次生成应不同（随机性）
    expect(new Set(lines).size).toBe(5)
  })

  it('修改数量即时重算', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText(/生成数量/), { target: { value: '2' } })
    const lines = outputLines()
    expect(lines).toHaveLength(2)
    for (const l of lines) expect(l).toMatch(/^0x[0-9a-f]{64}$/)
  })

  it('关闭前缀开关去掉 0x', () => {
    render(<Tool />)
    fireEvent.click(screen.getByLabelText(/带 0x 前缀/))
    for (const l of outputLines()) expect(l).toMatch(/^[0-9a-f]{64}$/)
  })

  it('非法数量行内报错', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText(/生成数量/), { target: { value: '0' } })
    expect(byTestId('output').textContent).toContain('1–100')
  })
})
