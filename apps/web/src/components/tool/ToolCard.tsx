import { Link } from 'react-router-dom'
import type { ToolMeta } from '@toolbox/catalog'
import { FEASIBILITY_LABEL } from '@toolbox/catalog'

export function ToolCard({ tool }: { tool: ToolMeta }) {
  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{tool.title}</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {FEASIBILITY_LABEL[tool.feasibility]}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{tool.description}</p>
      <p className="mt-2 font-mono text-xs text-slate-400">/tools/{tool.slug}</p>
    </Link>
  )
}
