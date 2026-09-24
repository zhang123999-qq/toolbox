import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AppProviders } from './providers'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('[web] 未找到 #root 挂载点')
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
)
