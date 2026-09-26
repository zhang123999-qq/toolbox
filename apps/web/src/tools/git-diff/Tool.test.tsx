// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('git-diff · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击示例后输出汇总', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('变更文件：2 个')
    expect(out).toContain('src/a.ts')
  })

  it('点击清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('非法 diff 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a diff at all' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('勾选 verbose 后追加说明', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('显示说明'))
    expect(byTestId('output').textContent).toContain('# 说明')
  })
})
