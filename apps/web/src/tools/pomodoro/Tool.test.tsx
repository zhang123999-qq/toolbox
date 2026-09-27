// @vitest-environment jsdom
/**
 * pomodoro 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  // 卸载以清理 setInterval
  cleanup()
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('pomodoro · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始为工作阶段，显示 25:00，轮次为 0', () => {
    render(<Tool />)
    expect(byTestId('pomo-phase').textContent).toContain('工作')
    expect(byTestId('pomo-display').textContent).toBe('25:00')
    expect(byTestId('pomo-rounds').textContent).toContain('0')
  })

  it('三个控制按钮都在', () => {
    render(<Tool />)
    expect(byTestId('pomo-start')).toBeTruthy()
    expect(byTestId('pomo-pause')).toBeTruthy()
    expect(byTestId('pomo-reset')).toBeTruthy()
  })

  it('点击开始后按钮禁用状态切换，暂停 / 复位可用', () => {
    render(<Tool />)
    fireEvent.click(byTestId('pomo-start'))
    expect((byTestId('pomo-start') as HTMLButtonElement).disabled).toBe(true)
    expect((byTestId('pomo-pause') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(byTestId('pomo-pause'))
    expect((byTestId('pomo-pause') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(byTestId('pomo-reset'))
    expect(byTestId('pomo-display').textContent).toBe('25:00')
    expect(byTestId('pomo-rounds').textContent).toContain('0')
  })

  it('修改工作时长后，未运行时显示跟随变化', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('option-workMinutes'), { target: { value: '50' } })
    expect(byTestId('pomo-display').textContent).toBe('50:00')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
