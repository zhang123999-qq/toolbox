import { Link, useParams } from 'react-router-dom'
import { CATEGORIES, getCategory, toolsOfCategory } from '@toolbox/catalog'
import type { CategoryId, GroupId } from '@toolbox/catalog'
import { ToolCard } from '../components/tool/ToolCard'

export function CategoryPage() {
  const { group, category } = useParams<{ group: string; category: string }>()

  const isCategory = (value: string | undefined): value is CategoryId =>
    CATEGORIES.some((c) => c.id === value)

  if (!isCategory(category)) {
    return <p className="text-sm text-red-600">未知分类：{category}</p>
  }

  const def = getCategory(category)

  // URL 中的大组必须与域的归属一致，不一致时给出提示但仍可访问
  const mismatch = (group as GroupId) !== def.group
  const tools = toolsOfCategory(category)

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{def.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          编号 {def.range[0]}–{def.range[1]} · 规划 {def.plannedTools} 个工具
        </p>
      </header>

      {mismatch ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          该分类属于「{def.group}」组，当前 URL 使用的是「{group}」。
        </p>
      ) : null}

      {tools.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          该分类下暂无已实现工具（规划 {def.plannedTools} 个）。
        </p>
      )}

      <Link to="/tools" className="inline-block text-sm text-brand hover:underline">
        查看全部已上线工具 →
      </Link>
    </div>
  )
}
