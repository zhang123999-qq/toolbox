// @vitest-environment jsdom
/**
 * invoice 组件测试
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

function fillExample() {
  fireEvent.click(byTestId('example'))
}

describe('invoice · Tool', () => {
  it('渲染后关键 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'download-png',
      'input-buyer',
      'input-seller',
      'input-invoiceNo',
      'input-date',
      'input-items',
      'input-remark',
      'option-taxRate',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出含购买方与金额', () => {
    render(<Tool />)
    fillExample()
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('示例科技有限公司')
    expect(text).toContain('¥')
    expect(text).toContain('¥2,332.00')
  })

  it('点清空后购买方为空、回到 idle', () => {
    render(<Tool />)
    fillExample()
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input-buyer') as HTMLInputElement).value).toBe('')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('空明细不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(byTestId('output').textContent).toContain('填写项目明细')
  })

  it('非法明细行进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-items'), { target: { value: '这行格式不对' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('第 1 行格式错误')
  })

  it('改税率后总额实时变化', () => {
    render(<Tool />)
    fillExample()
    fireEvent.change(byTestId('option-taxRate'), { target: { value: '13' } })
    // 小计 2200，13% 税 = 286，总额 2486
    expect(byTestId('output').textContent).toContain('¥2,486.00')
  })

  it('修正非法明细后错误态解除', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-items'), { target: { value: '坏行' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    fireEvent.change(byTestId('input-items'), { target: { value: '咨询服务,1,100' } })
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(byTestId('output').textContent).toContain('发票')
  })
})
