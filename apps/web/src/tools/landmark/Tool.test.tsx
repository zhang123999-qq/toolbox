// @vitest-environment jsdom
/**
 * landmark 组件测试（#733）：输入 HTML 实时输出地标分析。
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

describe('landmark · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入规范 HTML 输出通过报告', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<header>H</header><main>M</main><footer>F</footer>' },
    })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('地标总数：3')
    expect(out).toContain('未发现地标问题 ✓')
  })

  it('问题 HTML 输出缺少 main 错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<nav> </nav><nav> </nav>' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('缺少 main')
    expect(out).toContain('无法区分')
  })

  it('点示例填入并检出示例问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('地标总数：5')
    expect(out).toContain('缺少 main')
  })
})
