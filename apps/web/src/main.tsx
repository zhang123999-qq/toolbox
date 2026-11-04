import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AppProviders } from './providers'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('[web] 未找到 #root 挂载点')
}

const app = (
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>
)

/**
 * React 19 Hydration：SSG（entry-server + prerender）已把真实 DOM 写进
 * #root，直接 hydrate 复用它，首屏不重渲染、不闪烁。
 * 仅当 #root 为空（dev / 未预渲染的兜底页）时才走 createRoot 冷渲染。
 * hydration 出现不可恢复差异时的 onRecoverableError 仅记录，不抛错。
 */
if (container.hasChildNodes()) {
  hydrateRoot(container, app, {
    onRecoverableError: (error) => {
      console.error('[web] hydration 差异（已按客户端内容恢复）', error)
    },
  })
} else {
  createRoot(container).render(app)
}
