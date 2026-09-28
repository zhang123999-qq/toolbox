// @vitest-environment jsdom
/**
 * tarot 组件测试（#840）：牌阵抽取交互。
 */
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

describe('tarot · Tool', () => {
  it('三种牌阵按钮存在', () => {
    render(<Tool />)
    for (const id of ['single', 'three', 'cross']) {
      expect(byTestId(`tarot-spread-${id}`)).toBeTruthy()
    }
  })

  it('默认三张牌阵抽牌显示三张', () => {
    render(<Tool />)
    fireEvent.click(byTestId('tarot-draw'))
    for (const i of [0, 1, 2]) {
      expect(byTestId(`tarot-card-${i}`)).toBeTruthy()
    }
    expect(byTestId('tarot-card-0').textContent).toContain('')
    expect(byTestId('tarot-card-2').textContent).toContain('')
  })

  it('切换单张牌阵抽牌只显示一张', () => {
    render(<Tool />)
    fireEvent.click(byTestId('tarot-spread-single'))
    fireEvent.click(byTestId('tarot-draw'))
    expect(byTestId('tarot-card-0').textContent).toContain('')
    expect(screen.queryByTestId('tarot-card-1')).toBeNull()
  })

  it('切换牌阵清空上次结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('tarot-draw'))
    expect(byTestId('tarot-card-0')).toBeTruthy()
    fireEvent.click(byTestId('tarot-spread-cross'))
    expect(screen.queryByTestId('tarot-card-0')).toBeNull()
  })

  it('抽出的牌含正/逆位标记', () => {
    render(<Tool />)
    fireEvent.click(byTestId('tarot-draw'))
    const text = byTestId('tarot-card-0').textContent ?? ''
    expect(text.includes('正位') || text.includes('逆位')).toBe(true)
  })
})
