// @vitest-environment jsdom
/**
 * http-header-parser 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('http-header-parser · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入原始请求头后解析出起始行与字段', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'GET / HTTP/1.1\nHost: example.com\nAccept: */*' },
    })
    expect(output()).toContain('起始行: GET / HTTP/1.1')
    expect(output()).toMatch(/Host\s+: example\.com/)
    expect(output()).toContain('共 2 个字段')
  })

  it('非法输入时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '不是 HTTP 头' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('头字段')
  })

  it('点击「示例」后产出该示例的解析结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('起始行: GET /api/tools?page=2 HTTP/1.1')
    expect(output()).toMatch(/User-Agent\s+: Mozilla\/5\.0/)
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('把「格式」切到 json 后输出可解析的结构化 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'json' } })
    const parsed = JSON.parse(output()) as { kind: string; count: number }
    expect(parsed.kind).toBe('request')
    expect(parsed.count).toBe(5)
  })

  it('把「方向」切到 build 后由文本行生成规范化头文本', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'host : example.com\nX-A:  1' } })
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'build' } })
    expect(output()).toBe('host: example.com\nX-A: 1')
  })
})
