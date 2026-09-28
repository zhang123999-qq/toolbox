// @vitest-environment jsdom
/**
 * random-name 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('random-name · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-count')).toBeTruthy()
  })

  it('点示例输出 1 个非空名字', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0].length).toBeGreaterThanOrEqual(2)
  })

  it('数量填 3 输出 3 行', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-count'), { target: { value: '3' } })
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect(lines).toHaveLength(3)
  })

  it('数量填 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-count'), { target: { value: '0' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('数量必须为 1 到 50')
  })
})
