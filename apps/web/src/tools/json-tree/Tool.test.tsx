// @vitest-environment jsdom
/**
 * json-tree 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('json-tree · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入对象后输出首行是根节点概要', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    expect(byTestId('output').textContent).toBe('$ <object> 1 项\n  a <number> 1')
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[1,' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」展开多层嵌套', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('$ <object> 3 项')
    expect(byTestId('output').textContent).toContain('    [0] <string> "json"')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('mode 切到 path 后输出平铺路径', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"b":{"c":1}}' } })
    expect(byTestId('output').textContent).toContain('<object>')

    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'path' } })

    expect(byTestId('output').textContent).toBe('$.b.c = 1')
  })

  it('勾选「排序键名」后对象键按字典序排', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"b":1,"a":2}' } })
    fireEvent.click(screen.getByLabelText('排序键名'))
    expect(byTestId('output').textContent).toBe('$ <object> 2 项\n  a <number> 2\n  b <number> 1')
  })
})
