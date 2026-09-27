// @vitest-environment jsdom
/**
 * random-decision 组件测试
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

describe('random-decision · Tool', () => {
  it('渲染后 7 个必需 data-testid + 抽取个数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-count')).toBeTruthy()
  })

  it('点示例后输出决定结果（1 个选项）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('决定结果')
    expect(output).toContain('候选项：4')
    const items = (byTestId('output').textContent ?? '').match(/看电影|吃火锅|去爬山|打游戏/g)
    expect(items).toHaveLength(1)
  })

  it('改抽取个数为 2 后输出 2 个结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-count'), { target: { value: '2' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('抽取个数：2')
    const items = output.match(/看电影|吃火锅|去爬山|打游戏/g)
    expect(items).toHaveLength(2)
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

  it('非法个数进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb\nc' } })
    fireEvent.change(byTestId('input-count'), { target: { value: 'abc' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('抽取个数无效')
    expect(alert.textContent).toContain('Invalid pick count')
  })

  it('不允许重复且个数大于选项数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb' } })
    fireEvent.change(byTestId('input-count'), { target: { value: '5' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('不能大于选项数')
  })

  it('勾选允许重复后个数可大于选项数', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb' } })
    fireEvent.change(byTestId('input-count'), { target: { value: '5' } })
    const checkbox = screen.getByLabelText('允许重复抽中同一项') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('决定结果')
  })
})
