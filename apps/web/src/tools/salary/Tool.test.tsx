// @vitest-environment jsdom
/**
 * salary 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('salary · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出税后到手 11172.50 元', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('税后到手：11172.50 元')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切换公积金比例后输出随之变化', () => {
    render(<Tool />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: '5' } })
    fireEvent.change(byTestId('input'), { target: { value: '15000' } })
    // 15000 − 1575 − 750 − 5000 = 7675 → 10% 档：7675×0.1−210 = 557.5
    expect(byTestId('output').textContent).toContain('公积金个人缴纳（5%）：750.00 元')
    expect(byTestId('output').textContent).toContain('个人所得税：557.50 元')
  })

  it('非法输入进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('税前月薪请输入有效的数字')
  })

  it('负数月薪进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '-100' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('税前月薪必须大于 0')
  })
})
