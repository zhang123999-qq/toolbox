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

describe('captcha · Tool', () => {
  it('渲染后必需 data-testid + canvas + 刷新按钮存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('captcha-canvas')).toBeTruthy()
    expect(byTestId('refresh')).toBeTruthy()
  })

  it('点刷新按钮仍显示 canvas', () => {
    render(<Tool />)
    fireEvent.click(byTestId('refresh'))
    expect(byTestId('captcha-canvas')).toBeTruthy()
  })

  it('长度填非法值进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-length'), { target: { value: '9' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('长度无效')
  })

  it('空输入不报错，canvas 正常渲染', () => {
    render(<Tool />)
    expect(byTestId('captcha-canvas')).toBeTruthy()
  })
})
