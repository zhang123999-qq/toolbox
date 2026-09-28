import type { ToolMeta } from '@toolbox/catalog'

/**
 * funnel —— 全局编号 #676
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 行文本输入漏斗阶段数据，用 ECharts 渲染漏斗图并标注转化率，支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'funnel',
  slug: 'funnel',
  title: '漏斗图',
  description: '输入各阶段数据，用 ECharts 渲染漏斗图并标注转化率，支持 PNG 导出',
  titleEn: 'Funnel Chart',
  descriptionEn: 'Render ECharts funnel charts with conversion rates, with PNG export',

  category: 'random',
  group: 'design',
  tags: ['funnel', 'echarts', 'chart', 'visualization', 'conversion'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['image'],
  options: ['title', 'width', 'height'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
