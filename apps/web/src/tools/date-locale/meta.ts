import type { ToolMeta } from '@toolbox/catalog'

/**
 * date-locale —— 全局编号 #723
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 日期本地化：同一日期多 locale 并排本地化对比（Intl） */
export const meta: ToolMeta = {
  id: 'date-locale',
  slug: 'date-locale',
  title: '日期本地化',
  description:
    '同一日期的多语言区域并排本地化对比：Intl.DateTimeFormat 展示各 locale 日期/时间写法与中文相对时间',
  titleEn: 'Date Localization',
  descriptionEn:
    'Side-by-side date localization across locales: Intl.DateTimeFormat per-locale date/time plus Chinese relative time',

  category: 'a11y',
  group: 'life',
  tags: ['i18n', 'date', 'locale', 'intl'],

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
