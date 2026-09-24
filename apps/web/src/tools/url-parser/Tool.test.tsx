// @vitest-environment jsdom
/**
 * url-parser 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('url-parser · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 URL 后输出结构化 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://a.test/x?k=1' } })
    expect(byTestId('output').textContent).toContain('"hostname": "a.test"')
  })

  it('缺少协议时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a.test/x' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」填入 URL 并解析出端口', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('"port": "8443"')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
