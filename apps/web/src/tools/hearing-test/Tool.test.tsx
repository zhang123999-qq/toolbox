// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { HEARING_FREQS } from './utils'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('听力测试组件', () => {
  it('渲染 7 个频率行', () => {
    render(<Tool />)
    for (const f of HEARING_FREQS) {
      expect(byTestId(`ht-play-${f}`)).toBeTruthy()
    }
    expect(byTestId('ht-progress').textContent).toContain('已测 0 / 7')
  })

  it('逐个作答后出筛查结果', () => {
    render(<Tool />)
    for (const f of HEARING_FREQS) {
      fireEvent.click(byTestId(`ht-heard-${f}`))
    }
    expect(byTestId('ht-progress').textContent).toContain('已测 7 / 7')
    expect(byTestId('ht-result').textContent).toContain('听力筛查通过')
  })

  it('有未听见频率时结果列出', () => {
    render(<Tool />)
    fireEvent.click(byTestId('ht-heard-125'))
    fireEvent.click(byTestId('ht-missed-8000'))
    for (const f of [250, 500, 1000, 2000, 4000]) {
      fireEvent.click(byTestId(`ht-heard-${f}`))
    }
    expect(byTestId('ht-result').textContent).toContain('8000')
    expect(byTestId('ht-result').textContent).toContain('未听见')
  })

  it('重新测试清空结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('ht-heard-125'))
    fireEvent.click(byTestId('ht-restart'))
    expect(byTestId('ht-progress').textContent).toContain('已测 0 / 7')
    expect(screen.queryByTestId('ht-result')).toBeNull()
  })
})
