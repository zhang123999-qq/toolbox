// @vitest-environment jsdom
/**
 * protobuf-codec 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

function output(): string {
  return byTestId('output').textContent ?? ''
}

const PROTO = ['message User {', '  int32 id = 1;', '  string name = 2;', '}'].join('\n')

describe('protobuf-codec · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例直接给出结构预览', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('message User {')
    expect(output()).toContain('int32 id = 1;')
  })

  it('切到 encode 并填字段值后输出 hex 字节', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: PROTO } })
    fireEvent.change(byTestId('input-values'), { target: { value: '{"id": 1}' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'encode' } })
    expect(output()).toContain('hex:    0801')
  })

  it('非法的 .proto 让输出区进入 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'message {' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('切到 base64 输出格式后给出 base64 串', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: PROTO } })
    fireEvent.change(byTestId('input-values'), { target: { value: '{"id": 1}' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'encode' } })
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    expect(output()).toContain('base64: CAE=')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
