// @vitest-environment jsdom
/**
 * xml-formatter 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * jsdom 里 DOMParser 存在，会走「原生校验 + 自研解析」这条路径；
 * test.ts 在 node 里跑（无 DOMParser），两边输出必须一致。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('xml-formatter · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入压缩成一行的 XML 后输出带缩进', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a><b>1</b></a>' } })
    expect(byTestId('output').textContent).toBe('<a>\n  <b>1</b>\n</a>')
  })

  it('切到 minify 后输出压成单行', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a>\n  <b>1</b>\n</a>' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'minify' } })
    expect(byTestId('output').textContent).toBe('<a><b>1</b></a>')
  })

  it('输入不闭合的 XML 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a><b></a>' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('第 1 行第 7 列')
  })

  it('点击「示例」填入 XML 并产出格式化结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('<catalog>')
    expect(byTestId('output').textContent).toContain('  <book id="1">')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
