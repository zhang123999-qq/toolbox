import type { ToolMeta } from '@toolbox/catalog'

/**
 * date-parse —— 全局编号 #307
 * 域：datetime（日期 / 时间 / 时区）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/04-日期时间.md
 */
export const meta: ToolMeta = {
  id: 'date-parse',
  slug: 'date-parse',
  title: '自然语言日期解析',
  description: '解析「今天 / 明天 / 3 天后 / 下周一 / 2026年9月27日」等中文日期',
  titleEn: 'Natural Language Date Parser',
  descriptionEn:
    'Parse Chinese natural-language dates like today, tomorrow, 3 days later, next Monday, 2026年9月27日',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'date', 'natural-language', 'parser'],

  priority: 'P0',
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
