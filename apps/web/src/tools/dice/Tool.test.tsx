// @vitest-environment jsdom
/**
 * dice 组件测试
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

describe('dice · Tool', () => {
  it('渲染后 7 个必需 data-testid + 骰子面数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-sides')).toBeTruthy()
  })

  it('点示例后掷出 2 个骰子并显示总点数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('roll')).toBeTruthy()
    expect(byTestId('dice-faces')).toBeTruthy()
    const faces = byTestId('dice-faces').children
    expect(faces).toHaveLength(2)
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('掷骰结果')
    expect(output).toContain('总点数')
    // 总点数 = 各骰子点数之和（6 面骰用点数符号展示，无法直接读数，故校验区间）
    const total = Number(/总点数：(\d+)/.exec(output)?.[1])
    expect(total).toBeGreaterThanOrEqual(2)
    expect(total).toBeLessThanOrEqual(12)
  })

  it('改面数为 20 后骰子显示数字', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-sides'), { target: { value: '20' } })
    const faces = byTestId('dice-faces').children
    expect(faces).toHaveLength(2)
    for (const face of Array.from(faces)) {
      const value = Number(face.textContent)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(20)
    }
  })

  it('点「掷骰子」后重新掷骰（动画 key 变化）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const before = byTestId('dice-faces').getAttribute('data-round')
    fireEvent.click(byTestId('roll'))
    const after = byTestId('dice-faces').getAttribute('data-round')
    expect(after).not.toBe(before)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-sides') as HTMLTextAreaElement).value).toBe('')
  })

  it('骰子个数非法进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0' } })
    fireEvent.change(byTestId('input-sides'), { target: { value: '6' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('骰子个数无效')
    expect(alert.textContent).toContain('Invalid dice count')
  })

  it('骰子面数小于 2 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2' } })
    fireEvent.change(byTestId('input-sides'), { target: { value: '1' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('骰子面数无效')
  })
})
