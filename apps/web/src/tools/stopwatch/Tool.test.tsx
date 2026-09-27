// @vitest-environment jsdom
/**
 * stopwatch 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  // 卸载以清理 setInterval，避免秒表在测试间后台累加
  cleanup()
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('stopwatch · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始显示 00:00.00，四个控制按钮都在', () => {
    render(<Tool />)
    expect(byTestId('sw-display').textContent).toBe('00:00.00')
    expect(byTestId('sw-start')).toBeTruthy()
    expect(byTestId('sw-pause')).toBeTruthy()
    expect(byTestId('sw-lap')).toBeTruthy()
    expect(byTestId('sw-reset')).toBeTruthy()
  })

  it('点击开始后状态变为计时中', () => {
    render(<Tool />)
    fireEvent.click(byTestId('sw-start'))
    expect(byTestId('sw-status').textContent).toBe('计时中')
  })

  it('运行中点计次出现计次列表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('sw-start'))
    fireEvent.click(byTestId('sw-lap'))
    expect(byTestId('sw-laps')).toBeTruthy()
    expect(byTestId('sw-laps').textContent).toContain('第 1 次')
  })

  it('暂停 / 复位改变状态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('sw-start'))
    fireEvent.click(byTestId('sw-pause'))
    expect(byTestId('sw-status').textContent).toBe('已暂停')
    fireEvent.click(byTestId('sw-reset'))
    expect(byTestId('sw-status').textContent).toBe('未开始')
    expect(byTestId('sw-display').textContent).toBe('00:00.00')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
