import { Link } from 'react-router-dom'
import { useTranslate } from '../../i18n'

/** 底部转化区：引导进入工具列表与搜索 */
export function CtaSection() {
  const t = useTranslate()

  return (
    <section
      data-testid="cta"
      className="rounded-2xl border border-slate-200 bg-white p-6 text-center md:p-10 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 className="text-xl font-semibold">{t('cta.title')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {t('cta.body')}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/tools"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          {t('cta.primary')}
        </Link>
        <Link
          to="/c/dev"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t('cta.secondary')}
        </Link>
      </div>
    </section>
  )
}
