import { PLANNED_TOTAL_TOOLS, TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { useTranslate } from '../../i18n'
import { ToolCard } from '../tool/ToolCard'

/** 已上线工具 + 阶段进度（当前为阶段 0，文案为占位） */
export function FeaturedTools() {
  const t = useTranslate()

  const percent = PLANNED_TOTAL_TOOLS ? Math.round((TOOL_COUNT / PLANNED_TOTAL_TOOLS) * 100) : 0

  return (
    <section data-testid="featured-tools" aria-labelledby="featured-tools-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="featured-tools-title" className="text-lg font-semibold">
          {t('featured.title')}
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t('featured.stage', {
            live: TOOL_COUNT,
            planned: PLANNED_TOTAL_TOOLS,
            percent,
          })}
        </span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('featured.progressLabel')}
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  )
}
