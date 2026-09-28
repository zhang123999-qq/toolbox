import type { ToolMeta } from '@toolbox/catalog'

/**
 * heatmap —— 全局编号 #671
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 二维类目热力图：行文本输入 X类目,Y类目,数值，ECharts 直角坐标系热力图，支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'heatmap',
  slug: 'heatmap',
  title: '热力图',
  description: '输入二维类目数值，用 ECharts 渲染直角坐标系热力图，支持标题与 PNG 导出',
  titleEn: 'Heatmap',
  descriptionEn: 'Render ECharts heatmaps from two-dimensional category values, with PNG export',
  category: 'random',
  group: 'design',
  tags: ['heatmap', 'echarts', 'chart', 'visualization'],
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
