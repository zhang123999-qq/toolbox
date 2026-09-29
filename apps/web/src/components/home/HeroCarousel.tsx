import { useEffect, useState } from 'react'
import { useTranslate } from '../../i18n'

/**
 * 主视觉轮播：网站实拍截图，淡入淡出自动轮换。
 * ROTATE_MS 为轮换间隔（100 秒），改这个数即可调整节奏。
 * 鼠标悬停时暂停；用户偏好减少动态效果时只显示第一张。
 */
const ROTATE_MS = 100_000

const SLIDES = [
  { id: 'home', src: '/images/hero/hero-home.webp' },
  { id: 'dev', src: '/images/hero/hero-dev.webp' },
  { id: 'design', src: '/images/hero/hero-design.webp' },
  { id: 'tools', src: '/images/hero/hero-tools.webp' },
  { id: 'argon2', src: '/images/hero/hero-argon2.webp' },
  { id: 'cert', src: '/images/hero/hero-cert.webp' },
]

export function HeroCarousel() {
  const t = useTranslate()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduceMotion || paused) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), ROTATE_MS)
    return () => clearTimeout(timer)
  }, [index, paused, reduceMotion])

  const alt = t('hero.imageAlt')

  return (
    <div data-testid="hero-carousel">
      <div
        className="relative mx-auto aspect-[960/786] w-full max-w-md overflow-hidden rounded-xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((s, i) => (
          <img
            key={s.id}
            src={s.src}
            alt={alt}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            aria-hidden={i === 0 ? undefined : true}
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label={alt}>
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={t('hero.carouselGoTo', { index: i + 1 })}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index
                ? 'w-6 bg-brand'
                : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
