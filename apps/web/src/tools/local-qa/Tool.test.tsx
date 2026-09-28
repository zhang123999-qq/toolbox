// @vitest-environment jsdom
/**
 * local-qa 组件测试：纯本地计算，无需 mock。
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

const DOCS = '复利是指利息也产生利息。\n\n复利计算公式为：本息和 = 本金 × (1 + 利率)^期数。'

describe('local-qa · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提问 → 返回答案与证据', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-docs'), { target: { value: DOCS } })
    fireEvent.change(byTestId('input'), { target: { value: '复利公式是什么' } })
    expect(byTestId('answer').textContent).toContain('复利计算公式')
    expect(screen.queryAllByTestId('evidence').length).toBeGreaterThan(0)
  })

  it('示例按钮 → 自动作答', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('answer').textContent).toContain('复利计算公式')
  })

  it('无关问题 → 中文未找到说明', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-docs'), { target: { value: DOCS } })
    fireEvent.change(byTestId('input'), { target: { value: '量子力学' } })
    expect(byTestId('answer').textContent).toContain('未在文档中找到')
  })

  it('证据句数切换为 1 → 只展示一条证据', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-docs'), { target: { value: DOCS } })
    fireEvent.change(byTestId('input'), { target: { value: '复利' } })
    fireEvent.change(screen.getByRole('combobox', { name: '证据句数' }), { target: { value: '1' } })
    expect(screen.queryAllByTestId('evidence')).toHaveLength(1)
  })

  it('未填文档或问题 → 提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('粘贴文档')
  })
})
