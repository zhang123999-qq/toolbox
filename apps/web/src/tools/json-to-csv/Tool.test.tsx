// @vitest-environment jsdom
/**
 * json-to-csv 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('json-to-csv · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出表头与摊平列', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output.startsWith('id,name,tags[0],tags[1],meta.stars,note')).toBe(true)
    expect(output).toContain('1,工具库,dev,json,870,')
  })

  it('非法 JSON 时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('关闭「带表头」后不再有表头行', () => {
    render(<Tool />)
    fireEvent.click(screen.getByLabelText('带表头'))
    fireEvent.change(byTestId('input'), { target: { value: '[{"a":1}]' } })
    expect(byTestId('output').textContent).toBe('1')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
