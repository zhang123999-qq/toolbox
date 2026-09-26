// @vitest-environment jsdom
/**
 * json-to-go 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('json-to-go · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出含子结构体与 interface{} 字段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('type Meta struct {')
    expect(output).toMatch(/Note\s+interface\{\}/)
    expect(output).toMatch(/Tags\s+\[\]string/)
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入且输出不再有内容', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).not.toContain('struct')
  })

  it('切换「模式」为 inline 后嵌套结构体写在内部', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'inline' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"meta":{"stars":1}}' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('Meta struct {')
    expect(output).not.toContain('type Meta struct {')
  })

  it('切换「样式」为 plain 后 tag 不带 omitempty', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('样式'), { target: { value: 'plain' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    expect(byTestId('output').textContent).toContain('`json:"a"`')
  })
})
