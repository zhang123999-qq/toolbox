import { Link } from 'react-router-dom'
import { TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { useTranslate } from '../../i18n'
import { ToolCard } from '../tool/ToolCard'

/**
 * 已上线工具 + 工具总数。
 * 首页只展示每个域的 1 个代表工具（该域在目录中最靠前者），完整清单在 /tools：
 * 全量渲染近 800 张卡片会让首页 DOM 与预渲染 HTML 膨胀，拖累移动端性能。
 */
export function FeaturedTools() {
  const t = useTranslate()

  const seen = new Set<string>()
  const featured = TOOLS.filter((tool) => {
    if (seen.has(tool.category)) return false
    seen.add(tool.category)
    return true
  })

  return (
    <section data-testid="featured-tools" aria-labelledby="featured-tools-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="featured-tools-title" className="text-lg font-semibold">
          {t('featured.title')}
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t('featured.total', { count: TOOL_COUNT })}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      <div className="mt-4 text-center">
        <Link to="/tools" className="text-sm text-brand hover:underline">
          {t('categories.viewAll')}
        </Link>
      </div>
    </section>
  )
}
