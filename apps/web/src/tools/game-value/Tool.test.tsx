// @vitest-environment jsdom
/**
 * game-value 组件测试（#802）：游戏数值。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('game-value · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('gv-calc')).toBeTruthy()
    expect(byTestId('gv-table')).toBeTruthy()
  })

  it('线性模式计算单级', () => {
    render(<Tool />)
    fireEvent.change(byTestId('gv-level'), { target: { value: '5' } })
    fireEvent.click(byTestId('gv-calc'))
    expect(byTestId('gv-output').textContent).toContain('Lv.5 属性值 = 140')
  })

  it('生成等级表', () => {
    render(<Tool />)
    fireEvent.change(byTestId('gv-maxlevel'), { target: { value: '3' } })
    fireEvent.click(byTestId('gv-table'))
    const out = byTestId('gv-output').textContent ?? ''
    expect(out).toContain('Lv.1')
    expect(out).toContain('Lv.3')
  })

  it('切换指数模式计算', () => {
    render(<Tool />)
    fireEvent.click(byTestId('gv-mode-exponential'))
    fireEvent.change(byTestId('input'), { target: { value: '{"base":100,"perLevel":2}' } })
    fireEvent.change(byTestId('gv-level'), { target: { value: '3' } })
    fireEvent.click(byTestId('gv-calc'))
    expect(byTestId('gv-output').textContent).toContain('Lv.3 属性值 = 400')
  })

  it('非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('gv-calc'))
    expect(byTestId('gv-error').textContent).toContain('合法 JSON')
  })

  it('非法等级显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('gv-level'), { target: { value: '0' } })
    fireEvent.click(byTestId('gv-calc'))
    expect(byTestId('gv-error').textContent).toContain('正整数')
  })
})
