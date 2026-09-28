import type { ToolMeta } from '@toolbox/catalog'

/**
 * gauge —— 全局编号 #677
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 输入当前值与区间，用 ECharts 渲染三段色仪表盘，支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'gauge',
  slug: 'gauge',
  title: '仪表盘',
  description: '输入当前值与区间，用 ECharts 渲染三段色仪表盘，支持 PNG 导出',
  titleEn: 'Gauge',
  descriptionEn: 'Render an ECharts gauge with three-segment colors, with PNG export',

  category: 'random',
  group: 'design',
  tags: ['gauge', 'echarts', 'chart', 'visualization', 'dashboard'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['number'],
  outputs: ['image'],
  options: ['value', 'min', 'max', 'title', 'width', 'height'],

  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
