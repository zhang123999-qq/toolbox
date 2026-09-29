import { TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { useTranslate } from '../../i18n'
import { ToolCard } from '../tool/ToolCard'

/** 已上线工具 + 工具总数 */
export function FeaturedTools() {
  const t = useTranslate()

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
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  )
}
