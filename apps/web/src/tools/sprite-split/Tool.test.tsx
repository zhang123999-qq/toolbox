// @vitest-environment jsdom
/**
 * sprite-split 组件测试（#786）：精灵图切割。
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

describe('sprite-split · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('spritesplit-file')).toBeTruthy()
    expect(byTestId('spritesplit-calc')).toBeTruthy()
    expect(byTestId('spritesplit-export')).toBeTruthy()
  })

  it('计算帧列表输出 8 帧', () => {
    render(<Tool />)
    fireEvent.click(byTestId('spritesplit-calc'))
    const out = byTestId('spritesplit-output')
    expect(out.textContent).toContain('共 8 帧')
    expect(out.textContent).toContain('#0: x=0, y=0, w=64, h=64')
  })

  it('非法参数显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"imgW":100,"imgH":100,"cols":3,"rows":2}' } })
    fireEvent.click(byTestId('spritesplit-calc'))
    expect(byTestId('spritesplit-error').textContent).toContain('无法被行列整除')
  })

  it('未上传图片时导出提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('spritesplit-export'))
    expect(byTestId('spritesplit-error').textContent).toContain('请先上传精灵图')
  })
})
