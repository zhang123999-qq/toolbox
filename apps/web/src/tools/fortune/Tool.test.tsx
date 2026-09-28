// @vitest-environment jsdom
/**
 * fortune 组件测试（#841）：求签交互。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { FORTUNES } from './utils'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('fortune · Tool', () => {
  it('默认列出 30 签', () => {
    render(<Tool />)
    for (const f of FORTUNES) {
      expect(byTestId(`fortune-item-${f.no}`)).toBeTruthy()
    }
  })

  it('点求签显示签文结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('fortune-draw'))
    const text = byTestId('fortune-result').textContent ?? ''
    expect(text).toMatch(/第 \d+ 签/)
    expect(text).toContain('解曰：')
  })

  it('按吉凶筛选签文列表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('fortune-filter-下下'))
    const shown = FORTUNES.filter((f) => f.luck === '下下')
    const hidden = FORTUNES.filter((f) => f.luck !== '下下')
    for (const f of shown) {
      expect(byTestId(`fortune-item-${f.no}`)).toBeTruthy()
    }
    for (const f of hidden) {
      expect(screen.queryByTestId(`fortune-item-${f.no}`)).toBeNull()
    }
  })

  it('切回全部显示 30 签', () => {
    render(<Tool />)
    fireEvent.click(byTestId('fortune-filter-上上'))
    fireEvent.click(byTestId('fortune-filter-全部'))
    expect(byTestId('fortune-item-30')).toBeTruthy()
  })
})
