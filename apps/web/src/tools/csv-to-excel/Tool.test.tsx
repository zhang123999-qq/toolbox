// @vitest-environment jsdom
/**
 * csv-to-excel 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('csv-to-excel · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 CSV 后输出 SpreadsheetML', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b\n1,2' } })
    expect(byTestId('output').textContent).toContain('<?mso-application progid="Excel.Sheet"?>')
    expect(byTestId('output').textContent).toContain('<Worksheet ss:Name="Sheet1">')
  })

  it('切到 tsv 后输出制表符分隔的文本', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b\n1,2' } })
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'tsv' } })
    expect(byTestId('output').textContent).toBe('a\tb\n1\t2')
  })

  it('取消「首行为表头」后不再有加粗样式', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b\n1,2' } })
    expect(byTestId('output').textContent).toContain('ss:StyleID="sHeader"')
    fireEvent.click(screen.getByLabelText('首行为表头'))
    expect(byTestId('output').textContent).not.toContain('ss:StyleID')
  })

  it('引号不配对时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a,b\n"x,1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」填入 CSV 并产出表格', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('<Data ss:Type="String">name</Data>')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
