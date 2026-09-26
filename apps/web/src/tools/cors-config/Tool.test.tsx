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

describe('cors-config · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('指定来源 + 示例输出响应头', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('允许的 Origin'), {
      target: { value: 'https://example.com' },
    })
    fireEvent.change(screen.getByLabelText('来源模式'), { target: { value: 'specific' } })
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('Access-Control-Allow-Origin: https://example.com')
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

  it('* 与携带凭据同开进入错误态', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('来源模式'), { target: { value: 'allow-all' } })
    fireEvent.click(screen.getByLabelText('携带凭据'))
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('不能同时')
  })
})
