import { Link, useParams } from 'react-router-dom'
import { GROUPS, categoriesOfGroup, getGroup } from '@toolbox/catalog'
import type { GroupId } from '@toolbox/catalog'
import { categoryName, groupDescription, groupName } from '../i18n/catalog-text'
import { useTranslate } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function GroupPage() {
  const { group } = useParams<{ group: string }>()
  const t = useTranslate()

  const isGroup = (value: string | undefined): value is GroupId =>
    GROUPS.some((g) => g.id === value)

  // 先判定再取用，避免在非法参数上抛错；hooks 一律在早退之前调用
  const def = isGroup(group) ? getGroup(group) : undefined
  const categories = def ? categoriesOfGroup(def.id) : []

  useDocumentTitle(
    def
      ? t('seo.groupTitle', { name: t('site.name'), group: groupName(t, def.id) })
      : t('site.name'),
  )

  if (!def) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t('groupPage.unknown', { group: group ?? '' })}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{groupName(t, def.id)}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {groupDescription(t, def.id)}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/c/${def.id}/${category.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-medium">{categoryName(t, category.id)}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('groupPage.summary', {
                tools: category.plannedTools,
                from: category.range[0],
                to: category.range[1],
              })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
