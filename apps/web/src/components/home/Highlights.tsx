import type { ReactNode } from 'react'
import { CATEGORIES } from '@toolbox/catalog'
import { useTranslate } from '../../i18n'

/** 通用描边图标（占位视觉，后续可换成图标库） */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/**
 * 图标与文案分离：图标是常量（不随语言变化），文案在组件内取词。
 * 这样切换语言只重建数组，不会重复创建 SVG 节点定义。
 */
const ICONS: Record<string, ReactNode> = {
  local: (
    <Icon>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  ),
  'no-signup': (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </Icon>
  ),
  offline: (
    <Icon>
      <path d="M4 7a8 8 0 0116 0" />
      <path d="M7 11a5 5 0 0110 0" />
      <circle cx="12" cy="17" r="1.5" />
    </Icon>
  ),
  coverage: (
    <Icon>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Icon>
  ),
}

/** 核心亮点：产品定位的四条硬价值 */
export function Highlights() {
  const t = useTranslate()

  const items = [
    { id: 'local', title: t('highlights.local.title'), body: t('highlights.local.body') },
    {
      id: 'no-signup',
      title: t('highlights.noSignup.title'),
      body: t('highlights.noSignup.body'),
    },
    { id: 'offline', title: t('highlights.offline.title'), body: t('highlights.offline.body') },
    {
      id: 'coverage',
      title: t('highlights.coverage.title', { count: CATEGORIES.length }),
      body: t('highlights.coverage.body'),
    },
  ]

  return (
    <section data-testid="highlights" aria-labelledby="highlights-title">
      <h2 id="highlights-title" className="text-lg font-semibold">
        {t('highlights.title')}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-brand">{ICONS[item.id]}</div>
            <h3 className="mt-3 font-medium">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
