// @vitest-environment jsdom
/**
 * json-sort 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('json-sort · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入对象后按键名升序输出（默认缩进排版）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"b":1,"a":2}' } })
    expect(byTestId('output').textContent).toBe('{\n  "a": 2,\n  "b": 1\n}')
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":}' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」输出排序后的 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      '{\n  "name": "工具库",\n  "tags": [\n    "json",\n    "static"\n  ],\n  "tools": 870\n}',
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('勾选「降序」后键序反转', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1,"b":2}' } })
    fireEvent.click(screen.getByLabelText('降序'))
    expect(byTestId('output').textContent).toBe('{\n  "b": 2,\n  "a": 1\n}')
  })

  it('format 切到 compact 后输出单行', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"b":1,"a":2}' } })
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'compact' } })
    expect(byTestId('output').textContent).toBe('{"a":2,"b":1}')
  })
})
