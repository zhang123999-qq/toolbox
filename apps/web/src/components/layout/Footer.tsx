import { Link } from 'react-router-dom'
import { CATEGORIES, GROUPS } from '@toolbox/catalog'
import { categoryName, groupName } from '../../i18n/catalog-text'
import { useTranslate } from '../../i18n'

/**
 * 全站页脚（从 App.tsx 内联 footer 抽出的独立组件）
 * 桌面端三列，移动端单列堆叠。
 */
export function Footer() {
  const t = useTranslate()

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-base font-semibold text-brand">{t('site.name')}</p>
            <p className="mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-400">
              {t('site.description')}
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t('site.localBadge')}
            </p>
          </div>

          <nav aria-label={t('footer.byGroup')}>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t('footer.byGroup')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {GROUPS.map((group) => (
                <li key={group.id}>
                  <Link
                    to={`/c/${group.id}`}
                    className="text-slate-600 hover:text-brand dark:text-slate-400 dark:hover:text-brand"
                  >
                    {groupName(t, group.id)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/tools"
                  className="text-slate-600 hover:text-brand dark:text-slate-400 dark:hover:text-brand"
                >
                  {t('nav.allTools')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footer.popularCategories')}>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {t('footer.popularCategories')}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {CATEGORIES.slice(0, 8).map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/c/${category.group}/${category.id}`}
                    className="text-slate-600 hover:text-brand dark:text-slate-400 dark:hover:text-brand"
                  >
                    {categoryName(t, category.id)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            {t('footer.copyright', {
              year: new Date().getFullYear(),
              name: t('site.name'),
            })}
          </p>
        </div>
      </div>
    </footer>
  )
}
