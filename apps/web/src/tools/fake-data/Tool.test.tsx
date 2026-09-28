// @vitest-environment jsdom
/**
 * fake-data 组件测试
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

describe('fake-data · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-count')).toBeTruthy()
  })

  it('点示例输出含 name/email/phone 的 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('name')
    expect(text).toContain('email')
    expect(text).toContain('phone')
    expect(() => JSON.parse(text)).not.toThrow()
  })

  it('空输入不进入错误态（模板显示空占位）', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('非法字段类型进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'foo' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('不支持的字段类型')
  })

  it('行数填 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'name' } })
    fireEvent.change(byTestId('option-count'), { target: { value: '0' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('数量必须为 1 到 20')
  })
})
