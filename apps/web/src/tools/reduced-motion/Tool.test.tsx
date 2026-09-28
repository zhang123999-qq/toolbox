// @vitest-environment jsdom
/**
 * reduced-motion 组件测试（#736）：CSS 生成选项与动画声明检测。
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

describe('reduced-motion · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['opt-animations', 'opt-transitions', 'opt-scroll', 'extra-selectors', 'css-output', 'scan-empty']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成完整媒体查询 CSS', () => {
    render(<Tool />)
    const css = byTestId('css-output').textContent ?? ''
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms !important;')
    expect(css).toContain('transition-duration: 0.01ms !important;')
    expect(css).toContain('scroll-behavior: auto !important;')
  })

  it('关闭动画选项后 CSS 不再含动画规则', () => {
    render(<Tool />)
    fireEvent.click(byTestId('opt-animations'))
    const css = byTestId('css-output').textContent ?? ''
    expect(css).not.toContain('animation-duration')
    expect(css).toContain('transition-duration')
  })

  it('三项全关显示生成错误', () => {
    render(<Tool />)
    fireEvent.click(byTestId('opt-animations'))
    fireEvent.click(byTestId('opt-transitions'))
    fireEvent.click(byTestId('opt-scroll'))
    expect(byTestId('gen-error').textContent).toContain('至少开启一项')
    expect(screen.queryByTestId('css-output')).toBeNull()
  })

  it('额外选择器拼入 CSS', () => {
    render(<Tool />)
    fireEvent.change(byTestId('extra-selectors'), { target: { value: '.carousel' } })
    expect(byTestId('css-output').textContent).toContain('*, *::before, *::after, .carousel {')
  })

  it('非法额外选择器显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('extra-selectors'), { target: { value: '<b>' } })
    expect(byTestId('gen-error').textContent).toContain('额外选择器不合法')
  })

  it('输入 CSS 后检测出动画声明', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '.a {\n  animation: fade 2s;\n  transition: color .3s;\n}\n@keyframes fade {}' },
    })
    expect(byTestId('scan-summary').textContent).toContain('共发现 3 处')
    const list = byTestId('scan-list').textContent ?? ''
    expect(list).toContain('[animation]')
    expect(list).toContain('[transition]')
    expect(list).toContain('[keyframes]')
  })

  it('无动画 CSS 显示未发现', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '.a { color: red; }' } })
    expect(byTestId('scan-summary').textContent).toContain('未发现')
  })

  it('点示例填入示例 CSS 并检测', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('scan-summary').textContent).toContain('共发现 3 处')
  })
})
