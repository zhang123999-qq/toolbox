import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-stats —— 全局编号 #52
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-stats',
  slug: 'text-stats',
  title: '文本统计图',
  description: '词频、长度分布可视化',
  titleEn: 'Text Statistics Chart',
  descriptionEn: 'Visualize word frequency and length distribution',

  category: 'text',
  group: 'dev',
  tags: ['text', 'stats', 'chart'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['metric', 'limit'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
