// @vitest-environment jsdom
/**
 * data-table 组件测试：聚焦表头排序、搜索、分页与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_CSV } from './utils'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('data-table · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'data-grid', 'search', 'export-csv', 'prev-page', 'next-page', 'page-info', 'row-count']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例渲染出示例表格', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_CSV)
    expect(byTestId('data-grid').textContent).toContain('张三')
    expect(byTestId('row-count').textContent).toContain('5 / 5')
  })

  it('点击表头按年龄升序再降序', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const ageTh = byTestId('th-1')
    fireEvent.click(ageTh)
    // 升序：最小年龄 28 的张三在第一行
    const firstAsc = byTestId('data-grid').querySelector('tbody tr td')?.textContent
    expect(firstAsc).toBe('张三')
    expect(ageTh.textContent).toContain('▲')
    fireEvent.click(ageTh)
    // 降序：最大年龄 41 的赵六在第一行
    const firstDesc = byTestId('data-grid').querySelector('tbody tr td')?.textContent
    expect(firstDesc).toBe('赵六')
    expect(ageTh.textContent).toContain('▼')
  })

  it('搜索过滤行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('search'), { target: { value: '上海' } })
    expect(byTestId('row-count').textContent).toContain('1 / 5')
    expect(byTestId('data-grid').textContent).toContain('李四')
    expect(byTestId('data-grid').textContent).not.toContain('张三')
  })

  it('分页：每页 2 条可翻页', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-pageSize'), { target: { value: '2' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('page-info').textContent).toContain('第 1 / 3 页')
    fireEvent.click(byTestId('next-page'))
    expect(byTestId('page-info').textContent).toContain('第 2 / 3 页')
    fireEvent.click(byTestId('prev-page'))
    expect(byTestId('page-info').textContent).toContain('第 1 / 3 页')
  })

  it('非法 CSV 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\n"oops' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('引号未闭合')
  })

  it('导出 CSV 按钮触发下载', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    try {
      render(<Tool />)
      fireEvent.click(byTestId('example'))
      fireEvent.click(byTestId('export-csv'))
      expect(clickSpy).toHaveBeenCalled()
      expect(createSpy).toHaveBeenCalled()
      expect(revokeSpy).toHaveBeenCalled()
    } finally {
      clickSpy.mockRestore()
      createSpy.mockRestore()
      revokeSpy.mockRestore()
    }
  })
})
