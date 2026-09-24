import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { AppRoutes } from './router'

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  )
}
