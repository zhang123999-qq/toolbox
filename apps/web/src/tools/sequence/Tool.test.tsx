// @vitest-environment jsdom
/**
 * sequence 组件测试：mermaid 体积大且依赖真实 DOM 度量，
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

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('sequence · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
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

  it('点击清空后回到空输入并显示引导文案（不进入错误态）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('左侧')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('首行指令错误进入错误态并显示双语错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'flowchart TD\n    A-->B' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('sequenceDiagram')
    expect(vi.mocked(mermaid.render)).not.toHaveBeenCalled()
  })

  it('mermaid 渲染失败显示双语错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'sequenceDiagram\n    A->>B: BROKEN-SYNTAX' },
    })
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('渲染失败')
  })

  it('超长代码被截断并在 UI 说明上限', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'sequenceDiagram\n' + 'x'.repeat(MAX_CODE_LENGTH) },
    })
    expect(byTestId('preview-truncated').textContent).toContain(String(MAX_CODE_LENGTH))
  })

  it('特殊字符原样透传给渲染器（不被转义或删减）', async () => {
    render(<Tool />)
    const code = 'sequenceDiagram\n    A->>B: <tag> & "引号"'
    fireEvent.change(byTestId('input'), { target: { value: code } })
    await screen.findByTestId('preview-svg')
    expect(vi.mocked(mermaid.render)).toHaveBeenLastCalledWith(expect.any(String), code)
  })
})
