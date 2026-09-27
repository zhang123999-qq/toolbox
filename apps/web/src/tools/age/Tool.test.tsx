// @vitest-environment jsdom
/**
 * age 组件测试
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

describe('age · Tool', () => {
  it('渲染后 7 个必需 data-testid + 参考日期输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出年龄/生肖/星座', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('出生日期：1990-05-20')
    expect(output).toContain('生肖：马')
    expect(output).toContain('星座：金牛座')
    expect(output).toContain('岁')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('填入参考日期后年龄随之变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2000-01-01' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '2020-01-01' } })
    expect(byTestId('output').textContent).toContain('年龄：20 岁 0 个月 0 天')
  })

  it('输入越界日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2000-02-30' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
