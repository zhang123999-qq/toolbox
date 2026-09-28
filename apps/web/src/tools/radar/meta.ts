import type { ToolMeta } from '@toolbox/catalog'

/**
 * radar —— 全局编号 #670
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 多指标对比雷达图：行文本输入系列与指标值，ECharts 渲染，支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'radar',
  slug: 'radar',
  title: '雷达图',
  description: '输入多系列多指标数据，用 ECharts 渲染雷达图，支持标题与 PNG 导出',
  titleEn: 'Radar Chart',
  descriptionEn: 'Render ECharts radar charts from multi-series indicator data, with PNG export',
  category: 'random',
  group: 'design',
  tags: ['radar', 'echarts', 'chart', 'visualization'],
  priority: 'P1',
  feasibility: 'A',
  template: 'T3',
  inputs: ['text'],
  outputs: ['text'],
  options: ['title', 'width', 'height'],
  deps: ['echarts'],
  worker: false,
  wasm: false,
  api: false,
}
