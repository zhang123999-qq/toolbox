// @vitest-environment jsdom
/**
 * blood-type 组件测试
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

describe('blood-type · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 A+ 的红细胞与血浆配对', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output')
    expect(output.textContent).toContain('受血者：A+')
    expect(output.textContent).toContain('可接受的供血者（红细胞）：O-、O+、A-、A+')
    expect(output.textContent).toContain('可接受的供血者（血浆）：A-、A+、AB-、AB+')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').textContent ?? '').not.toContain('无法识别的血型')
  })

  it('非法血型进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'X' } })
    expect(byTestId('output').textContent).toContain('无法识别的血型')
  })
})
