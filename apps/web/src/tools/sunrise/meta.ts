import type { ToolMeta } from '@toolbox/catalog'

/**
 * sunrise —— 全局编号 #299
 * 域：datetime（日期 / 时间）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 自研 NOAA 太阳位置算法，不依赖 suncalc
 */
export const meta: ToolMeta = {
  id: 'sunrise',
  slug: 'sunrise',
  title: '日出日落',
  description: '按日期与经纬度计算日出、日落、正午与昼长（NOAA 算法）',
  titleEn: 'Sunrise & Sunset',
  descriptionEn:
    'Compute sunrise, sunset, solar noon and day length from date and coordinates (NOAA algorithm)',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'sunrise', 'sunset', 'noaa', 'daylight'],

  priority: 'P2',
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
