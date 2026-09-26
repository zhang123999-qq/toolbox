// @vitest-environment jsdom
/**
 * jsonl 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('jsonl · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('两行 JSONL 解析成数组', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}\n{"a":2}' } })
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('坏行时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}\n{"a":}' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('第 2 行不是合法 JSON')
  })

  it('点击「示例」产出 JSON 数组，点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual([
      { id: 1, name: '工具库' },
      { id: 2, name: '收纳盒' },
    ])

    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('mode 切到 json2jsonl 后一行一个元素', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[{"a":1},{"b":2}]' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'json2jsonl' } })
    expect(byTestId('output').textContent).toBe('{"a":1}\n{"b":2}')
  })

  it('mode 切到 validate 后给出校验明细', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}\nbroken' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'validate' } })
    expect(byTestId('output').textContent).toContain('合法 1 行，不合法 1 行')
  })

  it('勾选「跳过空行」后空行不再报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}\n\n{"a":2}' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')

    fireEvent.click(screen.getByLabelText('跳过空行'))

    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual([{ a: 1 }, { a: 2 }])
  })
})
