// @vitest-environment jsdom
/**
 * data-url-parser 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('data-url-parser · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 Data URL 后解析出媒体类型与字节数', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'data:text/plain,hello' } })
    expect(output()).toContain('媒体类型: text/plain')
    expect(output()).toContain('字节数: 5 字节')
  })

  it('点击「示例」后解出 Base64 正文', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('媒体类型: text/plain;charset=utf-8')
    expect(output()).toContain('工具库')
    expect(output()).toContain('字节数: 10 字节')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切到 raw 后只输出还原出的正文', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'raw' } })
    expect(output()).toBe('工具库\n')
  })

  it('切到 json 后输出可 JSON.parse 的结构', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'json' } })
    const parsed = JSON.parse(output()) as { base64: boolean; byteLength: number }
    expect(parsed.base64).toBe(true)
    expect(parsed.byteLength).toBe(10)
  })

  it('非 Data URL 输入时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('不是 Data URL')
  })
})
