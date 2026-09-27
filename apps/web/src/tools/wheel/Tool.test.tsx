// @vitest-environment jsdom
/**
 * wheel 组件测试
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

describe('wheel · Tool', () => {
  it('渲染后 7 个必需 data-testid + 获奖人数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-winners')).toBeTruthy()
  })

  it('点示例后转盘与获奖名单渲染', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('spin')).toBeTruthy()
    expect(byTestId('wheel-disc')).toBeTruthy()
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('获奖名单')
    const names = output.match(/苹果|香蕉|橙子|葡萄|西瓜|芒果/g) ?? []
    // 获奖名单 1 个 + 图例 6 个
    expect(names.length).toBeGreaterThanOrEqual(7)
  })

  it('转盘旋转角度落在合法区间（5 整圈 + 偏移）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const transform = byTestId('wheel-disc').style.transform
    const degrees = Number(/rotate\((-?[\d.]+)deg\)/.exec(transform)?.[1])
    expect(degrees).toBeGreaterThanOrEqual(5 * 360)
    expect(degrees).toBeLessThan(6 * 360)
  })

  it('点「开始转盘」后重新旋转（轮次变化）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const before = byTestId('wheel-disc').getAttribute('data-round')
    fireEvent.click(byTestId('spin'))
    const after = byTestId('wheel-disc').getAttribute('data-round')
    expect(after).not.toBe(before)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-winners') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('单选项进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '唯一选项' } })
    fireEvent.change(byTestId('input-winners'), { target: { value: '1' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('至少需要 2 个选项')
    expect(alert.textContent).toContain('at least 2 options')
  })

  it('选项超过 24 个进入错误态', () => {
    render(<Tool />)
    const many = Array.from({ length: 25 }, (_, i) => '选项' + i).join('\n')
    fireEvent.change(byTestId('input'), { target: { value: many } })
    fireEvent.change(byTestId('input-winners'), { target: { value: '1' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('选项过多')
  })

  it('获奖人数大于选项数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\nb\nc' } })
    fireEvent.change(byTestId('input-winners'), { target: { value: '5' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('不能大于选项数')
  })
})
