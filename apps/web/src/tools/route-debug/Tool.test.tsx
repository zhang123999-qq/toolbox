// @vitest-environment jsdom
/**
 * route-debug 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('route-debug · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出匹配成功与参数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('匹配成功')
    expect(output).toContain('id: 123')
    expect(output).toContain('postId: 456')
  })

  it('路径不匹配时输出不匹配提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '/posts/1' } })
    expect(byTestId('output').textContent).toContain('不匹配')
  })

  it('修改路由规则为正则约束后只匹配数字', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('路由规则'), { target: { value: '/users/:id(\\d+)' } })
    fireEvent.change(byTestId('input'), { target: { value: '/users/abc' } })
    expect(byTestId('output').textContent).toContain('不匹配')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
