// @vitest-environment jsdom
/**
 * random-number 组件测试
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

describe('random-number · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    // 附加参数输入框
    for (const id of ['input-min', 'input-max', 'input-decimals']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 5 个 1–100 的整数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const chips = byTestId('output').querySelectorAll('span')
    expect(chips).toHaveLength(5)
    for (const chip of chips) {
      const n = Number(chip.textContent)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(100)
    }
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-min') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('非法输入进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-min'), { target: { value: '10' } })
    fireEvent.change(byTestId('input-max'), { target: { value: '1' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('不能大于最大值')
  })

  it('改数量实时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '3' } })
    expect(byTestId('output').querySelectorAll('span')).toHaveLength(3)
  })
})
