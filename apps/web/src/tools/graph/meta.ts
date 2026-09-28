import type { ToolMeta } from '@toolbox/catalog'

/**
 * graph —— 全局编号 #673
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 * 力导向关系图：节点行 + 边行输入，ECharts graph 渲染（节点可拖拽），支持 PNG 导出
 */
export const meta: ToolMeta = {
  id: 'graph',
  slug: 'graph',
  title: '关系图',
  description: '输入节点与边数据，用 ECharts 力导向布局渲染关系图，节点可拖拽，支持 PNG 导出',
  titleEn: 'Graph Chart',
  descriptionEn: 'Render force-directed ECharts graph charts from nodes and edges, with PNG export',

  category: 'random',
  group: 'design',
  tags: ['graph', 'echarts', 'network', 'visualization'],

  priority: 'P2',
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
