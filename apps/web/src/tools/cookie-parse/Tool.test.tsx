// @vitest-environment jsdom
/**
 * cookie-parse 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('cookie-parse · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认解析模式：输入 Cookie 串输出 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a=1; b=2' } })
    expect(byTestId('output').textContent).toContain('"a": "1"')
  })

  it('无值属性解析为 true', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'HttpOnly' } })
    expect(byTestId('output').textContent).toContain('"HttpOnly": true')
  })

  it('点击「示例」填入 Set-Cookie 串并解析出 Path', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('"Path": "/"')
  })

  it('切换到生成模式后，JSON 输入变成 Cookie 串', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'build' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1,"b":2}' } })
    expect(byTestId('output').textContent).toBe('a=1; b=2')
  })

  it('生成模式下非法 JSON 转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'build' } })
    fireEvent.change(byTestId('input'), { target: { value: '{not json' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
