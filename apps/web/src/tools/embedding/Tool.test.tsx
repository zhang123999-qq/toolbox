// @vitest-environment jsdom
/**
 * embedding 组件测试：纯本地计算，无需 mock。
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

describe('embedding · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入文本 → 显示向量预览', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '今天天气不错' } })
    expect(byTestId('vector-preview').textContent).toContain('共 256 维')
  })

  it('输入文本 B → 显示余弦相似度', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '苹果香蕉' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '苹果香蕉' } })
    const sim = byTestId('similarity').textContent ?? ''
    expect(sim).toContain('余弦相似度')
    expect(sim).toContain('1.0000')
  })

  it('切换维度 → 向量维度变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '测试' } })
    fireEvent.change(screen.getByRole('combobox', { name: '维度' }), { target: { value: '64' } })
    expect(byTestId('vector-preview').textContent).toContain('共 64 维')
  })

  it('空输入 → 提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('输入文本后自动计算')
  })
})
