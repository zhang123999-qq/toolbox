// @vitest-environment jsdom
/**
 * loot 组件测试（#803）：随机掉落。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('loot · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('loot-roll')).toBeTruthy()
    expect(byTestId('loot-sim')).toBeTruthy()
  })

  it('单次抽取输出掉落', () => {
    render(<Tool />)
    fireEvent.click(byTestId('loot-roll'))
    expect(byTestId('loot-output').textContent).toContain('掉落：')
  })

  it('模拟统计输出分布', () => {
    render(<Tool />)
    fireEvent.change(byTestId('loot-times'), { target: { value: '100' } })
    fireEvent.change(byTestId('loot-seed'), { target: { value: '7' } })
    fireEvent.click(byTestId('loot-sim'))
    const out = byTestId('loot-output').textContent ?? ''
    expect(out).toContain('模拟 100 次')
    expect(out).toContain('gold')
  })

  it('非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('loot-roll'))
    expect(byTestId('loot-error').textContent).toContain('合法 JSON')
  })

  it('权重和为 0 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[{"id":"a","weight":0}]' } })
    fireEvent.click(byTestId('loot-roll'))
    expect(byTestId('loot-error').textContent).toContain('大于 0')
  })
})
