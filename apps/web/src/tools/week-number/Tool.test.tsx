// @vitest-environment jsdom
/**
 * week-number 组件测试
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

describe('week-number · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 ISO 周数与周一/周日', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('ISO 周数：2026-W')
    expect(output).toContain('该周周一：2026-09-21')
    expect(output).toContain('该周周日：2026-09-27')
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

  it('改成跨年日期后 ISO 年切换', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2025-12-31' } })
    expect(byTestId('output').textContent).toContain('ISO 周数：2026-W01')
  })

  it('输入越界日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2024-02-30' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
