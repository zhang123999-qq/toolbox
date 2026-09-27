// @vitest-environment jsdom
/**
 * coin 组件测试
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

describe('coin · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后抛 1 次硬币，大硬币显示正面或反面', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('flip')).toBeTruthy()
    const face = byTestId('coin-face').textContent ?? ''
    expect(['正面', '反面']).toContain(face)
    const output = byTestId('output').textContent ?? ''
    expect(output).toMatch(/正面 \d+ 次，反面 \d+ 次/)
  })

  it('抛 10 次后统计正反面且序列展示 10 个', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '10' } })
    const sequence = byTestId('coin-sequence').textContent ?? ''
    const heads = (sequence.match(/正面/g) ?? []).length
    const tails = (sequence.match(/反面/g) ?? []).length
    expect(heads + tails).toBe(10)
    expect(byTestId('output').textContent).toContain(`正面 ${heads} 次，反面 ${tails} 次`)
  })

  it('点「抛硬币」后重新抛掷（动画 key 变化）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const before = byTestId('coin-face').getAttribute('data-round')
    fireEvent.click(byTestId('flip'))
    const after = byTestId('coin-face').getAttribute('data-round')
    expect(after).not.toBe(before)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('抛掷次数非法进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('抛掷次数无效')
    expect(alert.textContent).toContain('Invalid flip count')
  })

  it('抛掷次数超上限进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '10001' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('抛掷次数过大')
  })
})
