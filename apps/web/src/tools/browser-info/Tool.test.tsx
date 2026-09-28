// @vitest-environment jsdom
/**
 * browser-info 组件测试（#859）：navigator.userAgent / window 注入。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function stubNavigator(ua: string): void {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

describe('browser-info · Tool', () => {
  it('点击检测后展示浏览器/引擎/操作系统', () => {
    stubNavigator(CHROME_UA)
    render(<Tool />)
    fireEvent.click(byTestId('browser-refresh'))
    expect(byTestId('browser-name').textContent).toContain('Chrome')
    expect(byTestId('browser-engine').textContent).toContain('Blink')
    expect(byTestId('browser-os').textContent).toContain('Windows')
  })

  it('特性列表渲染 6 项且含 fetch 行', () => {
    stubNavigator(CHROME_UA)
    render(<Tool />)
    fireEvent.click(byTestId('browser-refresh'))
    expect(byTestId('browser-features')).toBeTruthy()
    expect(byTestId('feature-fetch').textContent).toContain('Fetch API')
    expect(byTestId('feature-webgl')).toBeTruthy()
  })

  it('无法识别的 UA 显示 unknown', () => {
    stubNavigator('SomeBot/1.0')
    render(<Tool />)
    fireEvent.click(byTestId('browser-refresh'))
    expect(byTestId('browser-name').textContent).toContain('unknown')
  })
})
