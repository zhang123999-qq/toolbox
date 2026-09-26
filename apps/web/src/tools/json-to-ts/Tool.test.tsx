// @vitest-environment jsdom
/**
 * json-to-ts 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('json-to-ts · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出含嵌套类型与可选字段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('interface Meta {')
    expect(output).toContain('meta: Meta;')
    expect(output).toContain('note?: null;')
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
    expect(byTestId('output').textContent).not.toContain('interface')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切换「类型」为 type 后输出类型别名', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('类型'), { target: { value: 'type' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    expect(byTestId('output').textContent).toBe('type Root = {\n  a: number;\n}\n')
  })

  it('勾选「严格模式」后 null 字段不再是可选属性', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"note":null}' } })
    expect(byTestId('output').textContent).toContain('note?: null;')

    fireEvent.click(screen.getByLabelText('严格模式'))

    expect(byTestId('output').textContent).toContain('note: null;')
  })
})
