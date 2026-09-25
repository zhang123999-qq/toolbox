// @vitest-environment jsdom
/**
 * hotp-generate 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('hotp-generate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('计数器有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-counter')).toBeTruthy()
  })

  it('示例 → 输出 RFC 4226 的 755224（同步工具无需点运行）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('755224')
  })

  it('改计数器为 1 → 输出 287082', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-counter'), { target: { value: '1' } })
    expect(output()).toContain('287082')
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

  it('计数器非整数时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'GEZDGNBVGY3TQOJQ' } })
    fireEvent.change(byTestId('input-counter'), { target: { value: '-1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
