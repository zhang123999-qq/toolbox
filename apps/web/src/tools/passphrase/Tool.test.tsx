// @vitest-environment jsdom
/**
 * passphrase 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('passphrase · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后生成 4 段单词短语', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const parts = (byTestId('output').textContent ?? '').split('-')
    expect(parts).toHaveLength(4)
    for (const part of parts) expect(part).toMatch(/^[a-z]{3,8}$/)
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

  it('词数改成 6 后输出 6 段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('词数'), { target: { value: '6' } })
    expect((byTestId('output').textContent ?? '').split('-')).toHaveLength(6)
  })

  it('点「运行」可以再摇一条', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const first = byTestId('output').textContent
    fireEvent.click(byTestId('run'))
    expect((byTestId('output').textContent ?? '').split('-')).toHaveLength(4)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(first).not.toBe('')
  })

  it('词数选项值非法时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('词数'), { target: { value: '99' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
