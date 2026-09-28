// @vitest-environment jsdom
/**
 * data-sort 组件测试：聚焦排序规则输入、结果顺序与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_CSV, EXAMPLE_SPEC } from './utils'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function firstColumnNames(): string[] {
  const cells = byTestId('result-grid').querySelectorAll('tbody tr td:first-child')
  return Array.from(cells).map((c) => c.textContent ?? '')
}

describe('data-sort · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-sortSpec',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'result-grid',
      'sort-info',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例按年龄降序、销售额升序排列', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_CSV)
    expect((byTestId('input-sortSpec') as HTMLTextAreaElement).value).toBe(EXAMPLE_SPEC)
    expect(firstColumnNames()).toEqual(['赵六', '李四', '钱七', '张三', '王五'])
    expect(byTestId('sort-info').textContent).toContain('年龄 desc → 销售额 asc')
  })

  it('自定义单列升序', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: EXAMPLE_CSV } })
    fireEvent.change(byTestId('input-sortSpec'), { target: { value: '销售额:asc' } })
    fireEvent.click(byTestId('run'))
    // 销售额：赵六 7600 最小，王五 15300 最大
    const names = firstColumnNames()
    expect(names[0]).toBe('赵六')
    expect(names[names.length - 1]).toBe('王五')
  })

  it('规则引用不存在的列显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: EXAMPLE_CSV } })
    fireEvent.change(byTestId('input-sortSpec'), { target: { value: '国家:asc' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('列「国家」不存在于表头')
  })

  it('非法方向显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: EXAMPLE_CSV } })
    fireEvent.change(byTestId('input-sortSpec'), { target: { value: '年龄:up' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('方向须为 asc 或 desc')
  })
})
