import { useParams } from 'react-router-dom'
import { GROUPS, getGroup, categoriesOfGroup } from '@toolbox/catalog'
import type { GroupId } from '@toolbox/catalog'
import { Link } from 'react-router-dom'

export function GroupPage() {
  const { group } = useParams<{ group: string }>()

  const isGroup = (value: string | undefined): value is GroupId =>
    GROUPS.some((g) => g.id === value)

  if (!isGroup(group)) {
    return <p className="text-sm text-red-600">未知大组：{group}</p>
  }

  const def = getGroup(group)
  const categories = categoriesOfGroup(group)

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">{def.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{def.description}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/c/${group}/${category.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand"
          >
            <h2 className="font-medium">{category.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              规划 {category.plannedTools} 个 · 编号 {category.range[0]}–{category.range[1]}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
