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

describe('alt-check · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入显示提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('粘贴')
  })

  it('示例填入后实时显示通过率与问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('%')
    expect(byTestId('output').textContent).toContain('缺少 alt')
    expect(byTestId('output').textContent).toContain('文件名')
  })

  it('无 img 时显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<p>无图</p>' } })
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
