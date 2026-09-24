// @vitest-environment jsdom
/**
 * 语言切换与主题切换的行为测试
 *
 * 覆盖四件事：
 *  1. 切换后可见文案实时更新（首页正文 + 全站导航）
 *  2. 偏好写入 localStorage（刷新后由 index.html 的内联脚本读回）
 *  3. 重新挂载 / 遮罩移除的首次同步行为
 *  4. 主题状态 → <html class="dark"> 的映射
 *
 * 两个控件都在 Header 里，因此统一用 renderApp() 渲染「Header + HomePage」，
 * 与真实页面结构一致（只渲染 HomePage 会找不到控件）。
 * 首帧前应用偏好的内联脚本在 index.html 里，不属于单测范围。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../../providers'
import { Header } from './Header'
import { HomePage } from '../../pages/HomePage'
import { LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from '../../lib/prefs'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.lang = 'zh-CN'
  document.title = ''
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.className = ''
})

/** 渲染与真实页面同构的壳：Header（承载偏好控件）+ 首页 */
function renderApp() {
  return render(
    <AppProviders>
      <MemoryRouter>
        <Header />
        <HomePage />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('语言切换', () => {
  it('默认渲染中文文案', () => {
    renderApp()
    expect(screen.getByTestId('hero-cta-primary').textContent).toBe('浏览全部工具')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('切到英文后首页与导航文案同步更新', () => {
    renderApp()

    fireEvent.click(screen.getByTestId('locale-en'))

    // 首页正文
    expect(screen.getByTestId('hero-cta-primary').textContent).toBe('Browse all tools')
    expect(screen.getByTestId('group-showcase').textContent).toContain('Development')
    // 全站导航（Header 中的大组名与「全部工具」）
    expect(screen.getAllByText('All tools').length).toBeGreaterThan(0)
    // <html lang> 与文档标题
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toContain('Toolbox')
  })

  it('偏好写入 localStorage，重新挂载后保持英文', () => {
    const first = renderApp()
    fireEvent.click(screen.getByTestId('locale-en'))
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    first.unmount()

    renderApp()
    expect(screen.getByTestId('hero-cta-primary').textContent).toBe('Browse all tools')
  })

  it('挂载时移除内联脚本加的 i18n-pending 遮罩，并直接呈现英文', () => {
    // 内联脚本在「记住的语言非默认」时会先遮住预渲染的中文内容
    document.documentElement.classList.add('i18n-pending')
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en')

    renderApp()

    expect(document.documentElement.classList.contains('i18n-pending')).toBe(false)
    expect(screen.getByTestId('hero-cta-primary').textContent).toBe('Browse all tools')
  })

  it('当前语言的按钮带 aria-pressed 标记', () => {
    renderApp()
    expect(screen.getByTestId('locale-zh').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('locale-en').getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByTestId('locale-en'))
    expect(screen.getByTestId('locale-en').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('主题切换', () => {
  it('默认浅色，切换后 <html> 带上 dark 类并落盘', () => {
    renderApp()
    const toggle = screen.getByTestId('theme-toggle')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(toggle.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(toggle)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('再次点击回到浅色并落盘 light', () => {
    renderApp()
    const toggle = screen.getByTestId('theme-toggle')

    fireEvent.click(toggle)
    fireEvent.click(toggle)

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('初始状态读取 <html> 上已有的 dark 类（对齐内联脚本的写入）', () => {
    // 模拟「上次访问存了 dark」时内联脚本已就位的状态
    document.documentElement.classList.add('dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    renderApp()

    expect(screen.getByTestId('theme-toggle').getAttribute('aria-pressed')).toBe('true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('主题与语言互不干扰', () => {
    renderApp()

    fireEvent.click(screen.getByTestId('theme-toggle'))
    fireEvent.click(screen.getByTestId('locale-en'))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByTestId('hero-cta-primary').textContent).toBe('Browse all tools')
  })
})
