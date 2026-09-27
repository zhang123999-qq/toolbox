// @vitest-environment jsdom
/**
 * timer 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  // 先卸载组件，触发 effect 清理 setInterval，避免定时器在测试间泄漏
  cleanup()
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('timer · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后出现倒计时显示与三个控制按钮', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('timer-display').textContent).toBe('00:10')
    expect(byTestId('timer-start')).toBeTruthy()
    expect(byTestId('timer-pause')).toBeTruthy()
    expect(byTestId('timer-reset')).toBeTruthy()
  })

  it('点击开始后状态变为计时中', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('timer-start'))
    expect(byTestId('timer-status').textContent).toBe('计时中')
  })

  it('暂停 / 复位按钮改变状态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('timer-start'))
    fireEvent.click(byTestId('timer-pause'))
    expect(byTestId('timer-status').textContent).toBe('已暂停')
    fireEvent.click(byTestId('timer-reset'))
    expect(byTestId('timer-status').textContent).toBe('就绪')
    expect(byTestId('timer-display').textContent).toBe('00:10')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('非法时长在输出区给出中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').textContent).toContain('非数字')
  })
})
