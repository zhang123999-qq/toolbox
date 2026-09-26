// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('htaccess · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点击清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('勾选浏览器缓存后输出 ExpiresActive', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 默认已开启 URL 重写（开箱可用）；再勾 cache
    fireEvent.click(screen.getByLabelText('浏览器缓存'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('ExpiresActive On')
  })

  it('取消全部勾选后进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 默认勾选了 URL 重写；取消它后所有选项均为空
    fireEvent.click(screen.getByLabelText('URL 重写'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
