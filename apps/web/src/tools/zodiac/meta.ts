import type { ToolMeta } from '@toolbox/catalog'

/**
 * zodiac —— 全局编号 #288
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'zodiac',
  slug: 'zodiac',
  title: '星座查询',
  description: '输入月日，查出太阳星座（中英名、日期区间、元素与特质）',
  titleEn: 'Zodiac Sign Finder',
  descriptionEn:
    'Look up your sun sign by month and day, with EN/CN names, date range and element traits',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'zodiac', 'horoscope', 'birthday'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
