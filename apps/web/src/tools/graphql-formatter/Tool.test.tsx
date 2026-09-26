// @vitest-environment jsdom
/**
 * graphql-formatter 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('graphql-formatter · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出多行缩进的查询', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('query GetUser(')
    expect(output).toContain('user(id: $id) {')
  })

  it('非法括号时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{a' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('切到 4 空格缩进', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('缩进'), { target: { value: '4' } })
    fireEvent.change(byTestId('input'), { target: { value: '{a{b}}' } })
    expect(byTestId('output').textContent).toContain('    a {')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
