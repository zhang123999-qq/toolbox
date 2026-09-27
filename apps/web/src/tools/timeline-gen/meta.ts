import type { ToolMeta } from '@toolbox/catalog'

/**
 * timeline-gen —— 全局编号 #404
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 时间线生成：左侧按「日期 | 标题」输入事件，右侧渲染为样式化 HTML 时间线（纯 JS）
 */
export const meta: ToolMeta = {
  id: 'timeline-gen',
  slug: 'timeline-gen',
  title: '时间线生成',
  description: '按「日期 | 标题」输入事件，右侧生成样式化时间线，支持导出 HTML',
  titleEn: 'Timeline Generator',
  descriptionEn:
    'Enter events as "date | title" lines and get a styled HTML timeline; export as HTML',

  category: 'random',
  group: 'design',
  tags: ['timeline', 'events', 'html', 'preview'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'showGap'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
