import { Link } from 'react-router-dom'
import { GROUPS, categoriesOfGroup } from '@toolbox/catalog'
import { groupDescription, groupName } from '../../i18n/catalog-text'
import { useTranslate } from '../../i18n'

/** 4 大组展示：每组给出工具数与域数，均从 catalog 真源表推导 */
export function GroupShowcase() {
  const t = useTranslate()

  return (
    <section data-testid="group-showcase" aria-labelledby="group-showcase-title">
      <h2 id="group-showcase-title" className="text-lg font-semibold">
        {t('groups.title')}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((group) => {
          const categories = categoriesOfGroup(group.id)
          const planned = categories.reduce((sum, c) => sum + c.plannedTools, 0)
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
                {t('groups.summary', { tools: planned, categories: categories.length })}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
