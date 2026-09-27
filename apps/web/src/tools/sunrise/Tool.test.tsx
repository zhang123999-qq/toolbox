// @vitest-environment jsdom
/**
 * sunrise 组件测试
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

describe('sunrise · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出北京夏至日出日落', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('日出：')
    expect(output).toContain('日落：')
    expect(output).toContain('昼长：')
  })

  it('输入极昼坐标后标注「极昼」', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '日期: 2025-06-21\n纬度: 78\n经度: 15\n时区: 1' },
    })
    expect(byTestId('output').textContent).toContain('极昼')
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

  it('纬度越界进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '日期: 2025-06-21\n纬度: 999\n经度: 116.4' },
    })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('非法日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '日期: 2025-02-30\n纬度: 39.9\n经度: 116.4' },
    })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
