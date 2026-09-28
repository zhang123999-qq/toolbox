// @vitest-environment jsdom
/**
 * damage 组件测试（#804）：伤害计算。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('damage · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('dmg-calc')).toBeTruthy()
  })

  it('默认参数计算伤害', () => {
    render(<Tool />)
    fireEvent.click(byTestId('dmg-calc'))
    expect(byTestId('dmg-output').textContent).toContain('最终伤害：')
  })

  it('非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('dmg-calc'))
    expect(byTestId('dmg-error').textContent).toContain('合法 JSON')
  })

  it('非法攻击力显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"atk":0,"def":10,"critRate":0,"critMult":2}' },
    })
    fireEvent.click(byTestId('dmg-calc'))
    expect(byTestId('dmg-error').textContent).toContain('正数')
  })
})
