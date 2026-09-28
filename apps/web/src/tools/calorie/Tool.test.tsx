// @vitest-environment jsdom
/**
 * calorie 组件测试
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

describe('calorie · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 TDEE 2556', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('基础代谢（BMR）：1648.8 kcal/天')
    expect(out).toContain('每日所需（TDEE，中度活动）：2556 kcal/天')
    expect(out).toContain('减重建议：约 2056 kcal/天')
    expect(out).toContain('增重建议：约 3056 kcal/天')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切换活动强度到久坐', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: '久坐' } })
    expect(byTestId('output').textContent).toContain('每日所需（TDEE，久坐）：1979 kcal/天')
  })

  it('切换性别到女', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '女' } })
    // Mifflin 女：1482.75 → 1482.8；TDEE = 1482.75 × 1.55 = 2298.2625 → 2298
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('基础代谢（BMR）：1482.8 kcal/天')
    expect(out).toContain('每日所需（TDEE，中度活动）：2298 kcal/天')
  })

  it('非法年龄进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-age'), { target: { value: '200' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('年龄应为 1–120 的整数')
  })
})
