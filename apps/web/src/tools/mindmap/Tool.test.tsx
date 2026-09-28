// @vitest-environment jsdom
/**
 * mindmap 组件测试：mermaid 体积大且依赖真实 DOM 度量，
 * jsdom 下用 vi.mock 替换为确定性 mock，聚焦组件状态机。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import mermaid from 'mermaid'
import Tool from './Tool'
import { EXAMPLES, MAX_CODE_LENGTH } from './utils'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn((_id: string, code: string) => {
      if (code.includes('BROKEN-SYNTAX')) return Promise.reject(new Error('syntax error'))
      return Promise.resolve({ svg: `<svg data-source-length="${code.length}"></svg>` })
    }),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('mindmap · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击示例后填入代码并渲染出 SVG', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLES[0])
    const svg = await screen.findByTestId('preview-svg')
    expect(svg.innerHTML).toContain('<svg')
    expect(vi.mocked(mermaid.initialize)).toHaveBeenCalled()
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('首行指令错误进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'flowchart TD\n  A-->B' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('mindmap')
    expect(vi.mocked(mermaid.render)).not.toHaveBeenCalled()
  })

  it('mermaid 渲染失败显示错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'mindmap\n  root((BROKEN-SYNTAX))' },
    })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('渲染失败')
  })

  it('超长代码被截断并说明上限', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'mindmap\n' + 'x'.repeat(MAX_CODE_LENGTH) },
    })
    expect(byTestId('preview-truncated').textContent).toContain(String(MAX_CODE_LENGTH))
  })
})
