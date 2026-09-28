// @vitest-environment jsdom
/**
 * pivot 组件测试：纯前端透视表，无外部依赖；
 * 聚焦渲染、维度校验、聚合切换与 CSV 导出。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('pivot · Tool', () => {
  it('渲染后必需 data-testid 存在（含维度输入与聚合下拉）', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-rowKey',
      'input-colKey',
      'input-valKey',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'pivot-table',
      'download-csv',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例渲染透视表并带合计', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const table = byTestId('pivot-table')
    expect(table.textContent).toContain('华东')
    expect(table.textContent).toContain('行合计')
    expect(table.textContent).toContain('列合计')
    expect(table.textContent).toContain('740')
  })

  it('行维度列名错误进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-rowKey'), { target: { value: '城市' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('找不到行维度列')
  })

  it('切换聚合方式为计数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const aggSelect = screen.getByText('聚合方式').querySelector('select')
    expect(aggSelect).toBeTruthy()
    fireEvent.change(aggSelect!, { target: { value: 'count' } })
    const table = byTestId('pivot-table')
    // 计数：5 行数据，总计 5
    expect(table.textContent).toContain('5')
  })

  it('点导出 CSV 触发 Blob 下载', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(byTestId('download-csv'))
    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    const a = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(a.download).toBe('pivot.csv')
    clickSpy.mockRestore()
  })
})
