import { Link } from 'react-router-dom'
import { CATEGORIES, GROUPS, SITE_DESCRIPTION, SITE_NAME } from '@toolbox/catalog'

/**
 * 全站页脚（从 App.tsx 内联 footer 抽出的独立组件）
 * 桌面端三列，移动端单列堆叠。
 */
export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-base font-semibold text-brand">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs text-sm text-slate-600">{SITE_DESCRIPTION}</p>
            <p className="mt-3 text-xs text-slate-500">纯本地处理 · 数据不上传</p>
          </div>

          <nav aria-label="大组">
            <p className="text-sm font-medium text-slate-900">按分类</p>
            <ul className="mt-3 space-y-2 text-sm">
              {GROUPS.map((group) => (
                <li key={group.id}>
                  <Link to={`/c/${group.id}`} className="text-slate-600 hover:text-brand">
                    {group.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/tools" className="text-slate-600 hover:text-brand">
                  全部工具
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="热门分类">
            <p className="text-sm font-medium text-slate-900">热门域</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {CATEGORIES.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/c/${category.group}/${category.id}`}
                    className="text-slate-600 hover:text-brand"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {SITE_NAME} · 占位文案，待替换
          </p>
        </div>
      </div>
    </footer>
  )
}
