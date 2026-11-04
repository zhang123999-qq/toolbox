import { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TOOL_ROUTES } from '@toolbox/catalog'
import { useTranslate } from './i18n'

/**
 * 页面组件单层懒加载：import.meta.glob 在构建期展开为「路径 → loader」映射表，
 * 渲染时按名直接取 loader 并 lazy()，结果按名缓存（组件身份稳定，避免重渲染卸载重挂）。
 * 不再叠 (router lazy + glob lazy) 双层包装；工具页内部（ToolPage）同样是 glob 单层映射。
 */
/** 页面组件统一视图：slug 可选（仅 ToolPage 用到），无 props 的页面同样可赋值 */
type AnyComponent = ComponentType<{ slug?: string }>
type PageModule = Partial<Record<string, AnyComponent>>

const pageModules = import.meta.glob<PageModule>('./pages/*.tsx')

const lazyPages = new Map<string, AnyComponent>()

function loadPage(name: string): AnyComponent {
  const cached = lazyPages.get(name)
  if (cached) return cached
  const entry = pageModules[`./pages/${name}.tsx`]
  if (!entry) throw new Error(`[router] 未找到页面模块 ${name}`)
  const component = lazy(() =>
    entry()
      .then((m) => {
        const page = (m as Record<string, AnyComponent>)[name]
        // 页面模块未按名导出时抛清晰错误，避免 React 对 undefined 组件报晦涩错误
        if (!page) throw new Error(`[router] 页面模块 ${name} 未导出 ${name}`)
        return { default: page }
      })
      .catch((error: unknown) => {
        // 懒加载失败（chunk 网络错误/发版哈希失效）时清掉缓存：
        // 否则错误边界「重试」复位后仍拿到同一被拒绝的 lazy，永久卡在错误兜底
        lazyPages.delete(name)
        throw error
      }),
  )
  lazyPages.set(name, component)
  return component
}

const HomePage = loadPage('HomePage')
const AllToolsPage = loadPage('AllToolsPage')
const GroupPage = loadPage('GroupPage')
const CategoryPage = loadPage('CategoryPage')
const ToolPage = loadPage('ToolPage')
const NotFoundPage = loadPage('NotFoundPage')

/**
 * 工具页路由由 catalog 生成（红线第 1 条：禁止手写路由表）。
 * 新增工具只需写 meta.ts 并跑 pnpm generate:catalog，本文件无需改动。
 */
export function AppRoutes() {
  const t = useTranslate()

  return (
    <Suspense
      fallback={<p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>}
    >
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
