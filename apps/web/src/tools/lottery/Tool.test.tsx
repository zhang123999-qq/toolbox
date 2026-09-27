// @vitest-environment jsdom
/**
 * lottery 组件测试
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

describe('lottery · Tool', () => {
  it('渲染后 7 个必需 data-testid + 抽取人数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-count')).toBeTruthy()
  })

  it('点示例后输出中奖名单（2 人）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('中奖名单')
    expect(output).toContain('候选人数：5')
    const names = output.match(/张三|李四|王五|赵六|钱七/g)
    expect(names).toHaveLength(2)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-count') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('负数人数进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '张三\n李四' } })
    fireEvent.change(byTestId('input-count'), { target: { value: '-1' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('不能为负数')
    expect(alert.textContent).toContain('cannot be negative')
  })

  it('不放回且人数大于名单人数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '张三\n李四' } })
    fireEvent.change(byTestId('input-count'), { target: { value: '5' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('不能大于名单人数')
  })

  it('勾选有放回后人数可大于名单人数', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '张三\n李四' } })
    fireEvent.change(byTestId('input-count'), { target: { value: '5' } })
    const checkbox = screen.getByLabelText('有放回（允许重复中奖）') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('中奖名单')
  })
})
