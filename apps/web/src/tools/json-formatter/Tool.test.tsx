// @vitest-environment jsdom
/**
 * json-formatter 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 用 `@vitest-environment jsdom` 单文件声明环境，避免把整个仓库的默认
 * 测试环境从 node 改成 jsdom——utils 单测（test.ts）不需要 DOM。
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

describe('json-formatter · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入合法 JSON 后输出区实时格式化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"b":1,"a":2}' } })
    expect(byTestId('output').textContent).toContain('"b": 1')
    expect(byTestId('output').textContent).toContain('"a": 2')
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{not json' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).not.toContain('"b"')
  })

  it('点击「示例」填入示例 JSON 并产出格式化结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('"tools": 870')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切换「排序键名」后键名按字典序重排', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"b":1,"a":2}' } })

    const before = byTestId('output').textContent ?? ''
    expect(before.indexOf('"b"')).toBeLessThan(before.indexOf('"a"'))

    // 复选框无 data-testid，按可访问名定位（DEVELOPMENT.md §8.3 只规定 7 个必需 id）
    fireEvent.click(screen.getByLabelText('排序键名'))

    const after = byTestId('output').textContent ?? ''
    expect(after.indexOf('"a"')).toBeLessThan(after.indexOf('"b"'))
  })

  it('缩进从 2 切到 4 空格后输出缩进变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    const indent2 = byTestId('output').textContent ?? ''
    expect(indent2).toContain('\n  "a"')

    fireEvent.change(screen.getByLabelText('缩进'), { target: { value: '4' } })
    expect(byTestId('output').textContent).toContain('\n    "a"')
  })
})
