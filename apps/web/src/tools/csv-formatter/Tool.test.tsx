// @vitest-environment jsdom
/**
 * csv-formatter 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('csv-formatter · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 CSV 后输出对齐列宽的结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'name,tools\na,1' } })
    expect(byTestId('output').textContent).toBe('name,tools\na   ,1    ')
  })

  it('切到 validate 后输出列数校验报告', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b,c\n1,2' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'validate' } })
    expect(byTestId('output').textContent).toContain('第 2 行：2 列')
  })

  it('勾选严格模式后列数不一致进入 role=alert 的错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b,c\n1,2' } })
    fireEvent.click(screen.getByLabelText('严格模式'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」填入 CSV 并产出结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('name   ,tools')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
