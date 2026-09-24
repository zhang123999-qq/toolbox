import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-sm text-slate-600">页面不存在。</p>
      <Link to="/" className="text-sm text-brand hover:underline">
        返回首页
      </Link>
    </div>
  )
}
