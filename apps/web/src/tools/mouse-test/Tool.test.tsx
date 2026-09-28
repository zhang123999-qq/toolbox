// @vitest-environment jsdom
/**
 * mouse-test 组件测试（#833）：点击记录与清空。
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

describe('mouse-test · Tool', () => {
  it('初始显示提示文案', () => {
    render(<Tool />)
    expect(byTestId('mouse-last').textContent).toContain('点击或滚动鼠标')
    expect(byTestId('mouse-history').textContent).toContain('（暂无）')
  })

  it('左键点击记录单击', () => {
    render(<Tool />)
    fireEvent.mouseDown(byTestId('mouse-zone'), { button: 0, clientX: 10, clientY: 20 })
    expect(byTestId('mouse-last').textContent).toContain('单击：左键 @ (10, 20)')
  })

  it('右键点击记录右键', () => {
    render(<Tool />)
    fireEvent.mouseDown(byTestId('mouse-zone'), { button: 2, clientX: 5, clientY: 5 })
    expect(byTestId('mouse-last').textContent).toContain('单击：右键')
  })

  it('快速连续点击判定为双击', () => {
    render(<Tool />)
    const zone = byTestId('mouse-zone')
    fireEvent.mouseDown(zone, { button: 0, clientX: 1, clientY: 1 })
    fireEvent.mouseDown(zone, { button: 0, clientX: 1, clientY: 1 })
    expect(byTestId('mouse-last').textContent).toContain('双击')
    expect(byTestId('mouse-summary').textContent).toContain('双击 1 次')
  })

  it('滚轮事件显示滚动方向', () => {
    render(<Tool />)
    fireEvent.wheel(byTestId('mouse-zone'), { deltaY: 100 })
    expect(byTestId('mouse-last').textContent).toContain('向下滚动')
    fireEvent.wheel(byTestId('mouse-zone'), { deltaY: -50 })
    expect(byTestId('mouse-last').textContent).toContain('向上滚动')
  })

  it('清空按钮重置记录', () => {
    render(<Tool />)
    fireEvent.mouseDown(byTestId('mouse-zone'), { button: 0, clientX: 1, clientY: 1 })
    fireEvent.click(byTestId('mouse-clear'))
    expect(byTestId('mouse-history').textContent).toContain('（暂无）')
  })
})
