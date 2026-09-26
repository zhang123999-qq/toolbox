// @vitest-environment jsdom
/**
 * json-to-xml 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('json-to-xml · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出带声明的 XML', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(output).toContain('<meta>')
    expect(output).toContain('<stars>870</stars>')
  })

  it('非法 JSON 时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('自定义根元素名生效', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('根元素名'), { target: { value: 'data' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    expect(byTestId('output').textContent).toContain('<data>')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
