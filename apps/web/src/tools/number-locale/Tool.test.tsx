// @vitest-environment jsdom
/**
 * number-locale 组件测试（#724）：输入数字实时输出多 locale 对比。
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

describe('number-locale · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'option-locales']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入数字实时输出多 locale 结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1234567.89' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('十进制：1,234,567.89')
    expect(out).toContain('ar-EG')
  })

  it('非法数字输出中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('无法解析数字')
  })

  it('点示例填入示例数字', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('十进制：')
  })
})
