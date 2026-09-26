// @vitest-environment jsdom
/**
 * csv-to-json 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('csv-to-json · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入带表头的 CSV 后输出对象数组', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'name,tools\n工具库,870' } })
    expect(byTestId('output').textContent).toBe(
      '[\n  {\n    "name": "工具库",\n    "tools": 870\n  }\n]',
    )
  })

  it('取消「首行为表头」后输出二维数组', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'name,tools\na,1' } })
    fireEvent.click(screen.getByLabelText('首行为表头'))
    expect(byTestId('output').textContent).toContain('[\n  [\n    "name",')
  })

  it('切到 0 缩进后输出单行 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\n1' } })
    fireEvent.change(screen.getByLabelText('缩进'), { target: { value: '0' } })
    expect(byTestId('output').textContent).toBe('[{"a":1}]')
  })

  it('引号不配对时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b\n"x,1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」填入 CSV 并产出 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('"name": "工具库"')
    expect(byTestId('output').textContent).toContain('"local": true')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
