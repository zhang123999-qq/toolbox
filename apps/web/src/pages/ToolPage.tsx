import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import { getTool } from '@toolbox/catalog'
import type { ToolMeta } from '@toolbox/catalog'
import { ToolShell } from '../components/tool/ToolShell'

/**
 * 工具组件按需加载。
 * import.meta.glob 在构建期展开为每工具独立 chunk，
 * 保证工具页 JS 体积可控（DEVELOPMENT.md §11：工具页 JS < 30KB）。
 */
const modules = import.meta.glob<{ default: ComponentType }>('../tools/*/Tool.tsx')

function loadTool(id: string): ComponentType | null {
  const entry = modules[`../tools/${id}/Tool.tsx`]
  if (!entry) return null
  return lazy(entry)
}

export function ToolPage({ slug }: { slug: string }) {
  const meta: ToolMeta | undefined = getTool(slug)

  if (!meta) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">工具不存在</h1>
        <p className="mt-2 text-sm text-slate-600">
          未找到 <code>{slug}</code>，它可能尚未实现。
        </p>
      </div>
    )
  }

  const ToolComponent = loadTool(meta.id)

  if (!ToolComponent) {
    return (
      <ToolShell meta={meta}>
        <p className="text-sm text-amber-700">
          该工具已在 catalog 注册，但 <code>Tool.tsx</code> 尚未实现。
        </p>
      </ToolShell>
    )
  }

  return (
    <ToolShell meta={meta}>
      <Suspense fallback={<p className="text-sm text-slate-500">加载中…</p>}>
        <ToolComponent />
      </Suspense>
    </ToolShell>
  )
}
