// @vitest-environment jsdom
/**
 * data-filter 组件测试：聚焦条件输入、AND/OR 切换、错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_CONDITIONS, EXAMPLE_CSV } from './utils'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('data-filter · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-conditions', 'run', 'example', 'clear', 'output', 'copy', 'download', 'result-grid', 'match-count']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例填入 CSV 与条件并命中 1 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_CSV)
    expect((byTestId('input-conditions') as HTMLTextAreaElement).value).toBe(EXAMPLE_CONDITIONS)
    expect(byTestId('match-count').textContent).toContain('命中 1 / 5 行')
    expect(byTestId('result-grid').textContent).toContain('李四')
  })

  it('切换 OR 后命中 3 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-logic'), { target: { value: 'OR' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('match-count').textContent).toContain('命中 3 / 5 行')
  })

  it('非法条件关系显示错误', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-logic'), { target: { value: 'XOR' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('条件关系须为 AND 或 OR')
  })

  it('条件引用不存在的列显示错误', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-conditions'), { target: { value: '国家 = 中国' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('列「国家」不存在于表头')
  })

  it('条件格式错误显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: EXAMPLE_CSV } })
    fireEvent.change(byTestId('input-conditions'), { target: { value: '年龄大于30' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('格式错误')
  })
})
