// @vitest-environment jsdom
/**
 * avro-parse 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('avro-parse · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出字段树与 JSON Schema 两段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('# Avro Schema 字段树')
    expect(output).toContain('com.example.User')
    expect(output).toContain('# JSON Schema 粗略映射')
  })

  it('切到 tree 后不再输出 JSON Schema', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'tree' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).not.toContain('"$schema"')
    expect(output).toContain('字段树')
  })

  it('非法 JSON 时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
