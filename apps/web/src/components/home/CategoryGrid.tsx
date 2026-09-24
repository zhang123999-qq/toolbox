import { Link } from 'react-router-dom'
import { CATEGORIES } from '@toolbox/catalog'
import { categoryName } from '../../i18n/catalog-text'
import { useTranslate } from '../../i18n'

/** 20 个域速览：移动端 2 列，桌面端 5 列 */
export function CategoryGrid() {
  const t = useTranslate()

  return (
    <section data-testid="category-grid" aria-labelledby="category-grid-title">
      <div className="flex items-baseline justify-between">
        <h2 id="category-grid-title" className="text-lg font-semibold">
          {t('categories.title', { count: CATEGORIES.length })}
        </h2>
        <Link to="/tools" className="text-sm text-brand hover:underline">
          {t('categories.viewAll')}
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            to={`/c/${category.group}/${category.id}`}
            className="rounded border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-brand dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="block">{categoryName(t, category.id)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('categories.count', { count: category.plannedTools })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
