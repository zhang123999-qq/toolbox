// @vitest-environment jsdom
/**
 * json-merge 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('json-merge · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('两份对象深层合并后输出重排 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":{"b":1}}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '{"a":{"c":2}}' } })
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual({ a: { b: 1, c: 2 } })
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '[' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」产出合并结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual({
      name: '工具库',
      tools: 871,
      flags: { static: true, dark: true },
    })
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('prefer 切到 base 后冲突字段保留基础侧取值', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"x":1}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '{"x":2}' } })
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual({ x: 2 })

    fireEvent.change(screen.getByLabelText('冲突时优先'), { target: { value: 'base' } })

    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual({ x: 1 })
  })

  it('mode 切到 shallow 后同名子树整体替换', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":{"b":1}}' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '{"a":{"c":2}}' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'shallow' } })
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual({ a: { c: 2 } })
  })
})
