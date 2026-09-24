/**
 * 主题（明 / 暗）管理
 *
 * 与 i18n 的差异：主题只是 <html> 上的一个类，React **不参与首帧渲染**——
 * 类名由 index.html 的内联脚本在绘制前写好，因此切主题不会有闪动，
 * 也无需在水合时对账。Provider 的初始值直接读 DOM，保证状态与真实主题一致。
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { THEME_STORAGE_KEY, writeStored } from '../lib/prefs'
import { useIsomorphicLayoutEffect } from '../lib/useIsomorphicLayoutEffect'

export type Theme = 'light' | 'dark'

export const DEFAULT_THEME: Theme = 'light'

/** 主题类名挂在 <html> 上，Tailwind 的 dark: 变体即以它为开关（见 global.css） */
export const DARK_CLASS = 'dark'

/** 服务端渲染时无 DOM，回落默认值；客户端读内联脚本已写好的类名 */
export function resolveInitialTheme(): Theme {
  if (typeof document === 'undefined') return DEFAULT_THEME
  return document.documentElement.classList.contains(DARK_CLASS) ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle(DARK_CLASS, theme === 'dark')
  // 让原生控件（滚动条、表单、日期选择器）跟随主题，否则深色页面上会闪出白色控件
  root.style.colorScheme = theme
}

interface ThemeValue {
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
  readonly toggleTheme: () => void
}

const ThemeContext = createContext<ThemeValue>({
  theme: DEFAULT_THEME,
  setTheme: () => undefined,
  toggleTheme: () => undefined,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  useIsomorphicLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    writeStored(THEME_STORAGE_KEY, next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  const value = useMemo<ThemeValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext)
}
