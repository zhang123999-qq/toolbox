// @vitest-environment jsdom
/**
 * sampling 组件测试
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

describe('sampling · Tool', () => {
  it('渲染后 7 个必需 data-testid + 样本量/种子输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-sampleSize')).toBeTruthy()
    expect(byTestId('input-seed')).toBeTruthy()
  })

  it('点示例后输出 3 个样本与统计行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('抽样方式')
    expect(output).toContain('无放回')
    expect(output).toContain('总体规模')
    expect(output).toContain('5')
    expect(output).toContain('抽样结果')
    // 示例用固定种子 42：结果可复现，断言确定性
    const first = output
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toBe(first)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-sampleSize') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-seed') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('非法样本量进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb\nc' } })
    fireEvent.change(byTestId('input-sampleSize'), { target: { value: 'abc' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('样本量无效')
    expect(alert.textContent).toContain('Invalid sample size')
  })

  it('无放回且样本量大于总体进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb' } })
    fireEvent.change(byTestId('input-sampleSize'), { target: { value: '5' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('不能大于总体规模')
  })

  it('勾选有放回后样本量可大于总体', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb' } })
    fireEvent.change(byTestId('input-sampleSize'), { target: { value: '5' } })
    fireEvent.change(byTestId('input-seed'), { target: { value: '7' } })
    const checkbox = screen.getByLabelText('有放回抽样') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('有放回')
  })
})
