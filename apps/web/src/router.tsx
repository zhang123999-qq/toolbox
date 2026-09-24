import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TOOL_ROUTES } from '@toolbox/catalog'

// 页面级懒加载：首屏只加载壳与路由，控制首屏 JS 体积（DEVELOPMENT.md §11）
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const AllToolsPage = lazy(() =>
  import('./pages/AllToolsPage').then((m) => ({ default: m.AllToolsPage })),
)
const GroupPage = lazy(() => import('./pages/GroupPage').then((m) => ({ default: m.GroupPage })))
const CategoryPage = lazy(() =>
  import('./pages/CategoryPage').then((m) => ({ default: m.CategoryPage })),
)
const ToolPage = lazy(() => import('./pages/ToolPage').then((m) => ({ default: m.ToolPage })))
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

/**
 * 工具页路由由 catalog 生成（红线第 1 条：禁止手写路由表）。
 * 新增工具只需写 meta.ts 并跑 pnpm generate:catalog，本文件无需改动。
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">加载中…</p>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools" element={<AllToolsPage />} />
        <Route path="/c/:group" element={<GroupPage />} />
        <Route path="/c/:group/:category" element={<CategoryPage />} />
        {TOOL_ROUTES.map(({ path, tool }) => (
          <Route key={tool.id} path={path} element={<ToolPage slug={tool.slug} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
