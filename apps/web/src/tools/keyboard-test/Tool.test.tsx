// @vitest-environment jsdom
/**
 * keyboard-test 组件测试（#832）：按键监听与清空。
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

function pressKey(key: string, code: string, keyCode: number): void {
  fireEvent.keyDown(window, { key, code, keyCode })
}

function releaseKey(key: string, code: string, keyCode: number): void {
  fireEvent.keyUp(window, { key, code, keyCode })
}

describe('keyboard-test · Tool', () => {
  it('初始显示提示文案', () => {
    render(<Tool />)
    expect(byTestId('keyboard-last').textContent).toContain('按下任意键')
    expect(byTestId('keyboard-pressed').textContent).toContain('（无）')
  })

  it('按下按键显示键名与分区', () => {
    render(<Tool />)
    pressKey('a', 'KeyA', 65)
    const label = byTestId('keyboard-last').textContent ?? ''
    expect(label).toContain('键名「a」')
    expect(label).toContain('主键盘区')
  })

  it('按下后集合记录 code，松开后移除', () => {
    render(<Tool />)
    pressKey('Shift', 'ShiftLeft', 16)
    expect(byTestId('keyboard-pressed').textContent).toContain('ShiftLeft')
    releaseKey('Shift', 'ShiftLeft', 16)
    expect(byTestId('keyboard-pressed').textContent).toContain('（无）')
  })

  it('重复按下同一键不重复计数', () => {
    render(<Tool />)
    pressKey('a', 'KeyA', 65)
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA', keyCode: 65, repeat: true })
    expect(byTestId('keyboard-pressed').textContent).toBe('KeyA')
  })

  it('清空按钮重置状态', () => {
    render(<Tool />)
    pressKey('a', 'KeyA', 65)
    fireEvent.click(byTestId('keyboard-clear'))
    expect(byTestId('keyboard-pressed').textContent).toContain('（无）')
    expect(byTestId('keyboard-last').textContent).toContain('已清空')
  })
})
