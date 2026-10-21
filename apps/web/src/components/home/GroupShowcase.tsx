import { Link } from 'react-router-dom'
import { GROUPS, categoriesOfGroup, toolsOfCategory } from '@toolbox/catalog'
import { groupDescription, groupName } from '../../i18n/catalog-text'
import { useTranslate } from '../../i18n'

/** 5 大组展示：每组给出实际上线工具数与域数，均从 catalog 真源表推导（规划数只在内页标注展示） */
export function GroupShowcase() {
  const t = useTranslate()

  return (
    <section data-testid="group-showcase" aria-labelledby="group-showcase-title">
      <h2 id="group-showcase-title" className="text-lg font-semibold">
        {t('groups.title')}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {GROUPS.map((group) => {
          const categories = categoriesOfGroup(group.id)
          const live = categories.reduce((sum, c) => sum + toolsOfCategory(c.id).length, 0)
          return (
            <Link
              key={group.id}
              to={`/c/${group.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="font-medium text-brand">{groupName(t, group.id)}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {groupDescription(t, group.id)}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {t('groups.summary', { tools: live, categories: categories.length })}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
