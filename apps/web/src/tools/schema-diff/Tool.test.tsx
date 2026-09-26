// @vitest-environment jsdom
/**
 * schema-diff 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

/** 输出区文本 */
function output(): string {
  return byTestId('output').textContent ?? ''
}

const OLD = '{"users":{"id":{"type":"bigint"},"name":{"type":"varchar(50)"}}}'
const NEW = '{"users":{"id":{"type":"bigint"},"nickname":{"type":"varchar(50)"}}}'

describe('schema-diff · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('多段输入：新旧 Schema 各有一个输入框', () => {
    render(<Tool />)
    expect(byTestId('input')).toBeTruthy()
    expect(byTestId('input-schemaB')).toBeTruthy()
  })

  it('两份 Schema 不同即列出新增与删除字段', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: OLD } })
    fireEvent.change(byTestId('input-schemaB'), { target: { value: NEW } })
    expect(output()).toContain('新增字段 1 · 删除字段 1')
    expect(output()).toContain('+ users.nickname')
    expect(output()).toContain('- users.name')
  })

  it('点击「示例」后按 DDL 对比出类型变更与新增表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('~ users.email  类型: varchar(100) → varchar(255)')
    expect(output()).toContain('+ logs')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-schemaB') as HTMLTextAreaElement).value).toBe('')
  })

  it('切到 markdown 后输出 Markdown 表格', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: OLD } })
    fireEvent.change(byTestId('input-schemaB'), { target: { value: NEW } })
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'markdown' } })
    expect(output()).toContain('| 字段 | 类型 |')
  })

  it('非法 JSON 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    fireEvent.change(byTestId('input-schemaB'), { target: { value: NEW } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('不是合法的 JSON')
  })

  it('取消「忽略大小写」后大小写不同的类型也算变更', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"t":{"a":{"type":"INT"}}}' } })
    fireEvent.change(byTestId('input-schemaB'), { target: { value: '{"t":{"a":{"type":"int"}}}' } })
    expect(output()).toContain('完全一致')
    fireEvent.click(screen.getByLabelText('忽略大小写'))
    expect(output()).toContain('字段变更 1')
  })
})
