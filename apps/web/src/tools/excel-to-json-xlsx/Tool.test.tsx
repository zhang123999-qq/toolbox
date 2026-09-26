// @vitest-environment jsdom
/**
 * excel-to-json-xlsx 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = document.querySelector(`[data-testid="${id}"]`)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el as HTMLElement
}

describe('excel-to-json-xlsx · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出对象数组 JSON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('"name": "工具库"')
    expect(output).toContain('"active": true')
  })

  it('关闭「带表头」后输出二维数组', () => {
    const { container } = render(<Tool />)
    fireEvent.click(byTestId('example'))
    const checkbox = container.querySelector('input[type="checkbox"]')
    if (!checkbox) throw new Error('缺少 withHeader 复选框')
    fireEvent.click(checkbox)
    // 关闭表头后需重新运行
    fireEvent.click(byTestId('run'))
    const output = byTestId('output').textContent ?? ''
    expect(output.trimStart().startsWith('[')).toBe(true)
    expect(output).toContain('"id"')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
