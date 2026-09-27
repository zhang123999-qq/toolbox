// @vitest-environment jsdom
/**
 * date-picker 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('date-picker · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('渲染出日历标题、月份切换按钮与日期格子', () => {
    render(<Tool />)
    expect(byTestId('dp-title').textContent).toContain('年')
    expect(byTestId('dp-prev')).toBeTruthy()
    expect(byTestId('dp-next')).toBeTruthy()
    expect(byTestId('dp-grid')).toBeTruthy()
    // 当月 1 号格子存在
    expect(screen.queryByTestId('dp-day-1')).toBeTruthy()
  })

  it('点选某天后，下方显示 ISO 日期与时间戳', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('dp-day-1'))
    const info = byTestId('dp-info').textContent ?? ''
    expect(info).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(info).toContain('时间戳')
  })

  it('点下一月后标题月份推进', () => {
    render(<Tool />)
    const before = byTestId('dp-title').textContent ?? ''
    fireEvent.click(byTestId('dp-next'))
    const after = byTestId('dp-title').textContent ?? ''
    expect(after).not.toBe(before)
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
