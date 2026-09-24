import { Link } from 'react-router-dom'
import { CATEGORIES, GROUPS, PLANNED_TOTAL_TOOLS, TOOL_COUNT } from '@toolbox/catalog'
import { useTranslate } from '../../i18n'

/**
 * 主视觉区（Hero）
 * 桌面端左右分栏，移动端上下堆叠（图在下）。
 * 图片为占位图（/images/hero-placeholder.svg），后续替换为真实插画即可。
 */
export function Hero() {
  const t = useTranslate()

  // 标签随语言变化，故在组件内构造；key 用稳定 id，不用已翻译的文案
  const stats = [
    { id: 'planned', label: t('hero.stat.planned'), value: PLANNED_TOTAL_TOOLS },
    { id: 'live', label: t('hero.stat.live'), value: TOOL_COUNT },
    { id: 'categories', label: t('hero.stat.categories'), value: CATEGORIES.length },
    { id: 'groups', label: t('hero.stat.groups'), value: GROUPS.length },
  ]

  return (
    <section
      data-testid="hero"
      className="grid items-center gap-8 rounded-2xl bg-gradient-to-b from-sky-50 to-white p-6 md:grid-cols-2 md:p-10 dark:from-slate-900 dark:to-slate-950"
    >
      <div className="text-center md:text-left">
        <p className="text-sm font-medium text-brand">{t('hero.eyebrow')}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
          {t('hero.titleLead', { count: PLANNED_TOTAL_TOOLS })}
          <br className="hidden sm:block" />
          {t('hero.titleTail')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-slate-600 md:mx-0 dark:text-slate-400">
          {t('hero.subtitle')}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
          <Link
            to="/tools"
            data-testid="hero-cta-primary"
            className="rounded-lg bg-brand px-5 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
          >
            {t('hero.ctaPrimary')}
          </Link>
          <Link
            to="/tools/json-formatter"
            data-testid="hero-cta-secondary"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('hero.ctaSecondary')}
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          {t('hero.searchHintBefore')}{' '}
          <kbd className="rounded bg-white px-1 shadow-sm dark:bg-slate-800">⌘K</kbd>{' '}
          {t('hero.searchHintMiddle')}{' '}
          <kbd className="rounded bg-white px-1 shadow-sm dark:bg-slate-800">Ctrl+K</kbd>{' '}
          {t('hero.searchHintAfter')}
        </p>

        <dl className="mt-8 grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div key={stat.id} className="rounded-lg bg-white/70 p-2 text-center dark:bg-slate-900/70">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</dt>
              <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <img
          src="/images/hero-placeholder.svg"
          alt={t('hero.imageAlt')}
          width={640}
          height={420}
          loading="lazy"
          className="mx-auto w-full max-w-md rounded-xl"
        />
      </div>
    </section>
  )
}
