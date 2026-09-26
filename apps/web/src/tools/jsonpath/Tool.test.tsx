// @vitest-environment jsdom
/**
 * jsonpath 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('jsonpath · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认表达式对示例数据查出两个书名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual(['JSON 入门', '工具箱笔记'])
  })

  it('改成 $.store.book[0].title 后只返回第一本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-pattern'), {
      target: { value: '$.store.book[0].title' },
    })
    expect(JSON.parse(byTestId('output').textContent ?? '')).toEqual(['JSON 入门'])
  })

  it('输入非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('表达式填了不支持的语法时给出错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":[1,2]}' } })
    fireEvent.change(byTestId('option-pattern'), { target: { value: '$.a[?(@>1)]' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('不支持筛选表达式')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('mode 切到 path 后输出路径与取值', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":{"b":1}}' } })
    fireEvent.change(byTestId('option-pattern'), { target: { value: '$.a.b' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'path' } })
    expect(byTestId('output').textContent).toBe('$.a.b = 1')
  })
})
