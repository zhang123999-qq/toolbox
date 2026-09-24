// @vitest-environment jsdom
/**
 * text-wrap 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { displayWidth } from '../../lib/text'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('text-wrap · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出包含预期内容', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('这是一段需要按宽度自动换行的中文文本，')
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

  it('示例折行后每行都不超宽', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const lines = (byTestId('output').textContent ?? '').split('\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(displayWidth(line)).toBeLessThanOrEqual(40)
  })
  it('改宽度会改变折行结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '一二三四五六' } })
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '40' } })
    expect(byTestId('output').textContent).toBe('一二三四五六')
  })
})
