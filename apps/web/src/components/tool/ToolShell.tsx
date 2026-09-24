import { FEASIBILITY_LABEL, getCategory, getGroup } from '@toolbox/catalog'
import type { ToolMeta } from '@toolbox/catalog'

/**
 * 工具页外壳（ToolShell）
 * 负责面包屑、标题、标签、D/E 类数据流向提示（红线第 4 条）。
 */
export function ToolShell({ meta, children }: { meta: ToolMeta; children: React.ReactNode }) {
  const category = getCategory(meta.category)
  const group = getGroup(meta.group)

  return (
    <article className="space-y-4">
      <nav aria-label="面包屑" className="text-sm text-slate-500">
        <a href="/" className="hover:text-brand">
          首页
        </a>
        <span className="mx-1">/</span>
        <a href={`/c/${group.id}`} className="hover:text-brand">
          {group.name}
        </a>
        <span className="mx-1">/</span>
        <a href={`/c/${group.id}/${category.id}`} className="hover:text-brand">
          {category.name}
        </a>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">{meta.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
            {FEASIBILITY_LABEL[meta.feasibility]}
          </span>
          {meta.tags.map((tag) => (
            <span key={tag} className="rounded bg-sky-50 px-2 py-1 text-sky-700">
              {tag}
            </span>
          ))}
        </div>
      </header>

      {meta.api ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <strong>此工具请求外部服务</strong>：需你自备 API / Key，输入数据会发送至第三方。
          本站不代管密钥，也不存储你的数据。
        </div>
      ) : null}

      {children}
    </article>
  )
}
