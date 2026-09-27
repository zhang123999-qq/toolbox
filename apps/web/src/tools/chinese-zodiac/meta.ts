import type { ToolMeta } from '@toolbox/catalog'

/**
 * chinese-zodiac —— 全局编号 #289
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'chinese-zodiac',
  slug: 'chinese-zodiac',
  title: '生肖干支查询',
  description: '输入年份，输出生肖（中英）、地支、天干五行与生肖排序',
  titleEn: 'Chinese Zodiac (Shengxiao) Finder',
  descriptionEn:
    'Given a year, output the animal sign (EN/CN), earthly branch, heavenly stem element and order',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'zodiac', 'chinese-zodiac', 'ganzhi', 'shengxiao'],

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
