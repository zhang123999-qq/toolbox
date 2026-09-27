import type { ToolMeta } from '@toolbox/catalog'

/**
 * timeline —— 全局编号 #305
 * 域：datetime（日期 / 时间）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'timeline',
  slug: 'timeline',
  title: '时间线可视化',
  description: '把多行「日期 | 标题」事件排序并渲染成文本时间线，标注事件间隔',
  titleEn: 'Text Timeline',
  descriptionEn:
    'Sort multiple "date | title" events and render a plain-text timeline with gaps between events',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timeline', 'events', 'text'],

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
