// @vitest-environment jsdom
/**
 * i18n-diff 组件测试：双语对比渲染与错误提示。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('i18n-diff · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-target', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例渲染完成率与缺失键', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-summary').textContent).toContain('完成率')
    expect(screen.getByText('app.cancel')).toBeTruthy()
  })

  it('手动输入目标为空时完成率为 0', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":"x"}' } })
    fireEvent.change(byTestId('input-target'), { target: { value: '{}' } })
    expect(byTestId('result-summary').textContent).toContain('0%')
  })

  it('非法 JSON 行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{坏' } })
    fireEvent.change(byTestId('input-target'), { target: { value: '{}' } })
    expect(screen.getByRole('alert').textContent).toContain('JSON')
  })
})
