import type { ToolMeta } from '@toolbox/catalog'

/**
 * gantt —— 全局编号 #403
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 甘特图：左侧编写 Mermaid gantt 代码，右侧实时渲染 SVG 预览
 */
export const meta: ToolMeta = {
  id: 'gantt',
  slug: 'gantt',
  title: '甘特图',
  description: '编写 Mermaid 甘特图代码，右侧实时渲染预览，支持复制与下载源码',
  titleEn: 'Gantt Chart',
  descriptionEn:
    'Write Mermaid Gantt chart code with a live SVG preview; copy or download the source',

  category: 'random',
  group: 'design',
  tags: ['mermaid', 'gantt', 'timeline', 'preview'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['mermaid'],
  worker: false,
  wasm: false,
  api: false,
}
