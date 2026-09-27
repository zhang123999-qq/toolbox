// @vitest-environment jsdom
/**
 * zodiac-match 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('zodiac-match · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认输出白羊 × 天秤的配对报告', () => {
    render(<Tool />)
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('配对评分：93 / 100')
    expect(output).toContain('天作之合')
  })

  it('点示例后填入名字并更新报告', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('小明')
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('小红')
    expect(byTestId('output').textContent).toContain('小明（白羊座 Aries）')
  })

  it('切换星座后评分实时变化', () => {
    const { container } = render(<Tool />)
    const [signA, signB] = Array.from(container.querySelectorAll('select'))
    // 白羊 × 巨蟹：火 × 水 = 55 分
    fireEvent.change(signB as HTMLSelectElement, {
      target: { value: '巨蟹座 Cancer' },
    })
    expect(byTestId('output').textContent).toContain('配对评分：55 / 100')
    expect(signA).toBeTruthy()
  })

  it('点清空后名字回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('')
  })

  it('空名字不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
