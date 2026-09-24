import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import { getTool } from '@toolbox/catalog'
import { toolTitle } from '../i18n/catalog-text'
import { useI18n } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { ToolShell } from '../components/tool/ToolShell'

/**
 * 工具组件按需加载。
 * import.meta.glob 在构建期展开为每工具独立 chunk，
 * 保证工具页 JS 体积可控（DEVELOPMENT.md §11：工具页 JS < 30KB）。
 */
const modules = import.meta.glob<{ default: ComponentType }>('../tools/*/Tool.tsx')

function loadTool(id: string): ComponentType | null {
  const entry = modules[`../tools/${id}/Tool.tsx`]
  if (!entry) return null
  return lazy(entry)
}

export function ToolPage({ slug }: { slug: string }) {
  const { locale, t } = useI18n()
  const meta = getTool(slug)

  useDocumentTitle(
    meta
      ? t('seo.toolTitle', { name: t('site.name'), tool: toolTitle(locale, meta) })
      : t('seo.notFoundTitle', { name: t('site.name') }),
  )

  if (!meta) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold">{t('toolPage.notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {t('toolPage.notFoundBody', { slug })}
        </p>
      </div>
    )
  }

  const ToolComponent = loadTool(meta.id)

  if (!ToolComponent) {
    return (
      <ToolShell meta={meta}>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {t('toolPage.notImplemented')}
        </p>
      </ToolShell>
    )
  }

  return (
    <ToolShell meta={meta}>
      <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>}>
        <ToolComponent />
      </Suspense>
    </ToolShell>
  )
}
