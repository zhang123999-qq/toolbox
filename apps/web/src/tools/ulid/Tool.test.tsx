// @vitest-environment jsdom
/**
 * ulid 组件测试
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

const CROCKFORD = /^[0-9A-HJKMNP-TV-Z]{26}$/

describe('ulid · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-count')).toBeTruthy()
  })

  it('点示例输出一个 26 字符 ULID', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('output').textContent ?? '').trim()).toMatch(CROCKFORD)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('数量改为 3 输出三行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-count'), { target: { value: '3' } })
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(line).toMatch(CROCKFORD)
  })

  it('数量填 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-count'), { target: { value: '0' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('数量必须在')
  })
})
