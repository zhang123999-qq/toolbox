import { PLANNED_TOTAL_TOOLS, TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { useTranslate } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { ToolCard } from '../components/tool/ToolCard'

export function AllToolsPage() {
  const t = useTranslate()
  useDocumentTitle(t('seo.allToolsTitle', { name: t('site.name') }))

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{t('allTools.title')}</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {TOOL_COUNT} / {PLANNED_TOTAL_TOOLS}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}
