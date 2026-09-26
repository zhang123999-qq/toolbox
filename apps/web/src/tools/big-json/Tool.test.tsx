// @vitest-environment jsdom
/**
 * big-json 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('big-json · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认统计模式输出规模与计数', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":[1,2]}' } })
    expect(byTestId('output').textContent).toContain('对象数：1')
    expect(byTestId('output').textContent).toContain('结构闭合：是')
  })

  it('点击「示例」产出统计，点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('最大嵌套深度：3')

    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('mode 切到 paths 后列出键路径', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":{"b":1}}' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'paths' } })
    expect(byTestId('output').textContent).toContain('$.a.b')
  })

  it('mode 切到 error 后定位语法错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{\n  "a": [1,]\n}' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'error' } })
    expect(byTestId('output').textContent).toContain('第 2 行第 11 列')
  })

  it('topN 改成 10 后取样上限随之变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'paths' } })
    expect(byTestId('output').textContent).toContain('最多 25 条')

    fireEvent.change(screen.getByLabelText('前 N 个'), { target: { value: '10' } })

    expect(byTestId('output').textContent).toContain('最多 10 条')
  })
})
