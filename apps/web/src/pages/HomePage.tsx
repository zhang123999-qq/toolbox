import { PLANNED_TOTAL_TOOLS } from '@toolbox/catalog'
import { useTranslate } from '../i18n'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { Hero } from '../components/home/Hero'
import { Highlights } from '../components/home/Highlights'
import { GroupShowcase } from '../components/home/GroupShowcase'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { FeaturedTools } from '../components/home/FeaturedTools'
import { CtaSection } from '../components/home/CtaSection'

/**
 * 首页（Landing Page）
 * 只负责编排各区块，具体区块拆在 components/home/ 下，便于单独复用与改造。
 * 顶部导航与页脚由 App.tsx 全站提供，不在此重复。
 */
export function HomePage() {
  const t = useTranslate()
  useDocumentTitle(t('seo.homeTitle', { name: t('site.name'), count: PLANNED_TOTAL_TOOLS }))

  return (
    <div className="space-y-12">
      <Hero />
      <Highlights />
      <GroupShowcase />
      <CategoryGrid />
      <FeaturedTools />
      <CtaSection />
    </div>
  )
}
