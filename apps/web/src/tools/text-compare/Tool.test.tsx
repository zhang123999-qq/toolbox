// @vitest-environment jsdom
/**
 * text-compare 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('text-compare · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出包含预期内容', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('相似度')
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

  it('第二个输入框可填入另一份文本', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-textB'), { target: { value: 'xyz' } })
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('xyz')
  })

  it('切到 diff 模式输出带 +/- 标记', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'diff' } })
    expect(byTestId('output').textContent).toContain('+ 二')
  })
})
