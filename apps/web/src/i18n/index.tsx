/**
 * 轻量 i18n（无第三方依赖）
 *
 * 设计取舍：
 *  • 首渲染固定用 DEFAULT_LOCALE，与服务端预渲染（SSG）的 HTML 保持一致；
 *    用户偏好由 `useIsomorphicLayoutEffect` 在**浏览器绘制前**同步进来，
 *    因此既不需要水合抑制标记，也不会出现「闪一下才变英文」。
 *  • 文案以扁平 key 组织，`MessageKey` 由中文真源推导，
 *    英文包声明为 `Record<MessageKey, string>` → 漏译会在 typecheck 阶段报错。
 *  • 不做路由级语言前缀（/en/...）：本需求是「实时切换 + 持久化」，
 *    静态页仍以中文为默认语言产出，SEO 口径不变。
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { I18N_PENDING_CLASS, LOCALE_STORAGE_KEY, readStored, writeStored } from '../lib/prefs'
import { useIsomorphicLayoutEffect } from '../lib/useIsomorphicLayoutEffect'
import { en } from './messages.en'
import { zh } from './messages.zh'
import type { MessageKey } from './messages.zh'

export type { MessageKey }

export type Locale = 'zh' | 'en'

export const DEFAULT_LOCALE: Locale = 'zh'

/** 顺序即控件中的展示顺序 */
export const LOCALES: readonly Locale[] = ['zh', 'en']

export type MessageParams = Record<string, string | number>

export type Translate = <K extends MessageKey>(key: K, params?: MessageParams) => string

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { zh, en }

export function isLocale(value: unknown): value is Locale {
  return value === 'zh' || value === 'en'
}

/** <html lang> 取值：中文带上地区，便于读屏与搜索引擎判定 */
export function htmlLang(locale: Locale): string {
  return locale === 'en' ? 'en' : 'zh-CN'
}

/** `{name}` 形式占位符的替换；未提供参数时原样保留占位符，便于发现漏传 */
export function createTranslator(locale: Locale): Translate {
  const messages = MESSAGES[locale] ?? zh
  return (key, params) => {
    const template = messages[key] ?? zh[key]
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name]
      return value === undefined ? match : String(value)
    })
  }
}

interface I18nValue {
  readonly locale: Locale
  readonly setLocale: (locale: Locale) => void
  readonly t: Translate
}

/**
 * 默认值给中文，使组件在 Provider 之外（单测、独立预览）也能渲染，
 * 不必为每个用例都套一层 Provider。
 */
const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: createTranslator(DEFAULT_LOCALE),
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useIsomorphicLayoutEffect(() => {
    const stored = readStored(LOCALE_STORAGE_KEY)
    if (isLocale(stored) && stored !== DEFAULT_LOCALE) setLocaleState(stored)
    // 偏好已就位，解除内联脚本加的「待定」遮罩
    document.documentElement.classList.remove(I18N_PENDING_CLASS)
  }, [])

  useIsomorphicLayoutEffect(() => {
    document.documentElement.lang = htmlLang(locale)
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeStored(LOCALE_STORAGE_KEY, next)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: createTranslator(locale) }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}

/** 只需要翻译函数时用这个，省一层解构 */
export function useTranslate(): Translate {
  return useContext(I18nContext).t
}
