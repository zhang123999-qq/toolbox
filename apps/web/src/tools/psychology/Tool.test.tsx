// @vitest-environment jsdom
/**
 * psychology 组件测试（#839）：自评量表交互。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { getScale } from './utils'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('psychology · Tool', () => {
  it('默认渲染压力量表 10 题', () => {
    render(<Tool />)
    const scale = getScale('stress')
    for (const q of scale.questions) {
      expect(byTestId(`psychology-q-${q.id}-0`)).toBeTruthy()
    }
  })

  it('可切换到焦虑量表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('psychology-scale-anxiety'))
    const scale = getScale('anxiety')
    expect(scale.questions).toHaveLength(7)
    expect(byTestId('psychology-q-a1-0')).toBeTruthy()
    expect(screen.queryByTestId('psychology-q-s1-0')).toBeNull()
  })

  it('未答完提交提示剩余题数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('psychology-submit'))
    expect(byTestId('psychology-error').textContent).toContain('还有 10 道题未作答')
  })

  it('全选"从不"评估为正常', () => {
    render(<Tool />)
    for (const q of getScale('stress').questions) {
      fireEvent.click(byTestId(`psychology-q-${q.id}-0`))
    }
    fireEvent.click(byTestId('psychology-submit'))
    const text = byTestId('psychology-result').textContent ?? ''
    expect(text).toContain('总分：0 / 40')
    expect(text).toContain('正常')
  })

  it('全选"总是"评估为重度', () => {
    render(<Tool />)
    for (const q of getScale('stress').questions) {
      fireEvent.click(byTestId(`psychology-q-${q.id}-4`))
    }
    fireEvent.click(byTestId('psychology-submit'))
    expect(byTestId('psychology-result').textContent).toContain('重度')
  })

  it('重新测试清空答案', () => {
    render(<Tool />)
    fireEvent.click(byTestId('psychology-q-s1-4'))
    fireEvent.click(byTestId('psychology-retake'))
    expect((byTestId('psychology-q-s1-4') as HTMLInputElement).checked).toBe(false)
  })
})
