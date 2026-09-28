// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('structured-data · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('同步运行直接输出校验报告', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('通过')
    expect(byTestId('output').textContent).toContain('Article')
  })

  it('非法 JSON 进入错误态（JSON 模式）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":}' } })
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'JSON-LD 文本' } })
    // 同步 run 直接重算；失败块渲染为失败而非抛错
    expect(byTestId('output').textContent).toContain('失败')
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
})
