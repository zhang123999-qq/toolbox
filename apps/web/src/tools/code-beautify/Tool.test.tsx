// @vitest-environment jsdom
/**
 * code-beautify 组件测试
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

describe('code-beautify · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出格式化后的 JS（含缩进换行）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('{')
    expect(output.includes('\n')).toBe(true)
  })

  it('切换语言到 json 并粘贴合法 JSON，输出带缩进', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'json' } })
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('"a": 1')
  })

  it('JSON 非法时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'json' } })
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
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
