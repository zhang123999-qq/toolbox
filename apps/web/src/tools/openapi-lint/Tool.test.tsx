// @vitest-environment jsdom
/**
 * openapi-lint 组件测试（#745）：规范粘贴后 lint 并打分。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { DEFAULT_SPEC_JSON } from './utils'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('openapi-lint · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['lint-summary', 'lint-score']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认示例规范评 100 分', () => {
    render(<Tool />)
    expect(byTestId('lint-score').textContent).toContain('100')
  })

  it('非法内容显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a: 1\n b: 2\nc: 3' } })
    expect(byTestId('lint-error').textContent).toContain('不是合法的 JSON 或 YAML')
  })

  it('问题规范列出中文级别标签', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"openapi":"2.0"}' } })
    expect(byTestId('lint-issues').textContent).toContain('[错误]')
    expect(byTestId('lint-score').textContent).not.toContain('100 分')
  })

  it('YAML 规范可被检查', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: DEFAULT_SPEC_JSON } })
    expect(byTestId('lint-score').textContent).toContain('100')
  })
})
