// @vitest-environment jsdom
/**
 * graphql-to-code 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('graphql-to-code · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例生成变量类型与结果类型', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('export interface GetUserQueryVariables {')
    expect(output()).toContain('export interface GetUserQuery {')
  })

  it('输入非法 GraphQL 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'query { user { ' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('切换模式为 result 后不再输出变量接口', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'query A($id: ID!) { user { id } }' } })
    expect(output()).toContain('Variables')
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'result' } })
    expect(output()).not.toContain('Variables')
  })

  it('关闭严格模式后可空变量变为可选且不带 null', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'query A($q: String) { search { id } }' },
    })
    expect(output()).toContain('(string) | null')
    fireEvent.click(screen.getByLabelText('严格模式'))
    expect(output()).toContain('  q?: string')
    expect(output()).not.toContain('| null')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
