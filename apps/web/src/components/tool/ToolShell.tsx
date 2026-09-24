import type { ReactNode } from 'react'
import { getCategory, getGroup } from '@toolbox/catalog'
import type { ToolMeta } from '@toolbox/catalog'
import {
  categoryName,
  feasibilityLabel,
  groupName,
  toolDescription,
  toolTitle,
} from '../../i18n/catalog-text'
import { useI18n } from '../../i18n'

/**
 * 工具页外壳（ToolShell）
 * 负责面包屑、标题、标签、D/E 类数据流向提示（红线第 4 条）。
 */
export function ToolShell({ meta, children }: { meta: ToolMeta; children: ReactNode }) {
  const { locale, t } = useI18n()
  const category = getCategory(meta.category)
  const group = getGroup(meta.group)

  return (
    <article className="space-y-4">
      <nav
        aria-label={t('breadcrumb.label')}
        className="text-sm text-slate-500 dark:text-slate-400"
      >
        <a href="/" className="hover:text-brand">
          {t('breadcrumb.home')}
        </a>
        <span className="mx-1">/</span>
        <a href={`/c/${group.id}`} className="hover:text-brand">
          {groupName(t, group.id)}
        </a>
        <span className="mx-1">/</span>
        <a href={`/c/${group.id}/${category.id}`} className="hover:text-brand">
          {categoryName(t, category.id)}
        </a>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">{toolTitle(locale, meta)}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {toolDescription(locale, meta)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {feasibilityLabel(t, meta.feasibility)}
          </span>
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-sky-50 px-2 py-1 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {meta.api ? (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <strong>{t('tool.apiNoticeTitle')}</strong>
          {/* 中英文断句不同（中文用「：」顺接，英文需另起一句），故拆成两段渲染 */}
          <p className="mt-1">{t('tool.apiNoticeBody')}</p>
        </div>
      ) : null}

      {children}
    </article>
  )
}
