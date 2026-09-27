// @vitest-environment jsdom
/**
 * bmi 组件测试
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

describe('bmi · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 BMI 22.9 正常', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('BMI：22.9')
    expect(out).toContain('分级：正常')
    expect(out).toContain('健康体重范围：56.7 – 73.5 kg')
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

  it('手工输入身高体重 → 肥胖分级', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '170' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '90' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('BMI：31.1')
    expect(out).toContain('分级：肥胖')
  })

  it('非法身高进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '40' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '70' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('身高应在 50–300 cm 之间')
  })
})
