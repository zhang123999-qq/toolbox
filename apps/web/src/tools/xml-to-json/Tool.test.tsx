// @vitest-environment jsdom
/**
 * xml-to-json 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('xml-to-json · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 XML 后输出 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a><b>1</b></a>' } })
    expect(byTestId('output').textContent).toBe('{\n  "a": {\n    "b": "1"\n  }\n}')
  })

  it('属性带前缀，改名 textKey 后键名随之变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a x="1">t</a>' } })
    expect(byTestId('output').textContent).toContain('"@x": "1"')
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'value' } })
    expect(byTestId('output').textContent).toContain('"value": "t"')
  })

  it('切到 always 后单个子元素也输出成数组', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<r><i>1</i></r>' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'always' } })
    expect(byTestId('output').textContent).toContain('"i": [')
  })

  it('输入不闭合的 XML 时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a><b></a>' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「示例」填入 XML 并产出 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('"catalog"')
    expect(byTestId('output').textContent).toContain('"@id": "1"')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
