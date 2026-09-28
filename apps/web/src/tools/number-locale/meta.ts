import type { ToolMeta } from '@toolbox/catalog'

/**
 * number-locale —— 全局编号 #724
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 数字本地化：同一数字多 locale 并排本地化对比（Intl） */
export const meta: ToolMeta = {
  id: 'number-locale',
  slug: 'number-locale',
  title: '数字本地化',
  description:
    '同一数字的多语言区域并排本地化对比：Intl.NumberFormat 展示各 locale 十进制/百分比/紧凑表示与数字系统差异',
  titleEn: 'Number Localization',
  descriptionEn:
    'Side-by-side number localization across locales: Intl.NumberFormat per-locale decimal/percent/compact and digit systems',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'number', 'locale', 'intl'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['locales'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
