import type { ToolMeta } from '@toolbox/catalog'

/**
 * lunar —— 全局编号 #290
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'lunar',
  slug: 'lunar',
  title: '公历农历互转',
  description: '内置 1900–2100 农历表，公历↔农历双向转换，含闰月、干支与生肖',
  titleEn: 'Solar–Lunar Converter',
  descriptionEn:
    'Convert between Gregorian and Chinese lunar dates (1900–2100) with leap months, Ganzhi and zodiac',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'lunar', 'chinese-calendar', 'ganzhi', 'leap-month'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
