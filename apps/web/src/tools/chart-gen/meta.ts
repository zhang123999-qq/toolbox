import type { ToolMeta } from '@toolbox/catalog'

/**
 * chart-gen —— 全局编号 #397
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 粘贴 CSV 数据，用 echarts 渲染柱状 / 折线 / 饼图 / 散点图
 */
export const meta: ToolMeta = {
  id: 'chart-gen',
  slug: 'chart-gen',
  title: '图表生成',
  description: '粘贴 CSV 数据，用 ECharts 渲染柱状 / 折线 / 饼图 / 散点图，支持标题与尺寸',
  titleEn: 'Chart Generator',
  descriptionEn: 'Paste CSV data and render bar / line / pie / scatter charts with ECharts',

  category: 'random',
  group: 'design',
  tags: ['chart', 'echarts', 'csv', 'visualization', 'plot'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'title', 'width', 'height'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
