import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GROUPS } from '@toolbox/catalog'
import { SearchDialog } from '../search/SearchDialog'

/**
 * 全站顶部导航栏
 * 桌面端：横向导航 + 搜索入口
 * 移动端：折叠菜单（汉堡按钮），避免导航项挤压
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-brand">
          工具库
        </Link>

        <nav aria-label="大组导航" className="hidden gap-4 text-sm md:flex">
          {GROUPS.map((group) => (
            <Link
              key={group.id}
              to={`/c/${group.id}`}
              className="text-slate-600 hover:text-brand"
            >
              {group.name}
            </Link>
          ))}
          <Link to="/tools" className="text-slate-600 hover:text-brand">
            全部工具
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchDialog />
          <button
            type="button"
            aria-label="打开菜单"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? '关闭' : '菜单'}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="移动端导航"
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          <ul className="space-y-2 text-sm">
            {GROUPS.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/c/${group.id}`}
                  className="block py-1 text-slate-600 hover:text-brand"
                  onClick={() => setMenuOpen(false)}
                >
                  {group.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/tools"
                className="block py-1 text-slate-600 hover:text-brand"
                onClick={() => setMenuOpen(false)}
              >
                全部工具
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
