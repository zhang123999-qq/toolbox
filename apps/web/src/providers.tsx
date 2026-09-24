import type { ReactNode } from 'react'
import { I18nProvider } from './i18n'
import { ThemeProvider } from './theme'

/**
 * 全局 Provider 组合
 *
 * 客户端（main.tsx）与 SSG 预渲染（entry-server.tsx）共用同一份，
 * 避免两条渲染链的 Provider 顺序漂移。
 * 顺序：主题在外、语言在内——两者互不依赖，仅表达「主题更外层」的语义。
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  )
}
