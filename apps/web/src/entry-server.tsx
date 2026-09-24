/**
 * SSG 预渲染入口（DEVELOPMENT.md §12 SEO 要求）
 *
 * Vite 默认是 SPA，产物只有空壳 index.html，870 个工具页对爬虫不可见。
 * 本文件配合 `scripts/prerender.ts` 在构建期把每个路由渲染成静态 HTML。
 *
 * 关键取舍：用 React 19 的 `prerender`（react-dom/static）而不是
 * `renderToString`——因为 router.tsx / ToolPage 都用了 `React.lazy`，
 * renderToString 只会输出 Suspense 的 fallback（"加载中…"），
 * prerender 会等待 Suspense 解析完成，才能拿到真实内容。
 *
 * 关于 i18n：预渲染固定使用默认语言（中文）。用户偏好由客户端在绘制前
 * 应用，因此静态产物保持单一语言，不产生 /en 路由，SEO 口径不变。
 */
import { StaticRouter } from 'react-router'
import { prerender } from 'react-dom/static'
import { App } from './App'
import { AppProviders } from './providers'

export interface RenderResult {
  readonly html: string
}

export async function render(url: string): Promise<RenderResult> {
  const { prelude } = await prerender(
    <AppProviders>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </AppProviders>,
  )
  const html = await new Response(prelude).text()
  return { html }
}
