// @vitest-environment jsdom
/**
 * resolution 组件测试（#858）：window.screen / window 全 mock 注入。
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

function stubWindow(): void {
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true })
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true })
  Object.defineProperty(window, 'screen', {
    value: { width: 1920, height: 1080, colorDepth: 24 },
    configurable: true,
  })
}

describe('resolution · Tool', () => {
  it('点击检测后展示屏幕信息与宽高比', () => {
    stubWindow()
    render(<Tool />)
    fireEvent.click(byTestId('resolution-refresh'))
    expect(byTestId('resolution-screen').textContent).toContain('1920')
    expect(byTestId('resolution-screen').textContent).toContain('1080')
    expect(byTestId('resolution-viewport').textContent).toContain('1280')
    expect(byTestId('resolution-dpr').textContent).toContain('2')
    expect(byTestId('resolution-depth').textContent).toContain('24')
    expect(byTestId('resolution-ratio').textContent).toContain('16:9')
  })

  it('screen 缺失时展示中文错误且不渲染信息区', () => {
    Object.defineProperty(window, 'screen', { value: null, configurable: true })
    render(<Tool />)
    fireEvent.click(byTestId('resolution-refresh'))
    expect(byTestId('resolution-error').textContent).toContain('当前环境无法获取屏幕信息')
    expect(screen.queryByTestId('resolution-info')).toBeNull()
  })

  it('常见分辨率对照表渲染 UHD 4K 与 HD 720p', () => {
    render(<Tool />)
    expect(screen.getByText('UHD 4K')).toBeTruthy()
    expect(screen.getByText('HD 720p')).toBeTruthy()
  })
})
