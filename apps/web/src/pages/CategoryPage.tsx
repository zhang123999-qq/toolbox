import { Link, useParams } from 'react-router-dom'
import { CATEGORIES, getCategory, toolsOfCategory } from '@toolbox/catalog'
import type { CategoryId, GroupId } from '@toolbox/catalog'
import { categoryName, groupName } from '../i18n/catalog-text'
import { useTranslate } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { ToolCard } from '../components/tool/ToolCard'

export function CategoryPage() {
  const { group, category } = useParams<{ group: string; category: string }>()
  const t = useTranslate()

  const isCategory = (value: string | undefined): value is CategoryId =>
    CATEGORIES.some((c) => c.id === value)

  // 先判定再取用，避免在非法参数上抛错；hooks 一律在早退之前调用
  const def = isCategory(category) ? getCategory(category) : undefined
  const tools = def ? toolsOfCategory(def.id) : []

  useDocumentTitle(
    def
      ? t('seo.categoryTitle', { name: t('site.name'), category: categoryName(t, def.id) })
      : t('site.name'),
  )

  if (!def) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t('categoryPage.unknown', { category: category ?? '' })}
      </p>
    )
  }

  // URL 中的大组必须与域的归属一致，不一致时给出提示但仍可访问
  const mismatch = (group as GroupId) !== def.group

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{categoryName(t, def.id)}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('categoryPage.summary', {
            from: def.range[0],
            to: def.range[1],
            tools: def.plannedTools,
          })}
        </p>
      </header>

      {mismatch ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t('categoryPage.mismatch', {
            expected: groupName(t, def.group),
            actual: group ?? '',
          })}
        </p>
      ) : null}

      {tools.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('categoryPage.empty', { tools: def.plannedTools })}
        </p>
      )}

      <Link to="/tools" className="inline-block text-sm text-brand hover:underline">
        {t('categoryPage.viewAll')}
      </Link>
    </div>
  )
}
