import type { ToolMeta } from '@toolbox/catalog'

/**
 * holiday —— 全局编号 #293
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P2｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'holiday',
  slug: 'holiday',
  title: '假期推算',
  description: '按规则推算某年中国主要节日（公历/农历）与周末，非权威法定调休',
  titleEn: 'Holiday Calendar (Rule-based)',
  descriptionEn:
    'Rule-based list of major Chinese festivals (solar & lunar) and weekends for a year; not authoritative',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'holiday', 'festival', 'chinese', 'weekend'],

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
