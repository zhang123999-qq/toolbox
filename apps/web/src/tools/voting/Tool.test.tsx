// @vitest-environment jsdom
/**
 * voting 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('voting · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后先显示开始投票按钮与本地保存提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('start-vote')).toBeTruthy()
    expect(byTestId('output').textContent).toContain('结果仅保存在本页，刷新后丢失')
  })

  it('开始投票后每个选项都有投票按钮，投票后票数与占比更新', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('start-vote'))
    expect(byTestId('vote-0')).toBeTruthy()
    expect(byTestId('vote-1')).toBeTruthy()
    expect(byTestId('vote-2')).toBeTruthy()
    fireEvent.click(byTestId('vote-0'))
    fireEvent.click(byTestId('vote-0'))
    fireEvent.click(byTestId('vote-1'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('总票数：3')
    expect(output).toContain('66.7%')
    expect(output).toContain('33.3%')
  })

  it('重新计票后票数清零', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('start-vote'))
    fireEvent.click(byTestId('vote-0'))
    fireEvent.click(byTestId('reset-votes'))
    expect(byTestId('output').textContent).toContain('总票数：0')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('单选项进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '唯一选项' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('至少需要 2 个选项')
    expect(alert.textContent).toContain('at least 2 options')
  })
})
