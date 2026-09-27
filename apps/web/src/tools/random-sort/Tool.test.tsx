// @vitest-environment jsdom
/**
 * random-sort 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('random-sort · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 4 行、集合不变', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect(lines).toHaveLength(4)
    expect([...lines].sort()).toEqual(['张三', '李四', '王五', '赵六'].sort())
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('点运行重新洗牌（输出仍是同一集合）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect([...lines].sort()).toEqual(['张三', '李四', '王五', '赵六'].sort())
  })
})
