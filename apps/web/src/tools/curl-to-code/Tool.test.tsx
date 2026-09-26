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

describe('curl-to-code · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例输出 fetch 代码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('fetch(')
    expect(output).toContain('api.example.com/users')
    expect(output).toContain("method: 'POST'")
  })

  it('切到 python 生成 requests 代码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('目标语言'), { target: { value: 'python' } })
    expect(byTestId('output').textContent).toContain('requests.post')
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

  it('非法命令进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a curl' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('curl')
  })
})
