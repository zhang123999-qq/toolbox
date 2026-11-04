import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { ToolErrorBoundary } from './components/tool/ToolErrorBoundary'
import { AppRoutes } from './router'

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/*
          全站根错误边界：路由层之外的渲染错误（布局 / Provider 子树）在此兜底，
          保留 Header/Footer 的静态壳，避免整站白屏。「重试」复位边界后重挂 AppRoutes。
        */}
        <ToolErrorBoundary
          fallback={
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              <h1 className="text-base font-semibold">页面加载失败</h1>
              <p className="mt-2">页面渲染时发生异常，已阻止整站崩溃。可重试，或回到首页。</p>
            </div>
          }
          onReset={() => {
            /* 复位由边界内部完成；此处预留给未来的上报/埋点钩子 */
          }}
        >
          <AppRoutes />
        </ToolErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}
