// @vitest-environment jsdom
/**
 * properties-parse 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('properties-parse · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 Properties 后输出字符串值的 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a = 1\nb = two' } })
    expect(byTestId('output').textContent).toBe('{\n  "a": "1",\n  "b": "two"\n}')
  })

  it('非法 \\u 转义时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a = \\u12' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」输出还原转义后的 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      [
        '{',
        '  "app.name": "工具库",',
        '  "app.port": "8080",',
        '  "app.debug": "false",',
        '  "legacy.title": "工具库"',
        '}',
      ].join('\n'),
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切到 JSON → Properties 方向后输出 key=value', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'json2props' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":"1","b":"x y"}' } })
    expect(byTestId('output').textContent).toBe('a=1\nb=x y')
  })

  it('编码切到 escaped 后非 ASCII 写成 \\uXXXX', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'json2props' } })
    fireEvent.change(screen.getByLabelText('编码'), { target: { value: 'escaped' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"k":"工"}' } })
    expect(byTestId('output').textContent).toBe('k=\\u5de5')
  })
})
