// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('数独组件', () => {
  it('渲染 81 格、难度选择与操作按钮', () => {
    render(<Tool />)
    expect(byTestId('sudoku-board').children).toHaveLength(81)
    expect(byTestId('sudoku-difficulty')).toBeTruthy()
    expect(byTestId('sudoku-new')).toBeTruthy()
    expect(byTestId('sudoku-check')).toBeTruthy()
    expect(byTestId('sudoku-reveal')).toBeTruthy()
  })

  it('题目未填完时检查提示还有空格', () => {
    render(<Tool />)
    fireEvent.click(byTestId('sudoku-check'))
    expect(byTestId('sudoku-status').textContent).toContain('还有空格未填')
  })

  it('公布答案后检查全部正确', () => {
    render(<Tool />)
    fireEvent.click(byTestId('sudoku-reveal'))
    expect(byTestId('sudoku-status').textContent).toContain('已公布答案')
    fireEvent.click(byTestId('sudoku-check'))
    expect(byTestId('sudoku-status').textContent).toContain('全部正确')
  })

  it('相同种子生成相同题目', () => {
    render(<Tool />)
    const seed = byTestId('sudoku-seed') as HTMLInputElement
    fireEvent.change(seed, { target: { value: '42' } })
    fireEvent.click(byTestId('sudoku-new'))
    const first = (byTestId('sudoku-cell-0') as HTMLInputElement).value
    fireEvent.click(byTestId('sudoku-new'))
    expect((byTestId('sudoku-cell-0') as HTMLInputElement).value).toBe(first)
  })
})
