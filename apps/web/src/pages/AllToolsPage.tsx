import { PLANNED_TOTAL_TOOLS, TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { ToolCard } from '../components/tool/ToolCard'

export function AllToolsPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">全部工具</h1>
        <span className="text-sm text-slate-500">
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
