/*
 * react-hooks/static-components 整文件豁免：
 * 本页必须按 id 动态取组件（import.meta.glob 的按需加载，见下方 loadTool）。
 * 该规则无法跨函数识别「loadTool 内部已按 id 缓存、组件身份是稳定的」，
 * 会一律判定为「渲染期创建组件」。缓存一旦缺失，切语言时工具会被卸载重挂、
 * 用户已输入的内容当场丢失——那是真实缺陷，已在本文件修掉（见 lazyTools），
 * 此处豁免的是规则的静态分析盲区，不是豁免缺陷本身。
 */
/* eslint-disable react-hooks/static-components */
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
 *
 * 结果必须**按 id 缓存**：lazy() 每调用一次都返回新的组件类型，
 * 若在渲染期裸调，父级每次重渲染（例如切换语言触发 i18n context 更新）
 * 都会让 React 认为换了组件 → 卸载重挂，工具里的输入当场丢失。
 */
const modules = import.meta.glob<{ default: ComponentType }>('../tools/*/Tool.tsx')

const lazyTools = new Map<string, ComponentType>()

function loadTool(id: string): ComponentType | null {
  const cached = lazyTools.get(id)
  if (cached) return cached
  const entry = modules[`../tools/${id}/Tool.tsx`]
  if (!entry) return null
  const component = lazy(entry)
  lazyTools.set(id, component)
  return component
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
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('toolPage.notImplemented')}</p>
      </ToolShell>
    )
  }

  return (
    <ToolShell meta={meta}>
      <Suspense
        fallback={
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
        }
      >
        <ToolComponent />
      </Suspense>
    </ToolShell>
  )
}
