import { Link } from 'react-router-dom'
import { CATEGORIES } from '@toolbox/catalog'

/** 20 个域速览：移动端 2 列，桌面端 5 列 */
export function CategoryGrid() {
  return (
    <section data-testid="category-grid" aria-labelledby="category-grid-title">
      <div className="flex items-baseline justify-between">
        <h2 id="category-grid-title" className="text-lg font-semibold">
          全部 {CATEGORIES.length} 个域
        </h2>
        <Link to="/tools" className="text-sm text-brand hover:underline">
          查看全部
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            to={`/c/${category.group}/${category.id}`}
            className="rounded border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-brand"
          >
            <span className="block">{category.name}</span>
            <span className="text-xs text-slate-500">{category.plannedTools} 个</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
