import { Link } from 'react-router-dom'
import type { ToolMeta } from '@toolbox/catalog'
import { feasibilityLabel, toolDescription, toolTitle } from '../../i18n/catalog-text'
import { useI18n } from '../../i18n'

export function ToolCard({ tool }: { tool: ToolMeta }) {
  const { locale, t } = useI18n()

  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{toolTitle(locale, tool)}</h3>
        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {feasibilityLabel(t, tool.feasibility)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
        {toolDescription(locale, tool)}
      </p>
      <p className="mt-2 font-mono text-xs text-slate-400 dark:text-slate-500">
        /tools/{tool.slug}
      </p>
    </Link>
  )
}
