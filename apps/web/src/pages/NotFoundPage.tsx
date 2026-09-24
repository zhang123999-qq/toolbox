import { Link } from 'react-router-dom'
import { useTranslate } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function NotFoundPage() {
  const t = useTranslate()
  useDocumentTitle(t('seo.notFoundTitle', { name: t('site.name') }))

  return (
    <div className="space-y-3 text-center">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('notFound.body')}</p>
      <Link to="/" className="text-sm text-brand hover:underline">
        {t('notFound.back')}
      </Link>
    </div>
  )
}
