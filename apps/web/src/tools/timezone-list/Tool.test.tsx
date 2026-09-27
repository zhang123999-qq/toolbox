// @vitest-environment jsdom
/**
 * timezone-list 组件测试
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

describe('timezone-list · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后列出 Asia 区时区', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('Asia/Shanghai')
    expect(output).toMatch(/\(UTC[+-]\d{2}:\d{2}\)/)
  })

  it('改关键词过滤到单个时区', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'Shanghai' } })
    const output = byTestId('output').textContent ?? ''
    expect(output.trim().split('\n')).toHaveLength(1)
    expect(output).toContain('Asia/Shanghai')
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

  it('无匹配关键词不进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'NoSuchPlaceXYZ' } })
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
