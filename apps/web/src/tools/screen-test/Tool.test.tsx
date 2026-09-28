// @vitest-environment jsdom
/**
 * screen-test 组件测试（#834）：模式切换。
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

describe('screen-test · Tool', () => {
  it('初始为红色模式', () => {
    render(<Tool />)
    expect(byTestId('screen-stage').getAttribute('data-pattern')).toBe('red')
    expect(byTestId('screen-label').textContent).toContain('红色')
  })

  it('点击舞台切换到下一张', () => {
    render(<Tool />)
    fireEvent.click(byTestId('screen-stage'))
    expect(byTestId('screen-stage').getAttribute('data-pattern')).toBe('green')
  })

  it('下一张按钮循环切换', () => {
    render(<Tool />)
    fireEvent.click(byTestId('screen-pattern-black'))
    expect(byTestId('screen-stage').getAttribute('data-pattern')).toBe('black')
    fireEvent.click(byTestId('screen-next'))
    expect(byTestId('screen-stage').getAttribute('data-pattern')).toBe('gray')
  })

  it('模式按钮直接跳转', () => {
    render(<Tool />)
    fireEvent.click(byTestId('screen-pattern-gradient'))
    expect(byTestId('screen-label').textContent).toContain('渐变')
  })

  it('8 个模式按钮全部存在', () => {
    render(<Tool />)
    for (const id of ['red', 'green', 'blue', 'white', 'black', 'gray', 'grid', 'gradient']) {
      expect(screen.queryByTestId(`screen-pattern-${id}`)).toBeTruthy()
    }
  })
})
