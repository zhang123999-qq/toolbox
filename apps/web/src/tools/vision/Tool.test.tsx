// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('眼力测试组件', () => {
  it('渲染关卡、得分与色块阵', () => {
    render(<Tool />)
    expect(byTestId('vision-level').textContent).toContain('第 1 关')
    expect(byTestId('vision-grid').children.length).toBe(9)
  })

  it('点中色差块升级并加分', () => {
    render(<Tool />)
    const odd = screen.getByLabelText('色差块')
    fireEvent.click(odd)
    expect(byTestId('vision-level').textContent).toContain('第 2 关')
    expect(byTestId('vision-score').textContent).toContain('得分 1')
    expect(byTestId('vision-ok')).toBeTruthy()
  })

  it('点错色块记一次失误且不升级', () => {
    render(<Tool />)
    const normal = screen.getAllByLabelText('普通色块')[0]
    fireEvent.click(normal)
    expect(byTestId('vision-level').textContent).toContain('第 1 关')
    expect(byTestId('vision-mistakes').textContent).toContain('失误 1')
    expect(byTestId('vision-bad')).toBeTruthy()
  })

  it('重新开始重置状态', () => {
    render(<Tool />)
    const odd = screen.getByLabelText('色差块')
    fireEvent.click(odd)
    fireEvent.click(byTestId('vision-restart'))
    expect(byTestId('vision-level').textContent).toContain('第 1 关')
    expect(byTestId('vision-score').textContent).toContain('得分 0')
  })
})
