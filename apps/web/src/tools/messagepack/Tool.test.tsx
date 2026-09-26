// @vitest-environment jsdom
/**
 * messagepack 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('messagepack · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例编码出 hex 与字节数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('hex   :')
    expect(output()).toContain('字节数:')
  })

  it('切到解码模式后把字节串还原成 JSON', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'decode' } })
    fireEvent.change(byTestId('input'), { target: { value: '81a16101' } })
    expect(output()).toContain('"a": 1')
  })

  it('非法 JSON 时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('切换输出格式为 base64', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    expect(output()).toContain('base64: gaFhAQ==')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
