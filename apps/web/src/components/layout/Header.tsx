import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GROUPS } from '@toolbox/catalog'
import { groupName } from '../../i18n/catalog-text'
import { useTranslate } from '../../i18n'
import { SearchDialog } from '../search/SearchDialog'
import { LanguageSwitch } from './LanguageSwitch'
import { ThemeToggle } from './ThemeToggle'
import { CONTROL_BASE } from './controls'

/**
 * 全站顶部导航栏
 * 桌面端：横向导航 + 搜索 + 偏好控件
 * 移动端：搜索收成图标、偏好控件保留在顶栏（不藏进折叠菜单），
 *         导航项进入折叠面板，避免挤压。
 */
export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useTranslate()

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3">
        <Link to="/" className="shrink-0 text-lg font-semibold text-brand">
          {t('site.name')}
        </Link>

        <nav aria-label={t('nav.groupsLabel')} className="hidden gap-4 text-sm md:flex">
          {GROUPS.map((group) => (
            <Link
              key={group.id}
              to={`/c/${group.id}`}
              className="text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-brand"
            >
              {groupName(t, group.id)}
            </Link>
          ))}
          <Link
            to="/tools"
            className="text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-brand"
          >
            {t('nav.allTools')}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SearchDialog />
          <ThemeToggle />
          <LanguageSwitch />
          <button
            type="button"
            data-testid="menu-toggle"
            /* aria-label 会覆盖可见文字作为可访问名，因此必须跟随展开状态，
               否则读屏会把「关闭」念成「打开菜单」 */
            aria-label={menuOpen ? t('nav.close') : t('nav.openMenu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className={`${CONTROL_BASE} px-2 text-sm md:hidden`}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? t('nav.close') : t('nav.menu')}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label={t('nav.mobileLabel')}
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-900"
        >
          <ul className="space-y-2 text-sm">
            {GROUPS.map((group) => (
              <li key={group.id}>
                <Link
                  to={`/c/${group.id}`}
                  className="block py-1 text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-brand"
                  onClick={() => setMenuOpen(false)}
                >
                  {groupName(t, group.id)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/tools"
                className="block py-1 text-slate-600 hover:text-brand dark:text-slate-300 dark:hover:text-brand"
                onClick={() => setMenuOpen(false)}
              >
                {t('nav.allTools')}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
