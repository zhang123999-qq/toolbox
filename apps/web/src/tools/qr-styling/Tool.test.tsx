// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('qr-styling · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入显示引导提示，不报错', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('输入文本')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('点示例后渲染 canvas', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('qr-canvas')).toBeTruthy()
  })

  it('非法颜色进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-color'), { target: { value: 'red' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('颜色无效')
  })
})
